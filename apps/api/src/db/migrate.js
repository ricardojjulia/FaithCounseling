/**
 * Database migration script — applies incremental column/index migrations.
 *
 * The initial schema is managed by Supabase (supabase/migrations/).
 * This script handles subsequent column additions and data backfills that
 * are applied at API startup.
 *
 * Usage:
 *   node apps/api/src/db/migrate.js
 *
 * Requires DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD env vars (or .env).
 */

import path from 'node:path';
import pg from 'pg';

// Load .env if present (for local dev convenience)
try {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} catch {
  // dotenv is optional — ignore if not installed
}

// Create a one-off connection (not the pool) for running migrations.
const connection = new pg.Client({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT || 57322),
  database: process.env.DB_NAME     || 'postgres',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
});
await connection.connect();

try {
  console.log('Running incremental migrations…');

  // Column migrations — add new columns to existing tables when the schema
  // has already been created. Each check is idempotent via INFORMATION_SCHEMA.
  await applyColumnMigrations(connection);
  await backfillAppointmentCounselorLinks(connection);

  // Record all migrations that have run so ops/migrate-all-tenants.mjs can
  // report schema version across tenant DBs.
  await recordMigration(connection, 'core_schema_initial');
  await recordMigration(connection, 'column_migrations_batch_1');

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

async function hasMigration(conn, name) {
  const result = await conn.query(
    'SELECT 1 FROM schema_migrations WHERE name = $1 LIMIT 1',
    [name],
  );
  return result.rows.length > 0;
}

async function recordMigration(conn, name) {
  // PostgreSQL equivalent of INSERT IGNORE — insert, skip silently on conflict
  await conn.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
}

async function applyColumnMigrations(conn) {
  const { encrypt, decrypt, deriveLookupHash } = await import('../lib/encrypt.js');

  // Helper: add a column if it doesn't already exist (PostgreSQL catalog)
  async function addColumnIfMissing(table, column, definition) {
    const result = await conn.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
      [table, column],
    );
    if (Number(result.rows[0].cnt) === 0) {
      await conn.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
      console.log(`  + ${table}.${column} added`);
      return true;
    }
    return false;
  }

  // Helper: add an index if it doesn't already exist (PostgreSQL catalog)
  async function addIndexIfMissing(table, indexName, definition) {
    const result = await conn.query(
      `SELECT COUNT(*) AS cnt FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2`,
      [table, indexName],
    );
    if (Number(result.rows[0].cnt) === 0) {
      await conn.query(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} ${definition}`);
      console.log(`  + index ${indexName} on ${table} added`);
      return true;
    }
    return false;
  }

  async function addUniqueIndexIfMissing(table, indexName, definition) {
    const result = await conn.query(
      `SELECT COUNT(*) AS cnt FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2`,
      [table, indexName],
    );
    if (Number(result.rows[0].cnt) === 0) {
      await conn.query(`CREATE UNIQUE INDEX IF NOT EXISTS ${indexName} ON ${table} ${definition}`);
      console.log(`  + unique index ${indexName} on ${table} added`);
      return true;
    }
    return false;
  }

  async function alterColumn(table, column, definition) {
    const result = await conn.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
      [table, column],
    );
    if (Number(result.rows[0].cnt) === 0) return false;
    // Strip nullability keywords — ALTER COLUMN TYPE only accepts the data type
    const nullable = /\bNULL\b/i.test(definition) && !/NOT\s+NULL/i.test(definition);
    const dataType = definition.replace(/\s+(NOT\s+)?NULL\b/gi, '').trim();
    await conn.query(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${dataType} USING ${column}::TEXT::${dataType}`);
    if (nullable) {
      await conn.query(`ALTER TABLE ${table} ALTER COLUMN ${column} DROP NOT NULL`);
    }
    console.log(`  ~ ${table}.${column} altered`);
    return true;
  }

  console.log('Applying column migrations…');
  await addColumnIfMissing('staff_accounts', 'email_enc', 'TEXT NULL');
  await addColumnIfMissing('staff_accounts', 'email_lookup_hash', 'CHAR(64) NULL');
  await addUniqueIndexIfMissing('staff_accounts', 'uq_staff_accounts_email_lookup_hash', '(email_lookup_hash)');
  await alterColumn('staff_accounts', 'email', 'VARCHAR(320) NULL');
  await addColumnIfMissing('portal_accounts', 'email_lookup_hash', 'CHAR(64) NULL');
  await addColumnIfMissing('portal_accounts', 'password_hash', 'VARCHAR(255) NULL');
  await addColumnIfMissing('portal_accounts', 'failed_attempts', 'INT NOT NULL DEFAULT 0');
  await addColumnIfMissing('portal_accounts', 'locked_until', 'TIMESTAMPTZ NULL');
  await addUniqueIndexIfMissing('portal_accounts', 'uq_portal_email_lookup_hash', '(tenant_id, email_lookup_hash)');

  await addColumnIfMissing('tenant_provisioning', 'owner_email_enc', 'TEXT NULL');
  await alterColumn('tenant_provisioning', 'owner_email', 'VARCHAR(320) NULL');

  const auditActorTypeAdded = await addColumnIfMissing('audit_events', 'actor_type', "VARCHAR(32) NOT NULL DEFAULT 'anonymous'");
  const auditResultAdded = await addColumnIfMissing('audit_events', 'result', "VARCHAR(16) NOT NULL DEFAULT 'success'");
  const auditReasonAdded = await addColumnIfMissing('audit_events', 'reason_code', "VARCHAR(64) NOT NULL DEFAULT 'ok'");
  const auditSourceSurfaceAdded = await addColumnIfMissing('audit_events', 'source_surface', "VARCHAR(128) NOT NULL DEFAULT 'api'");
  const auditSourceWorkflowAdded = await addColumnIfMissing('audit_events', 'source_workflow', "VARCHAR(128) NOT NULL DEFAULT 'request'");
  const auditSystemComponentAdded = await addColumnIfMissing('audit_events', 'system_component', "VARCHAR(128) NOT NULL DEFAULT 'churchcore-api'");
  await addIndexIfMissing('audit_events', 'idx_audit_result', '(tenant_id, result)');

  const staffAccountResult = await conn.query(
    'SELECT id, email, email_enc, email_lookup_hash FROM staff_accounts',
  );
  const staffAccountRows = staffAccountResult.rows;
  for (const row of staffAccountRows) {
    const legacyEmail = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
    if (!legacyEmail && row.email_enc && row.email_lookup_hash) continue;
    if (!legacyEmail) continue;
    await conn.query(
      'UPDATE staff_accounts SET email_enc = $1, email_lookup_hash = $2, email = NULL WHERE id = $3',
      [encrypt(legacyEmail), deriveLookupHash(legacyEmail, { lowercase: true }), row.id],
    );
  }

  const tenantResult = await conn.query(
    'SELECT id, owner_email, owner_email_enc FROM tenant_provisioning',
  );
  const tenantRows = tenantResult.rows;
  for (const row of tenantRows) {
    const legacyOwnerEmail = typeof row.owner_email === 'string' ? row.owner_email.trim() : '';
    if (!legacyOwnerEmail && row.owner_email_enc) continue;
    if (!legacyOwnerEmail) continue;
    await conn.query(
      'UPDATE tenant_provisioning SET owner_email_enc = $1, owner_email = NULL WHERE id = $2',
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
           system_component = CASE WHEN system_component = 'churchcore-api' THEN 'churchcore-api' ELSE system_component END`,
    );
  }

  await addColumnIfMissing('clients', 'primary_counselor_id', 'VARCHAR(64) NULL');
  await addColumnIfMissing('clients', 'high_touchpoint', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await addColumnIfMissing('clients', 'middle_name_enc', 'TEXT NULL');
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

  await addColumnIfMissing('portal_registration_requests', 'request_type', "VARCHAR(64) NOT NULL DEFAULT 'care_request'");
  await addColumnIfMissing('portal_registration_requests', 'preferred_contact_method', 'VARCHAR(64) NULL');
  await addColumnIfMissing('portal_registration_requests', 'preferred_contact_window', 'VARCHAR(128) NULL');
  await addColumnIfMissing('portal_registration_requests', 'onboarding_details_enc', 'MEDIUMTEXT NULL');
  await addColumnIfMissing('portal_registration_requests', 'converted_client_id', 'VARCHAR(64) NULL');
  await addColumnIfMissing('portal_settings', 'financial_mode', "VARCHAR(64) NOT NULL DEFAULT 'offerings'");
  await addColumnIfMissing('portal_settings', 'suggested_offering_cents', 'INT NOT NULL DEFAULT 0');
  await addColumnIfMissing('portal_settings', 'offering_ministry_note', 'TEXT NULL');

  // Appointments: rename scheduled_at → starts_at, add ends_at / location_name / timezone
  await addColumnIfMissing('appointments', 'counselor_id', 'VARCHAR(64) NULL');
  await addColumnIfMissing('appointments', 'starts_at',     'TIMESTAMPTZ NULL');
  await addColumnIfMissing('appointments', 'ends_at',       'TIMESTAMPTZ NULL');
  await addColumnIfMissing('appointments', 'location_name', 'VARCHAR(200) NULL');
  await addColumnIfMissing('appointments', 'timezone',      'VARCHAR(64) NULL');
  await addColumnIfMissing('appointments', 'series_id',     'VARCHAR(64) NULL');
  await addIndexIfMissing('appointments', 'idx_appointments_counselor', '(tenant_id, counselor_id)');
  await addIndexIfMissing('appointments', 'idx_appointments_starts_at', '(tenant_id, starts_at)');
  await addIndexIfMissing('appointments', 'idx_appointments_series',    '(tenant_id, series_id)');
  await addColumnIfMissing('appointment_series', 'start_time', "VARCHAR(8) NOT NULL DEFAULT '09:00'");

  const portalAccountResult = await conn.query(
    'SELECT id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash FROM portal_accounts',
  );
  const portalAccountRows = portalAccountResult.rows;
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
      'UPDATE portal_accounts SET email_lookup_hash = COALESCE(email_lookup_hash, $1), password_hash = COALESCE(password_hash, $2) WHERE id = $3',
      [nextLookupHash, nextPasswordHash, row.id],
    );
  }

  // Progress notes: link to appointment
  await addColumnIfMissing('progress_notes', 'appointment_id', 'VARCHAR(64) NULL');
  await addIndexIfMissing('progress_notes', 'idx_note_appointment', '(appointment_id)');

  // Superbills: encrypt PHI diagnosis codes
  await addColumnIfMissing('superbills', 'diagnosis_codes_enc', 'MEDIUMTEXT NULL');
  const superbillResult = await conn.query(
    'SELECT id, tenant_id, diagnosis_codes FROM superbills WHERE diagnosis_codes IS NOT NULL AND diagnosis_codes_enc IS NULL',
  );
  const superbillRows = superbillResult.rows;
  for (const row of superbillRows) {
    const raw = typeof row.diagnosis_codes === 'string' ? row.diagnosis_codes : JSON.stringify(row.diagnosis_codes);
    if (!raw) continue;
    await conn.query(
      'UPDATE superbills SET diagnosis_codes_enc = $1, diagnosis_codes = NULL WHERE id = $2 AND tenant_id = $3',
      [encrypt(raw), row.id, row.tenant_id],
    );
  }
  if (superbillRows.length > 0) {
    console.log(`  ~ migrated ${superbillRows.length} superbill diagnosis_codes rows to encrypted form`);
  }

  // ── i18n Phase 1 migrations ──────────────────────────────────────────────
  // Rename language_preference → content_language (what language the person speaks)
  await addColumnIfMissing('clients', 'content_language', "VARCHAR(35) NULL DEFAULT 'en'");
  // Per-user UI locale (BCP 47 tag, e.g. 'en-US', 'es-MX')
  await addColumnIfMissing('clients', 'preferred_ui_locale', 'VARCHAR(35) NULL DEFAULT NULL');
  await addColumnIfMissing('staff_members', 'preferred_ui_locale', 'VARCHAR(35) NULL DEFAULT NULL');
  // Tenant-level default UI locale
  await addColumnIfMissing('tenants', 'default_ui_locale', "VARCHAR(35) NOT NULL DEFAULT 'en-US'");
  // Practice-level default content language
  await addColumnIfMissing('practices', 'default_content_language', "VARCHAR(35) NOT NULL DEFAULT 'en'");

  // ── Telehealth (Phase 1) ──────────────────────────────────────────────────
  // Persists the unique Jitsi room name for each appointment. Stored in plain
  // text — it is a random opaque token, not PHI. The JWT is generated on-demand
  // and never persisted.
  await addColumnIfMissing('appointments', 'video_room_id', 'VARCHAR(255) NULL');

  // Per-practice JaaS video config — each counseling practice brings its own
  // free or paid JaaS account. The private key is AES-256-GCM encrypted at
  // rest. All four columns are nullable so practices that have not yet
  // configured video gracefully fall back to the server-level env vars (or
  // simply return a null JWT and no-op the button).
  await addColumnIfMissing('practices', 'jaas_app_id', 'VARCHAR(255) NULL');
  await addColumnIfMissing('practices', 'jaas_api_key_id', 'VARCHAR(255) NULL');
  await addColumnIfMissing('practices', 'jaas_private_key_enc', 'TEXT NULL');
  await addColumnIfMissing('practices', 'jaas_domain', "VARCHAR(128) NULL DEFAULT '8x8.vc'");

  // ── Time Tracking (Phase 1) ───────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id               CHAR(36)      NOT NULL,
      tenant_id        VARCHAR(64)   NOT NULL,
      user_id          VARCHAR(64)   NOT NULL,
      appointment_id   VARCHAR(64)   NULL,
      category         VARCHAR(64)   NOT NULL,
      start_time       TIMESTAMP     NOT NULL,
      end_time         TIMESTAMP     NOT NULL,
      duration_minutes INT           NOT NULL,
      is_locked        BOOLEAN       NOT NULL DEFAULT FALSE,
      verified_by      VARCHAR(64)   NULL,
      verified_at      TIMESTAMP     NULL,
      description_enc  TEXT          NULL,
      created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);
  await conn.query(`CREATE INDEX IF NOT EXISTS idx_te_user_category ON time_entries (tenant_id, user_id, category)`);
  await conn.query(`CREATE INDEX IF NOT EXISTS idx_te_user_start    ON time_entries (tenant_id, user_id, start_time)`);
  await conn.query(`CREATE INDEX IF NOT EXISTS idx_te_appointment   ON time_entries (appointment_id)`);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS licensure_goals (
      id              CHAR(36)      NOT NULL,
      tenant_id       VARCHAR(64)   NOT NULL,
      user_id         VARCHAR(64)   NOT NULL,
      label           VARCHAR(255)  NOT NULL,
      category_filter VARCHAR(255)  NULL,
      target_minutes  INT           NOT NULL,
      effective_from  DATE          NOT NULL,
      effective_to    DATE          NULL,
      created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);
  await conn.query(`CREATE INDEX IF NOT EXISTS idx_lg_user ON licensure_goals (tenant_id, user_id)`);

  // Create faith_pastoral_registers as the rename of faith_language_preferences
  await conn.query(`
    CREATE TABLE IF NOT EXISTS faith_pastoral_registers (
      id                      VARCHAR(64)   NOT NULL,
      tenant_id               VARCHAR(64)   NOT NULL,
      practice_id             VARCHAR(64)   NULL,
      integration_level       VARCHAR(64)   NOT NULL DEFAULT 'moderate',
      explicit_faith_language  BOOLEAN      NOT NULL DEFAULT TRUE,
      include_prayer_language  BOOLEAN      NOT NULL DEFAULT TRUE,
      include_scripture_refs   BOOLEAN      NOT NULL DEFAULT TRUE,
      preferred_terminology    VARCHAR(255)  NULL,
      updated_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);
  await conn.query(`CREATE INDEX IF NOT EXISTS idx_faith_pastoral_register_tenant ON faith_pastoral_registers (tenant_id)`);
  // Copy existing rows from the old table (idempotent via ON CONFLICT DO NOTHING)
  await conn.query(`
    INSERT INTO faith_pastoral_registers
      (id, tenant_id, practice_id, integration_level,
       explicit_faith_language, include_prayer_language, include_scripture_refs,
       preferred_terminology, updated_at)
    SELECT id, tenant_id, practice_id, integration_level,
           explicit_faith_language, include_prayer_language, include_scripture_refs,
           preferred_terminology, updated_at
    FROM faith_language_preferences
    ON CONFLICT DO NOTHING
  `).catch(() => { /* old table may not exist in fresh installs — ignore */ });

  // ── Phase 2: Faith-integrated clinical fields on progress notes ──────────
  await addColumnIfMissing('progress_notes', 'scripture_reference', 'VARCHAR(255) NULL');
  await addColumnIfMissing('progress_notes', 'spiritual_practices', 'JSON NULL');

  // ── Phase 3: Cosign workflow columns on progress notes ────────────────────
  await addColumnIfMissing('progress_notes', 'cosign_status', "VARCHAR(32) NULL DEFAULT NULL");
  await addColumnIfMissing('progress_notes', 'cosign_requested_by', 'VARCHAR(64) NULL');
  await addColumnIfMissing('progress_notes', 'cosign_requested_at', 'TIMESTAMPTZ NULL');
  await addColumnIfMissing('progress_notes', 'cosigned_by', 'VARCHAR(64) NULL');
  await addColumnIfMissing('progress_notes', 'cosigned_at', 'TIMESTAMPTZ NULL');
  await addColumnIfMissing('progress_notes', 'cosign_comments_enc', 'TEXT NULL');

  // ── Phase 3: Supervisor assignments table ────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS supervisor_assignments (
      id            CHAR(36)     NOT NULL,
      tenant_id     VARCHAR(64)  NOT NULL,
      supervisor_id VARCHAR(64)  NOT NULL,
      intern_id     VARCHAR(64)  NOT NULL,
      practice_id   VARCHAR(64)  NOT NULL,
      assigned_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE (supervisor_id, intern_id, practice_id)
    )
  `);
  await conn.query(`CREATE INDEX IF NOT EXISTS idx_sa_tenant_intern ON supervisor_assignments (tenant_id, intern_id)`);
  await conn.query(`CREATE INDEX IF NOT EXISTS idx_sa_supervisor ON supervisor_assignments (tenant_id, supervisor_id)`);

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

  const staffResult = await conn.query(
    'SELECT id, tenant_id, first_name_enc, last_name_enc FROM staff_members',
  );
  const staffRows = staffResult.rows;
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

  const appointmentResult = await conn.query(
    `SELECT id, tenant_id, counselor_name_enc
       FROM appointments
      WHERE counselor_id IS NULL
        AND counselor_name_enc IS NOT NULL`,
  );
  const appointmentRows = appointmentResult.rows;

  let updated = 0;
  for (const row of appointmentRows) {
    const counselorName = decrypt(row.counselor_name_enc).trim();
    if (!counselorName) continue;
    const matches = staffNameIndex.get(`${row.tenant_id}:${counselorName}`) ?? [];
    if (matches.length !== 1) continue;
    await conn.query(
      'UPDATE appointments SET counselor_id = $1 WHERE id = $2 AND tenant_id = $3',
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
  const tenantCountResult = await conn.query('SELECT COUNT(*) AS count FROM tenants');
  if (Number(tenantCountResult.rows[0].count) > 0) {
    console.log('Seed data already present — skipping.');
    return;
  }

  console.log('Seeding development data…');

  // Default tenant
  await conn.query(
    `INSERT INTO tenants (id, name, plan_type) VALUES ($1, $2, $3)`,
    ['system', 'Grace Counseling Center', 'standard'],
  );

  // Default practice
  await conn.query(
    `INSERT INTO practices (id, tenant_id, name, practice_type, timezone) VALUES ($1, $2, $3, $4, $5)`,
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
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
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

  // Default staff account: admin@churchcorecare.local / ChangeMe!Dev2024#
  await conn.query(
    `INSERT INTO staff_accounts
       (id, staff_member_id, tenant_id, email, email_enc, email_lookup_hash, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      'acct-001',
      'staff-001',
      'system',
      null,
      encrypt('admin@churchcorecare.local'),
      deriveLookupHash('admin@churchcorecare.local', { lowercase: true }),
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
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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

  const tenantRes = await conn.query(
    'SELECT id FROM tenants WHERE id = $1 LIMIT 1',
    ['system'],
  );
  if (!tenantRes.rows[0]) return;

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

  const clientRes = await conn.query(
    'SELECT id FROM clients WHERE id = $1 AND tenant_id = $2 LIMIT 1',
    ['c-001', 'system'],
  );
  const client = clientRes.rows[0];
  if (!client) {
    await conn.query(
      `INSERT INTO clients
         (id, tenant_id, first_name_enc, last_name_enc, status, faith_background, high_touchpoint, primary_counselor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['c-001', 'system', encrypt('Sarah'), encrypt('Kim'), 'active', 'Evangelical', 1, 'staff-counselor-mercy'],
    );
  } else {
    await conn.query(
      'UPDATE clients SET high_touchpoint = 1, primary_counselor_id = COALESCE(primary_counselor_id, $1) WHERE id = $2 AND tenant_id = $3',
      ['staff-counselor-mercy', 'c-001', 'system'],
    );
  }

  const portalAccountRes = await conn.query(
    'SELECT id FROM portal_accounts WHERE client_id = $1 AND tenant_id = $2 LIMIT 1',
    ['c-001', 'system'],
  );
  const portalAccount = portalAccountRes.rows[0];
  if (!portalAccount) {
    await conn.query(
      `INSERT INTO portal_accounts
         (id, tenant_id, client_id, email_enc, email_lookup_hash, password_hash, status, mfa_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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
       SET email_lookup_hash = $1,
           password_hash = $2,
           failed_attempts = 0,
           locked_until = NULL,
           status = 'active'
       WHERE id = $3`,
      [
        deriveLookupHash('sarah.kim@example.test', { lowercase: true }),
        portalPasswordHash,
        portalAccount.id,
      ],
    );
  }

  const portalResourceRes = await conn.query(
    'SELECT id FROM portal_resources WHERE id = $1 AND tenant_id = $2 LIMIT 1',
    ['pr-001', 'system'],
  );
  const portalResource = portalResourceRes.rows[0];
  if (!portalResource) {
    await conn.query(
      `INSERT INTO portal_resources
         (id, tenant_id, title, content, resource_type, audience, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
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
