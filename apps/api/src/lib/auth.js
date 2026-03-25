/**
 * Session-based authentication for Faith Counseling API.
 *
 * Implements:
 *  - login(email, password)  → set HttpOnly session cookie, return staff profile
 *  - logout(token)           → revoke session in DB
 *  - resolveSession(request) → validate cookie, return session row or null
 *  - changePassword(...)     → verify current password, hash new one
 *
 * Session tokens:
 *  - 32 random bytes (crypto.randomBytes) → 256 bits of entropy
 *  - Stored in DB as SHA-256(token) — the raw token never touches the DB
 *  - Delivered as HttpOnly; Secure; SameSite=Strict cookie named "session"
 *
 * Idle timeout:  30 min for staff, 15 min for platform_admin
 * Absolute max:  8 hr  for staff, 4 hr  for platform_admin
 */

import crypto from 'node:crypto';
import argon2 from 'argon2';
import pool from '../db/pool.js';
import { decrypt } from './encrypt.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const ARGON2_OPTIONS = {
  type:        argon2.argon2id,
  memoryCost:  65536,   // 64 MiB
  timeCost:    3,
  parallelism: 1,
};

const SESSION_MAX_AGE_MS = {
  platform_admin: 4  * 60 * 60 * 1000,   // 4 hr
  default:        8  * 60 * 60 * 1000,   // 8 hr
};

const IDLE_TIMEOUT_MS = {
  platform_admin: 15 * 60 * 1000,        // 15 min
  default:        30 * 60 * 1000,        // 30 min
};

const MAX_FAILED_ATTEMPTS = 10;

// Password minimum per session-policy.md
const MIN_PASSWORD_LENGTH = 14;
const DEACTIVATED_LOCK_DATE = '2099-12-31 23:59:59';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((part) => {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) return [part.trim(), ''];
      return [part.slice(0, eqIdx).trim(), part.slice(eqIdx + 1).trim()];
    }),
  );
}

function sessionMaxAge(role) {
  return role === 'platform_admin'
    ? SESSION_MAX_AGE_MS.platform_admin
    : SESSION_MAX_AGE_MS.default;
}

