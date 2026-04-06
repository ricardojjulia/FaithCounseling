/**
 * Database migration script — run once to create all tables.
 *
 * Usage:
 *   node apps/api/src/db/migrate.js
 *
 * Requires DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD env vars (or .env).
 *
 * Safe to re-run — all statements use CREATE TABLE IF NOT EXISTS.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

// Load .env if present (for local dev convenience)
try {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} catch {
  // dotenv is optional — ignore if not installed
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(currentDir, 'schema.sql');

// Create a one-off connection (not the pool) since we need multipleStatements.
const connection = await mysql.createConnection({
  host:               process.env.DB_HOST     || '127.0.0.1',
  port:               Number(process.env.DB_PORT || 3306),
  database:           process.env.DB_NAME,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  ssl:                process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  multipleStatements: true,   // required to execute the full schema file at once
  timezone:           'Z',
});

try {
  console.log('Running schema migration…');
  const sql = await readFile(schemaPath, 'utf8');

  // Strip comment-only lines to avoid mysql2 choking on them when batched
  const cleaned = sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

  await connection.query(cleaned);
  console.log('Migration complete — all core tables created.');

  // Column migrations — add new columns to existing tables when the schema
  // has already been created. Each check is idempotent via INFORMATION_SCHEMA.
  await applyColumnMigrations(connection);
  await backfillAppointmentCounselorLinks(connection);

  // Seed a default tenant + system practice for local dev
  await seedDevData(connection);
  if (shouldSeedDevPortalData()) {
    await ensureDevPortalClient(connection);
  } else {
    console.log('Skipping dev portal client/resource seed (SEED_DEV_PORTAL_DATA=false).');
  }
} finally {
  await connection.end();
}

function shouldSeedDevPortalData() {
  return process.env.NODE_ENV !== 'production' && process.env.SEED_DEV_PORTAL_DATA !== 'false';
}

async function applyColumnMigrations(conn) {
  const dbName = process.env.DB_NAME;
  const { encrypt, decrypt, deriveLookupHash } = await import('../lib/encrypt.js');

  // Helper: add a column if it doesn't already exist
  async function addColumnIfMissing(table, column, definition) {
    const [[{ cnt }]] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.columns
       WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
      [dbName, table, column],
    );
    if (cnt === 0) {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`  + ${table}.${column} added`);
      return true;
    }
    return false;
  }

  // Helper: add an index if it doesn't already exist
  async function addIndexIfMissing(table, indexName, definition) {
    const [[{ cnt }]] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.statistics
      WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
      [dbName, table, indexName],
    );
    if (cnt === 0) {
      await conn.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` ${definition}`);
      console.log(`  + index ${indexName} on ${table} added`);
      return true;
    }
    return false;
  }

  async function addUniqueIndexIfMissing(table, indexName, definition) {
    const [[{ cnt }]] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.statistics
       WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
      [dbName, table, indexName],
    );
    if (cnt === 0) {
      await conn.query(`ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${indexName}\` ${definition}`);
      console.log(`  + unique index ${indexName} on ${table} added`);
      return true;
    }
    return false;
  }

  async function alterColumn(table, column, definition) {
    const [[{ cnt }]] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.columns
       WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
      [dbName, table, column],
    );
    if (cnt === 0) return false;
    await conn.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`);
    console.log(`  ~ ${table}.${column} altered`);
    return true;
  }

  console.log('Applying column migrations…');
  await addColumnIfMissing('staff_accounts', 'email_enc', 'TEXT NULL AFTER email');
  await addColumnIfMissing('staff_accounts', 'email_lookup_hash', 'CHAR(64) NULL AFTER email_enc');
  await addUniqueIndexIfMissing('staff_accounts', 'uq_staff_accounts_email_lookup_hash', '(email_lookup_hash)');
  await alterColumn('staff_accounts', 'email', 'VARCHAR(320) NULL');
  await addColumnIfMissing('portal_accounts', 'email_lookup_hash', 'CHAR(64) NULL AFTER email_enc');
  await addColumnIfMissing('portal_accounts', 'password_hash', 'VARCHAR(255) NULL AFTER email_lookup_hash');
  await addColumnIfMissing('portal_accounts', 'failed_attempts', 'INT NOT NULL DEFAULT 0 AFTER password_hash');
  await addColumnIfMissing('portal_accounts', 'locked_until', 'TIMESTAMP NULL AFTER failed_attempts');
  await addUniqueIndexIfMissing('portal_accounts', 'uq_portal_email_lookup_hash', '(tenant_id, email_lookup_hash)');

  await addColumnIfMissing('tenant_provisioning', 'owner_email_enc', 'TEXT NULL AFTER requested_practice_name');
  await alterColumn('tenant_provisioning', 'owner_email', 'VARCHAR(320) NULL');

  const auditActorTypeAdded = await addColumnIfMissing('audit_events', 'actor_type', "VARCHAR(32) NOT NULL DEFAULT 'anonymous' AFTER actor_role");
  const auditResultAdded = await addColumnIfMissing('audit_events', 'result', "VARCHAR(16) NOT NULL DEFAULT 'success' AFTER target_id");
  const auditReasonAdded = await addColumnIfMissing('audit_events', 'reason_code', "VARCHAR(64) NOT NULL DEFAULT 'ok' AFTER result");
  const auditSourceSurfaceAdded = await addColumnIfMissing('audit_events', 'source_surface', "VARCHAR(128) NOT NULL DEFAULT 'api' AFTER request_id");
  const auditSourceWorkflowAdded = await addColumnIfMissing('audit_events', 'source_workflow', "VARCHAR(128) NOT NULL DEFAULT 'request' AFTER source_surface");
  const auditSystemComponentAdded = await addColumnIfMissing('audit_events', 'system_component', "VARCHAR(128) NOT NULL DEFAULT 'faith-api' AFTER source_workflow");
  await addIndexIfMissing('audit_events', 'idx_audit_result', '(tenant_id, result)');

  const [staffAccountRows] = await conn.query(
    'SELECT id, email, email_enc, email_lookup_hash FROM staff_accounts',
  );
  for (const row of staffAccountRows) {
    const legacyEmail = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
    if (!legacyEmail && row.email_enc && row.email_lookup_hash) continue;
    if (!legacyEmail) continue;
    await conn.query(
      'UPDATE staff_accounts SET email_enc = ?, email_lookup_hash = ?, email = NULL WHERE id = ?',
      [encrypt(legacyEmail), deriveLookupHash(legacyEmail, { lowercase: true }), row.id],
    );
  }

  const [tenantRows] = await conn.query(
    'SELECT id, owner_email, owner_email_enc FROM tenant_provisioning',
  );
  for (const row of tenantRows) {
    const legacyOwnerEmail = typeof row.owner_email === 'string' ? row.owner_email.trim() : '';
    if (!legacyOwnerEmail && row.owner_email_enc) continue;
    if (!legacyOwnerEmail) continue;
    await conn.query(
      'UPDATE tenant_provisioning SET owner_email_enc = ?, owner_email = NULL WHERE id = ?',
      [encrypt(legacyOwnerEmail), row.id],
    );
  }

  if (auditActorTypeAdded || auditResultAdded || auditReasonAdded || auditSourceSurfaceAdded || auditSourceWorkflowAdded || auditSystemComponentAdded) {
    await conn.query(
      `UPDATE audit_events
       SET actor_type = CASE
             WHEN actor_role = 'client' THEN 'user'
             WHEN actor_role = 'unknown' OR actor_id = 'anonymous' THEN 'anonymous'
             WHEN actor_id LIKE 'system%' OR actor_role LIKE 'system%' THEN 'system'
             ELSE 'user'
           END,
           result = CASE
             WHEN action LIKE '%.denied%' THEN 'denied'
             WHEN action LIKE '%.failed%' OR action LIKE '%.error%' THEN 'error'
             ELSE 'success'
           END,
           reason_code = CASE
             WHEN action LIKE '%.denied%' THEN 'rbac_denied'
             WHEN action LIKE '%.failed%' THEN 'operation_failed'
             WHEN action LIKE '%.error%' THEN 'operation_error'
             ELSE 'ok'
           END,
           source_surface = CASE WHEN source_surface = 'api' THEN 'api' ELSE source_surface END,
           source_workflow = CASE WHEN source_workflow = 'request' THEN 'request' ELSE source_workflow END,
           system_component = CASE WHEN system_component = 'faith-api' THEN 'faith-api' ELSE system_component END`,
    );
  }

  await addColumnIfMissing('clients', 'primary_counselor_id', 'VARCHAR(64) NULL');
  await addColumnIfMissing('clients', 'high_touchpoint', 'TINYINT(1) NOT NULL DEFAULT 0');
  await addColumnIfMissing('clients', 'middle_name_enc', 'TEXT NULL AFTER first_name_enc');
  await addColumnIfMissing('clients', 'preferred_name_enc', 'TEXT NULL');
  await addColumnIfMissing('clients', 'gender_identity', 'VARCHAR(128) NULL');
  await addColumnIfMissing('clients', 'pronouns', 'VARCHAR(64) NULL');
  await addColumnIfMissing('clients', 'date_of_birth_enc', 'TEXT NULL');
  await addColumnIfMissing('clients', 'ssn_last4_enc', 'TEXT NULL');
  await addColumnIfMissing('clients', 'biological_sex', 'VARCHAR(32) NULL');
  await addColumnIfMissing('clients', 'race_ethnicity', 'VARCHAR(128) NULL');
  await addColumnIfMissing('clients', 'marital_status', 'VARCHAR(64) NULL');
  await addColumnIfMissing('clients', 'language_preference', "VARCHAR(64) NULL DEFAULT 'en'");
  await addColumnIfMissing('clients', 'employment_status', 'VARCHAR(64) NULL');
  await addColumnIfMissing('clients', 'employer_name_enc', 'TEXT NULL');
  await addColumnIfMissing('clients', 'email_enc', 'TEXT NULL');
  await addIndexIfMissing('clients', 'idx_clients_counselor', '(primary_counselor_id)');

  await addColumnIfMissing('portal_client_profiles', 'preferred_name_enc', 'TEXT NULL');

  await addColumnIfMissing('portal_registration_requests', 'request_type', "VARCHAR(64) NOT NULL DEFAULT 'care_request' AFTER tenant_id");
  await addColumnIfMissing('portal_registration_requests', 'preferred_contact_method', 'VARCHAR(64) NULL AFTER phone_enc');
  await addColumnIfMissing('portal_registration_requests', 'preferred_contact_window', 'VARCHAR(128) NULL AFTER preferred_contact_method');
  await addColumnIfMissing('portal_registration_requests', 'onboarding_details_enc', 'MEDIUMTEXT NULL AFTER requested_services');
  await addColumnIfMissing('portal_registration_requests', 'converted_client_id', 'VARCHAR(64) NULL AFTER status');
  await addColumnIfMissing('portal_settings', 'financial_mode', "VARCHAR(64) NOT NULL DEFAULT 'offerings' AFTER show_public_counselor_directory");
  await addColumnIfMissing('portal_settings', 'suggested_offering_cents', 'INT NOT NULL DEFAULT 0 AFTER financial_mode');
  await addColumnIfMissing('portal_settings', 'offering_ministry_note', 'TEXT NULL AFTER suggested_offering_cents');

  // Appointments: rename scheduled_at → starts_at, add ends_at / location_name / timezone
  await addColumnIfMissing('appointments', 'counselor_id', 'VARCHAR(64) NULL AFTER client_id');
  await addColumnIfMissing('appointments', 'starts_at',     'TIMESTAMP NULL AFTER status');
  await addColumnIfMissing('appointments', 'ends_at',       'TIMESTAMP NULL AFTER starts_at');
  await addColumnIfMissing('appointments', 'location_name', 'VARCHAR(200) NULL AFTER ends_at');
  await addColumnIfMissing('appointments', 'timezone',      'VARCHAR(64) NULL AFTER location_name');
  await addColumnIfMissing('appointments', 'series_id',     'VARCHAR(64) NULL');
  await addIndexIfMissing('appointments', 'idx_appointments_counselor', '(tenant_id, counselor_id)');
  await addIndexIfMissing('appointments', 'idx_appointments_starts_at', '(tenant_id, starts_at)');
  await addIndexIfMissing('appointments', 'idx_appointments_series',    '(tenant_id, series_id)');
  await addColumnIfMissing('appointment_series', 'start_time', "VARCHAR(8) NOT NULL DEFAULT '09:00'");

  const [portalAccountRows] = await conn.query(
    'SELECT id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash FROM portal_accounts',
  );
  const { default: argon2 } = await import('argon2');
  const defaultPortalPasswordHash = await argon2.hash('ChangeMe!Client2026#', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
  for (const row of portalAccountRows) {
    const email = row.email_enc ? decrypt(row.email_enc)?.trim().toLowerCase() : '';
    const nextLookupHash = row.email_lookup_hash || (email ? deriveLookupHash(email, { lowercase: true }) : null);
    const nextPasswordHash = row.password_hash || (
      row.tenant_id === 'system' && row.client_id === 'c-001'
        ? defaultPortalPasswordHash
        : null
    );
    if (!nextLookupHash && !nextPasswordHash) continue;
    await conn.query(
      'UPDATE portal_accounts SET email_lookup_hash = COALESCE(email_lookup_hash, ?), password_hash = COALESCE(password_hash, ?) WHERE id = ?',
      [nextLookupHash, nextPasswordHash, row.id],
    );
  }

  // Progress notes: link to appointment
  await addColumnIfMissing('progress_notes', 'appointment_id', 'VARCHAR(64) NULL AFTER client_id');
  await addIndexIfMissing('progress_notes', 'idx_note_appointment', '(appointment_id)');

  // Superbills: encrypt PHI diagnosis codes
  await addColumnIfMissing('superbills', 'diagnosis_codes_enc', 'MEDIUMTEXT NULL AFTER diagnosis_codes');
  const [superbillRows] = await conn.query(
    'SELECT id, tenant_id, diagnosis_codes FROM superbills WHERE diagnosis_codes IS NOT NULL AND diagnosis_codes_enc IS NULL',
  );
  for (const row of superbillRows) {
    const raw = typeof row.diagnosis_codes === 'string' ? row.diagnosis_codes : JSON.stringify(row.diagnosis_codes);
    if (!raw) continue;
    await conn.query(
      'UPDATE superbills SET diagnosis_codes_enc = ?, diagnosis_codes = NULL WHERE id = ? AND tenant_id = ?',
      [encrypt(raw), row.id, row.tenant_id],
    );
  }
  if (superbillRows.length > 0) {
    console.log(`  ~ migrated ${superbillRows.length} superbill diagnosis_codes rows to encrypted form`);
  }

  console.log('Column migrations done.');
}

async function backfillAppointmentCounselorLinks(conn) {
  let decrypt;
  try {
    const mod = await import('../lib/encrypt.js');
    decrypt = mod.decrypt;
  } catch {
    console.warn('Warning: encrypt module not available; appointment counselor backfill skipped.');
    return;
  }

  const [staffRows] = await conn.query(
    'SELECT id, tenant_id, first_name_enc, last_name_enc FROM staff_members',
  );
  if (!staffRows.length) return;

  const staffNameIndex = new Map();
  for (const row of staffRows) {
    const fullName = `${decrypt(row.first_name_enc)} ${decrypt(row.last_name_enc)}`.trim();
    if (!fullName) continue;
    const key = `${row.tenant_id}:${fullName}`;
    const matches = staffNameIndex.get(key) ?? [];
    matches.push(row.id);
    staffNameIndex.set(key, matches);
  }

  const [appointmentRows] = await conn.query(
    `SELECT id, tenant_id, counselor_name_enc
       FROM appointments
      WHERE counselor_id IS NULL
        AND counselor_name_enc IS NOT NULL`,
  );

  let updated = 0;
  for (const row of appointmentRows) {
    const counselorName = decrypt(row.counselor_name_enc).trim();
    if (!counselorName) continue;
    const matches = staffNameIndex.get(`${row.tenant_id}:${counselorName}`) ?? [];
    if (matches.length !== 1) continue;
    await conn.query(
      'UPDATE appointments SET counselor_id = ? WHERE id = ? AND tenant_id = ?',
      [matches[0], row.id, row.tenant_id],
    );
    updated += 1;
  }

  if (updated > 0) {
    console.log(`  + linked ${updated} legacy appointments to counselor IDs`);
  }
}

async function seedDevData(conn) {
  // Only seed if tenants table is empty
  const [[{ count }]] = await conn.query('SELECT COUNT(*) AS count FROM tenants');
  if (count > 0) {
    console.log('Seed data already present — skipping.');
    return;
  }

  console.log('Seeding development data…');

  // Default tenant
  await conn.query(
    `INSERT INTO tenants (id, name, plan_type) VALUES (?, ?, ?)`,
    ['system', 'Grace Counseling Center', 'standard'],
  );

  // Default practice
  await conn.query(
    `INSERT INTO practices (id, tenant_id, name, practice_type, timezone) VALUES (?, ?, ?, ?, ?)`,
    ['prac-001', 'system', 'Grace Counseling Center', 'solo', 'America/New_York'],
  );

  // Import encrypt lazily (needs DB_ENCRYPTION_KEY in env)
  let encrypt;
  let deriveLookupHash;
  try {
    const mod = await import('../lib/encrypt.js');
    encrypt = mod.encrypt;
    deriveLookupHash = mod.deriveLookupHash;
  } catch {
    console.warn('Warning: encrypt module not available; staff seed skipped.');
    return;
  }

  // Default staff member
  await conn.query(
    `INSERT INTO staff_members
       (id, tenant_id, role, first_name_enc, last_name_enc, license_type, supervision_status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'staff-001', 'system', 'practice_admin',
      encrypt('Admin'), encrypt('User'),
      'lpc', 'not_required',
    ],
  );

  // Import argon2 for password hashing
  const { default: argon2 } = await import('argon2');
  const passwordHash = await argon2.hash('ChangeMe!Dev2024#', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  // Default staff account: admin@faithcounseling.local / ChangeMe!Dev2024#
  await conn.query(
    `INSERT INTO staff_accounts
       (id, staff_member_id, tenant_id, email, email_enc, email_lookup_hash, password_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'acct-001',
      'staff-001',
      'system',
      null,
      encrypt('admin@faithcounseling.local'),
      deriveLookupHash('admin@faithcounseling.local', { lowercase: true }),
      passwordHash,
    ],
  );

  console.log('Dev seed complete — default credentials are documented in apps/api/README.md');

  if (!shouldSeedDevPortalData()) {
    console.log('  Dev portal seed skipped (SEED_DEV_PORTAL_DATA=false).');
    return;
  }

  await conn.query(
    `INSERT INTO clients
       (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'c-001',
      'system',
      encrypt('Sarah'),
      encrypt('Kim'),
      'active',
      'Evangelical',
      1,
      'staff-counselor-mercy',
    ],
  );

  const portalPasswordHash = await argon2.hash('ChangeMe!Client2026#', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  await conn.query(
    `INSERT INTO portal_accounts
       (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, status, mfa_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'pa-001',
      'system',
      'c-001',
      encrypt('sarah.kim@example.test'),
      deriveLookupHash('sarah.kim@example.test', { lowercase: true }),
      portalPasswordHash,
      'active',
      0,
    ],
  );
  console.log('Dev portal client seeded — credentials documented in apps/api/README.md');
}

async function ensureDevPortalClient(conn) {
  if (!shouldSeedDevPortalData()) return;

  const [[tenant]] = await conn.query(
    'SELECT id FROM tenants WHERE id = ? LIMIT 1',
    ['system'],
  );
  if (!tenant) return;

  let encrypt;
  let deriveLookupHash;
  try {
    const mod = await import('../lib/encrypt.js');
    encrypt = mod.encrypt;
    deriveLookupHash = mod.deriveLookupHash;
  } catch {
    return;
  }

  const { default: argon2 } = await import('argon2');
  const portalPasswordHash = await argon2.hash('ChangeMe!Client2026#', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const [[client]] = await conn.query(
    'SELECT id FROM clients WHERE id = ? AND tenant_id = ? LIMIT 1',
    ['c-001', 'system'],
  );
  if (!client) {
    await conn.query(
      `INSERT INTO clients
         (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['c-001', 'system', encrypt('Sarah'), encrypt('Kim'), 'active', 'Evangelical', 1, 'staff-counselor-mercy'],
    );
  } else {
    await conn.query(
      'UPDATE clients SET high_touchpoint = 1, primary_counselor_id = COALESCE(primary_counselor_id, ?) WHERE id = ? AND tenant_id = ?',
      ['staff-counselor-mercy', 'c-001', 'system'],
    );
  }

  const [[portalAccount]] = await conn.query(
    'SELECT id FROM portal_accounts WHERE client_id = ? AND tenant_id = ? LIMIT 1',
    ['c-001', 'system'],
  );
  if (!portalAccount) {
    await conn.query(
      `INSERT INTO portal_accounts
         (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, status, mfa_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'pa-001',
        'system',
        'c-001',
        encrypt('sarah.kim@example.test'),
        deriveLookupHash('sarah.kim@example.test', { lowercase: true }),
        portalPasswordHash,
        'active',
        0,
      ],
    );
    console.log('  + ensured seeded portal client account for local development');
  } else {
    await conn.query(
      `UPDATE portal_accounts
       SET email_lookup_hash = ?,
           password_hash = ?,
           failed_attempts = 0,
           locked_until = NULL,
           status = 'active'
       WHERE id = ?`,
      [
        deriveLookupHash('sarah.kim@example.test', { lowercase: true }),
        portalPasswordHash,
        portalAccount.id,
      ],
    );
  }

  const [[portalResource]] = await conn.query(
    'SELECT id FROM portal_resources WHERE id = ? AND tenant_id = ? LIMIT 1',
    ['pr-001', 'system'],
  );
  if (!portalResource) {
    await conn.query(
      `INSERT INTO portal_resources
         (id, tenant_id, title, content, resource_type, audience, published_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        'pr-001',
        'system',
        'Breath Prayer Starter Guide',
        'A short guided breath prayer routine to practice between sessions.',
        'devotional',
        'client',
      ],
    );
    console.log('  + ensured seeded portal resource for local development');
  }
}
