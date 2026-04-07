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
 * Idle timeout:  3 min for all roles (matches frontend idle policy)
 * Absolute max:  8 hr  for staff, 4 hr  for platform_admin
 */

import crypto from 'node:crypto';
import argon2 from 'argon2';
import pool from '../db/pool.js';
import { decrypt, encrypt, deriveLookupHash } from './encrypt.js';

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
  platform_admin: 3 * 60 * 1000,         // 3 min (matches frontend idle policy)
  default:        3 * 60 * 1000,         // 3 min (matches frontend idle policy)
};

const MAX_FAILED_ATTEMPTS = 10;
const STAFF_SESSION_COOKIE = 'session';
const PORTAL_SESSION_COOKIE = 'portal_session';
const PORTAL_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

// Password minimum per session-policy.md
const MIN_PASSWORD_LENGTH = 14;
const DEACTIVATED_LOCK_DATE = '2099-12-31 23:59:59';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
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

function buildSessionCookie(cookieName, rawToken, role) {
  const maxAgeSec = Math.floor(sessionMaxAge(role) / 1000);
  const parts = [
    `${cookieName}=${rawToken}`,
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

function setAuthCookies(response, cookies) {
  const existing = response.getHeader('Set-Cookie');
  const current = Array.isArray(existing)
    ? existing
    : existing
      ? [String(existing)]
      : [];
  response.setHeader('Set-Cookie', [...current, ...cookies]);
}

function clearSessionCookie(cookieName) {
  const parts = [
    `${cookieName}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
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
async function createStaffSession(account, response) {
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

  setAuthCookies(response, [
    buildSessionCookie(STAFF_SESSION_COOKIE, rawToken, account.role),
    clearSessionCookie(PORTAL_SESSION_COOKIE),
  ]);

  return {
    actorType: 'staff',
    staffId:  account.staff_member_id,
    tenantId: account.tenant_id,
    role:     account.role,
    email:    account.email_enc ? decrypt(account.email_enc) : account.email,
    name:     `${decrypt(account.first_name_enc)} ${decrypt(account.last_name_enc)}`,
  };
}

async function createPortalSession(account, response) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const maxAgeMs  = sessionMaxAge('client');
  const expiresAt = new Date(Date.now() + maxAgeMs);

  await pool.query(
    `INSERT INTO portal_sessions
       (id, portal_account_id, client_id, tenant_id, role, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [tokenHash, account.id, account.client_id, account.tenant_id, 'client', expiresAt],
  );

  setAuthCookies(response, [
    buildSessionCookie(PORTAL_SESSION_COOKIE, rawToken, 'client'),
    clearSessionCookie(STAFF_SESSION_COOKIE),
  ]);

  return {
    actorType: 'client',
    clientId: account.client_id,
    portalAccountId: account.id,
    tenantId: account.tenant_id,
    role: 'client',
    email: account.email_enc ? decrypt(account.email_enc) : null,
    name: `${decrypt(account.first_name_enc)} ${decrypt(account.last_name_enc)}`,
  };
}

export async function login(email, password, response) {
  if (!email || !password) {
    throw { statusCode: 400, error: 'email and password are required' };
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw { statusCode: 400, error: 'A valid email is required' };
  }
  const emailLookupHash = deriveLookupHash(normalizedEmail, { lowercase: true });

  // Look up staff account by email
  const [rows] = await pool.query(
    'SELECT sa.*, sm.role, sm.first_name_enc, sm.last_name_enc FROM staff_accounts sa ' +
    'JOIN staff_members sm ON sm.id = sa.staff_member_id ' +
    'WHERE sa.email_lookup_hash = ? ' +
    'LIMIT 1',
    [emailLookupHash],
  );
  const account = rows[0];

  if (account) {
    if (account.failed_attempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = account.locked_until ? new Date(account.locked_until) : null;
      if (!lockedUntil || lockedUntil > new Date()) {
        throw { statusCode: 423, error: 'Account locked due to too many failed attempts. Contact support to unlock.' };
      }
    }

    const passwordMatch = await argon2.verify(account.password_hash, password, ARGON2_OPTIONS);
    if (!passwordMatch) {
      await pool.query(
        'UPDATE staff_accounts SET failed_attempts = failed_attempts + 1 WHERE id = ?',
        [account.id],
      );
      if (account.failed_attempts + 1 >= MAX_FAILED_ATTEMPTS) {
        await pool.query(
          'UPDATE staff_accounts SET locked_until = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE id = ?',
          [account.id],
        );
      }
      throw { statusCode: 401, error: 'Invalid credentials' };
    }

    await pool.query(
      'UPDATE staff_accounts SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?',
      [account.id],
    );

    return createStaffSession(account, response);
  }

  const [portalRows] = await pool.query(
    'SELECT pa.*, c.first_name_enc, c.last_name_enc FROM portal_accounts pa ' +
    'JOIN clients c ON c.id = pa.client_id AND c.tenant_id = pa.tenant_id ' +
    'WHERE pa.email_lookup_hash = ? LIMIT 1',
    [emailLookupHash],
  );
  const portalAccount = portalRows[0];
  const candidateHash = portalAccount?.password_hash ?? '$argon2id$v=19$m=65536,t=3,p=1$dummy$dummy';

  if (!portalAccount || !portalAccount.password_hash) {
    await argon2.verify(candidateHash, password).catch(() => {});
    throw { statusCode: 401, error: 'Invalid credentials' };
  }

  if (portalAccount.status !== 'active') {
    throw { statusCode: 403, error: 'Portal access is not active for this account' };
  }

  if (portalAccount.failed_attempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = portalAccount.locked_until ? new Date(portalAccount.locked_until) : null;
    if (!lockedUntil || lockedUntil > new Date()) {
      throw { statusCode: 423, error: 'Portal account locked due to too many failed attempts. Contact the practice for help.' };
    }
  }

  const portalPasswordMatch = await argon2.verify(portalAccount.password_hash, password, ARGON2_OPTIONS);
  if (!portalPasswordMatch) {
    await pool.query(
      'UPDATE portal_accounts SET failed_attempts = failed_attempts + 1 WHERE id = ?',
      [portalAccount.id],
    );
    if (portalAccount.failed_attempts + 1 >= MAX_FAILED_ATTEMPTS) {
      await pool.query(
        'UPDATE portal_accounts SET locked_until = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE id = ?',
        [portalAccount.id],
      );
    }
    throw { statusCode: 401, error: 'Invalid credentials' };
  }

  await pool.query(
    'UPDATE portal_accounts SET failed_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
    [portalAccount.id],
  );
  return createPortalSession(portalAccount, response);
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logout(request, response, session = null) {
  const cookies = parseCookies(request.headers.cookie);
  const rawStaffToken = cookies[STAFF_SESSION_COOKIE];
  if (rawStaffToken) {
    const tokenHash = hashToken(rawStaffToken);
    await pool.query('UPDATE sessions SET revoked = 1 WHERE id = ?', [tokenHash]);
  }
  const rawPortalToken = cookies[PORTAL_SESSION_COOKIE];
  if (rawPortalToken) {
    const tokenHash = hashToken(rawPortalToken);
    await pool.query('UPDATE portal_sessions SET revoked = 1 WHERE id = ?', [tokenHash]);
  }
  if (session?.actor_type === 'staff' && session?.staff_account_id) {
    await pool.query('UPDATE sessions SET revoked = 1 WHERE staff_account_id = ?', [session.staff_account_id]);
  }
  if (session?.actor_type === 'client' && session?.portal_account_id) {
    await pool.query('UPDATE portal_sessions SET revoked = 1 WHERE portal_account_id = ?', [session.portal_account_id]);
  }
  setAuthCookies(response, [
    clearSessionCookie(STAFF_SESSION_COOKIE),
    clearSessionCookie(PORTAL_SESSION_COOKIE),
  ]);
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
  const rawStaffToken = cookies[STAFF_SESSION_COOKIE];
  if (rawStaffToken) {
    const tokenHash = hashToken(rawStaffToken);
    const [rows] = await pool.query(
      `SELECT id, staff_account_id, tenant_id, role, last_active_at, expires_at
       FROM sessions
       WHERE id = ? AND revoked = 0 AND expires_at > NOW()`,
      [tokenHash],
    );

    const session = rows[0];
    if (session) {
      const idleLimit = session.role === 'platform_admin'
        ? IDLE_TIMEOUT_MS.platform_admin
        : IDLE_TIMEOUT_MS.default;
      const lastActive = new Date(session.last_active_at).getTime();
      if (Date.now() - lastActive > idleLimit) {
        await pool.query('UPDATE sessions SET revoked = 1 WHERE id = ?', [tokenHash]);
        return null;
      }
      await pool.query('UPDATE sessions SET last_active_at = NOW() WHERE id = ?', [tokenHash]);
      return {
        actor_type: 'staff',
        staff_account_id: session.staff_account_id,
        tenant_id: session.tenant_id,
        role: session.role,
      };
    }
  }

  const rawPortalToken = cookies[PORTAL_SESSION_COOKIE];
  if (!rawPortalToken) return null;
  const tokenHash = hashToken(rawPortalToken);
  const [portalRows] = await pool.query(
    `SELECT id, portal_account_id, client_id, tenant_id, role, last_active_at, expires_at
     FROM portal_sessions
     WHERE id = ? AND revoked = 0 AND expires_at > NOW()`,
    [tokenHash],
  );
  const portalSession = portalRows[0];
  if (!portalSession) return null;

  const lastActive = new Date(portalSession.last_active_at).getTime();
  if (Date.now() - lastActive > IDLE_TIMEOUT_MS.default) {
    await pool.query('UPDATE portal_sessions SET revoked = 1 WHERE id = ?', [tokenHash]);
    return null;
  }

  await pool.query('UPDATE portal_sessions SET last_active_at = NOW() WHERE id = ?', [tokenHash]);
  return {
    actor_type: 'client',
    portal_account_id: portalSession.portal_account_id,
    client_id: portalSession.client_id,
    tenant_id: portalSession.tenant_id,
    role: 'client',
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

export async function changePortalPassword(portalAccountId, currentPassword, newPassword) {
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
    'SELECT id, password_hash FROM portal_accounts WHERE id = ?',
    [portalAccountId],
  );
  const account = rows[0];
  if (!account) throw { statusCode: 404, error: 'Portal account not found' };
  if (!account.password_hash) throw { statusCode: 403, error: 'Portal password has not been set yet' };

  const currentOk = await argon2.verify(account.password_hash, currentPassword, ARGON2_OPTIONS);
  if (!currentOk) throw { statusCode: 403, error: 'Current password is incorrect' };

  const newHash = await argon2.hash(newPassword, ARGON2_OPTIONS);
  await pool.query(
    'UPDATE portal_accounts SET password_hash = ?, failed_attempts = 0, locked_until = NULL, status = ? WHERE id = ?',
    [newHash, 'active', portalAccountId],
  );
  await pool.query(
    'UPDATE portal_sessions SET revoked = 1 WHERE portal_account_id = ?',
    [portalAccountId],
  );
}

export async function requestPortalPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw { statusCode: 400, error: 'A valid email is required' };
  }

  const emailLookupHash = deriveLookupHash(normalizedEmail, { lowercase: true });
  const [rows] = await pool.query(
    'SELECT id, tenant_id, status FROM portal_accounts WHERE email_lookup_hash = ? LIMIT 1',
    [emailLookupHash],
  );
  const account = rows[0];
  if (!account || account.status === 'revoked') {
    return { issued: false };
  }

  await pool.query(
    'UPDATE portal_password_resets SET used_at = NOW() WHERE portal_account_id = ? AND used_at IS NULL AND expires_at > NOW()',
    [account.id],
  );

  const rawToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + PORTAL_RESET_TOKEN_TTL_MS);
  await pool.query(
    `INSERT INTO portal_password_resets
       (id, portal_account_id, tenant_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      `prr-${crypto.randomUUID()}`,
      account.id,
      account.tenant_id,
      hashResetToken(rawToken),
      expiresAt,
    ],
  );

  return {
    issued: true,
    expiresAt: expiresAt.toISOString(),
    resetToken: process.env.NODE_ENV === 'production' ? undefined : rawToken,
  };
}

export async function completePortalPasswordReset(email, token, newPassword) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw { statusCode: 400, error: 'A valid email is required' };
  }
  if (typeof token !== 'string' || token.trim().length < 16) {
    throw { statusCode: 400, error: 'A valid reset code is required' };
  }

  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) throw { statusCode: 400, error: strengthError };

  const breached = await isPasswordBreached(newPassword);
  if (breached) {
    throw {
      statusCode: 400,
      error: 'This password has appeared in a known data breach. Please choose a different password.',
    };
  }

  const emailLookupHash = deriveLookupHash(normalizedEmail, { lowercase: true });
  const tokenHash = hashResetToken(token.trim());
  const [rows] = await pool.query(
    `SELECT pr.id, pa.id AS portal_account_id
       FROM portal_password_resets pr
       JOIN portal_accounts pa ON pa.id = pr.portal_account_id AND pa.tenant_id = pr.tenant_id
      WHERE pa.email_lookup_hash = ?
        AND pr.token_hash = ?
        AND pr.used_at IS NULL
        AND pr.expires_at > NOW()
      LIMIT 1`,
    [emailLookupHash, tokenHash],
  );
  const resetRow = rows[0];
  if (!resetRow) {
    throw { statusCode: 400, error: 'Reset code is invalid or has expired' };
  }

  const newHash = await argon2.hash(newPassword, ARGON2_OPTIONS);
  await pool.query(
    'UPDATE portal_accounts SET password_hash = ?, failed_attempts = 0, locked_until = NULL, status = ? WHERE id = ?',
    [newHash, 'active', resetRow.portal_account_id],
  );
  await pool.query(
    'UPDATE portal_password_resets SET used_at = NOW() WHERE id = ?',
    [resetRow.id],
  );
  await pool.query(
    'UPDATE portal_sessions SET revoked = 1 WHERE portal_account_id = ?',
    [resetRow.portal_account_id],
  );

  return { portalAccountId: resetRow.portal_account_id };
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

  const emailLookupHash = deriveLookupHash(normalizedEmail, { lowercase: true });
  const [existingRows] = await pool.query(
    'SELECT id FROM staff_accounts WHERE email_lookup_hash = ?',
    [emailLookupHash],
  );
  if (existingRows.length > 0) {
    throw { statusCode: 409, error: 'An account with this email already exists' };
  }

  const accountId = `acct-${crypto.randomUUID()}`;
  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

  await pool.query(
    `INSERT INTO staff_accounts
      (id, staff_member_id, tenant_id, email, email_enc, email_lookup_hash, password_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [accountId, staffMemberId, tenantId, null, encrypt(normalizedEmail), emailLookupHash, passwordHash],
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