function buildSessionCookie(rawToken, role) {
  const maxAgeSec = Math.floor(sessionMaxAge(role) / 1000);
  const parts = [
    `session=${rawToken}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
    `Max-Age=${maxAgeSec}`,
  ];
  // Secure flag — required in production; omit only for local HTTP dev
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function normalizeEmail(email) {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@') || normalized.length > 320) return null;
  return normalized;
}

// ─── Password validation ──────────────────────────────────────────────────────

export function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 128) {
    return 'Password must be 128 characters or fewer.';
  }
  return null; // valid
}

/**
 * Check the HaveIBeenPwned k-anonymity API.
 * Returns true if the password has appeared in a known breach.
 */
export async function isPasswordBreached(password) {
  try {
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const resp = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!resp.ok) return false; // fail open — don't block login if HIBP is down

    const text = await resp.text();
    return text.split('\r\n').some((line) => {
      const [hash] = line.split(':');
      return hash === suffix;
    });
  } catch {
    return false; // fail open
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────

/**
 * Authenticate with email + password.
 * On success returns { cookie, profile }.
 * On failure throws an object with { statusCode, error }.
 */
export async function login(email, password, response) {
  if (!email || !password) {
    throw { statusCode: 400, error: 'email and password are required' };
  }

  // Look up account by email
  const [rows] = await pool.query(
    'SELECT sa.*, sm.role, sm.first_name_enc, sm.last_name_enc FROM staff_accounts sa ' +
    'JOIN staff_members sm ON sm.id = sa.staff_member_id ' +
    'WHERE sa.email = ?',
    [email.toLowerCase().trim()],
  );
  const account = rows[0];

  // Constant-time path: always hash even if account not found (timing attack mitigation)
  const candidateHash = account?.password_hash ?? '$argon2id$v=19$m=65536,t=3,p=1$dummy$dummy';

  if (!account) {
    await argon2.verify(candidateHash, password).catch(() => {});
    throw { statusCode: 401, error: 'Invalid credentials' };
  }

  // Check account lock
  if (account.failed_attempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = account.locked_until ? new Date(account.locked_until) : null;
    if (!lockedUntil || lockedUntil > new Date()) {
      throw { statusCode: 423, error: 'Account locked due to too many failed attempts. Contact support to unlock.' };
    }
  }

  const passwordMatch = await argon2.verify(account.password_hash, password, ARGON2_OPTIONS);

  if (!passwordMatch) {
    // Increment failed attempts
    await pool.query(
      'UPDATE staff_accounts SET failed_attempts = failed_attempts + 1 WHERE id = ?',
      [account.id],
    );
    // Lock after hitting threshold
    if (account.failed_attempts + 1 >= MAX_FAILED_ATTEMPTS) {
      await pool.query(
        'UPDATE staff_accounts SET locked_until = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE id = ?',
        [account.id],
      );
    }
    throw { statusCode: 401, error: 'Invalid credentials' };
  }

  // Reset failed attempts + update last login
  await pool.query(
    'UPDATE staff_accounts SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?',
    [account.id],
  );

  // Create session
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const maxAgeMs  = sessionMaxAge(account.role);
  const expiresAt = new Date(Date.now() + maxAgeMs);

  await pool.query(
    `INSERT INTO sessions
       (id, staff_account_id, tenant_id, role, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [tokenHash, account.id, account.tenant_id, account.role, expiresAt],
  );

  response.setHeader('Set-Cookie', buildSessionCookie(rawToken, account.role));

  return {
    staffId:  account.staff_member_id,
    tenantId: account.tenant_id,
    role:     account.role,
    email:    account.email,
    name:     `${decrypt(account.first_name_enc)} ${decrypt(account.last_name_enc)}`,
  };
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logout(request, response) {
  const cookies = parseCookies(request.headers.cookie);
  const rawToken = cookies.session;
  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await pool.query('UPDATE sessions SET revoked = 1 WHERE id = ?', [tokenHash]);
  }
  // Clear the cookie
  response.setHeader(
    'Set-Cookie',
    'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
  );
}

// ─── Resolve session (middleware) ─────────────────────────────────────────────

/**
 * Validate the session cookie and return the session row, or null if invalid.
 * Also slides the idle timeout on each valid request.
 *
 * Returns: { staff_account_id, tenant_id, role } or null
 */
export async function resolveSession(request) {
  const cookies = parseCookies(request.headers.cookie);
  const rawToken = cookies.session;
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);

  const [rows] = await pool.query(
    `SELECT id, staff_account_id, tenant_id, role, last_active_at, expires_at
     FROM sessions
     WHERE id = ? AND revoked = 0 AND expires_at > NOW()`,
    [tokenHash],
  );

  const session = rows[0];
  if (!session) return null;

  // Check idle timeout
  const idleLimit = session.role === 'platform_admin'
    ? IDLE_TIMEOUT_MS.platform_admin
    : IDLE_TIMEOUT_MS.default;

  const lastActive = new Date(session.last_active_at).getTime();
  if (Date.now() - lastActive > idleLimit) {
    // Revoke expired idle session
    await pool.query('UPDATE sessions SET revoked = 1 WHERE id = ?', [tokenHash]);
    return null;
  }

  // Slide idle window
  await pool.query('UPDATE sessions SET last_active_at = NOW() WHERE id = ?', [tokenHash]);

  return {
    staff_account_id: session.staff_account_id,
    tenant_id:        session.tenant_id,
    role:             session.role,
  };
}

// ─── Change password ──────────────────────────────────────────────────────────

/**
 * Change password for a staff account.
 * Requires the current password for re-authentication.
 * Invalidates all active sessions after change.
 */
export async function changePassword(staffAccountId, currentPassword, newPassword) {
  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) throw { statusCode: 400, error: strengthError };

  const breached = await isPasswordBreached(newPassword);
  if (breached) {
    throw {
      statusCode: 400,
      error: 'This password has appeared in a known data breach. Please choose a different password.',
    };
  }

  const [rows] = await pool.query(
    'SELECT id, password_hash FROM staff_accounts WHERE id = ?',
    [staffAccountId],
  );
  const account = rows[0];
  if (!account) throw { statusCode: 404, error: 'Account not found' };

  const currentOk = await argon2.verify(account.password_hash, currentPassword, ARGON2_OPTIONS);
  if (!currentOk) throw { statusCode: 403, error: 'Current password is incorrect' };

  const newHash = await argon2.hash(newPassword, ARGON2_OPTIONS);

  await pool.query('UPDATE staff_accounts SET password_hash = ? WHERE id = ?', [newHash, staffAccountId]);

  // Revoke all active sessions (session fixation / compromise mitigation)
  await pool.query(
    'UPDATE sessions SET revoked = 1 WHERE staff_account_id = ?',
    [staffAccountId],
  );
}

export async function createStaffAccount({ staffMemberId, tenantId, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw { statusCode: 400, error: 'A valid email is required' };

  const strengthError = validatePasswordStrength(password);
  if (strengthError) throw { statusCode: 400, error: strengthError };

  const breached = await isPasswordBreached(password);
  if (breached) {
    throw {
      statusCode: 400,
      error: 'This password has appeared in a known data breach. Please choose a different password.',
    };
  }

  const [existingRows] = await pool.query('SELECT id FROM staff_accounts WHERE email = ?', [normalizedEmail]);
  if (existingRows.length > 0) {
    throw { statusCode: 409, error: 'An account with this email already exists' };
  }

  const accountId = `acct-${crypto.randomUUID()}`;
  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

  await pool.query(
    `INSERT INTO staff_accounts
      (id, staff_member_id, tenant_id, email, password_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [accountId, staffMemberId, tenantId, normalizedEmail, passwordHash],
  );

  return { accountId, email: normalizedEmail };
}

export async function adminResetStaffPassword({ tenantId, staffMemberId, newPassword }) {
  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) throw { statusCode: 400, error: strengthError };

  const breached = await isPasswordBreached(newPassword);
  if (breached) {
    throw {
      statusCode: 400,
      error: 'This password has appeared in a known data breach. Please choose a different password.',
    };
  }

  const [rows] = await pool.query(
    'SELECT id FROM staff_accounts WHERE staff_member_id = ? AND tenant_id = ?',
    [staffMemberId, tenantId],
  );

  const account = rows[0];
  if (!account) throw { statusCode: 404, error: 'Staff account not found' };

  const hash = await argon2.hash(newPassword, ARGON2_OPTIONS);
  await pool.query(
    'UPDATE staff_accounts SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?',
    [hash, account.id],
  );
  await pool.query('UPDATE sessions SET revoked = 1 WHERE staff_account_id = ?', [account.id]);
}

export async function adminUnlockStaffAccount({ tenantId, staffMemberId }) {
  const [rows] = await pool.query(
    'SELECT id FROM staff_accounts WHERE staff_member_id = ? AND tenant_id = ?',
    [staffMemberId, tenantId],
  );

  const account = rows[0];
  if (!account) throw { statusCode: 404, error: 'Staff account not found' };

  await pool.query(
    'UPDATE staff_accounts SET failed_attempts = 0, locked_until = NULL WHERE id = ?',
    [account.id],
  );
}

export async function adminDeactivateStaffAccount({ tenantId, staffMemberId }) {
  const [rows] = await pool.query(
    'SELECT id FROM staff_accounts WHERE staff_member_id = ? AND tenant_id = ?',
    [staffMemberId, tenantId],
  );

  const account = rows[0];
  if (!account) throw { statusCode: 404, error: 'Staff account not found' };

  await pool.query(
    'UPDATE staff_accounts SET failed_attempts = 0, locked_until = ? WHERE id = ?',
    [DEACTIVATED_LOCK_DATE, account.id],
  );
  await pool.query('UPDATE sessions SET revoked = 1 WHERE staff_account_id = ?', [account.id]);
}
