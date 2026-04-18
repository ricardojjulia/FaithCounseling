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
  await seedClinicalNoteTemplates(connection);
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
  await addColumnIfMissing('appointments', 'video_room_id', 'VARCHAR(255) NULL AFTER remote_session');

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
    CREATE TABLE IF NOT EXISTS \`time_entries\` (
      \`id\`               CHAR(36)      NOT NULL,
      \`tenant_id\`        VARCHAR(64)   NOT NULL,
      \`user_id\`          VARCHAR(64)   NOT NULL,
      \`appointment_id\`   VARCHAR(64)   NULL,
      \`category\`         ENUM(
                             'direct_clinical',
                             'indirect_admin',
                             'supervision_individual',
                             'supervision_group',
                             'ce_spiritual',
                             'ministry_coordination'
                           )             NOT NULL,
      \`start_time\`       DATETIME      NOT NULL,
      \`end_time\`         DATETIME      NOT NULL,
      \`duration_minutes\` INT           NOT NULL,
      \`is_locked\`        TINYINT(1)    NOT NULL DEFAULT 0,
      \`verified_by\`      VARCHAR(64)   NULL,
      \`verified_at\`      DATETIME      NULL,
      \`description_enc\`  TEXT          NULL,
      \`created_at\`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`idx_te_user_category\` (\`tenant_id\`, \`user_id\`, \`category\`),
      INDEX \`idx_te_user_start\`    (\`tenant_id\`, \`user_id\`, \`start_time\`),
      INDEX \`idx_te_appointment\`   (\`appointment_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`licensure_goals\` (
      \`id\`              CHAR(36)      NOT NULL,
      \`tenant_id\`       VARCHAR(64)   NOT NULL,
      \`user_id\`         VARCHAR(64)   NOT NULL,
      \`label\`           VARCHAR(255)  NOT NULL,
      \`category_filter\` VARCHAR(255)  NULL,
      \`target_minutes\`  INT           NOT NULL,
      \`effective_from\`  DATE          NOT NULL,
      \`effective_to\`    DATE          NULL,
      \`created_at\`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`idx_lg_user\` (\`tenant_id\`, \`user_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Create faith_pastoral_registers as the rename of faith_language_preferences
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`faith_pastoral_registers\` (
      \`id\`                      VARCHAR(64)   NOT NULL,
      \`tenant_id\`               VARCHAR(64)   NOT NULL,
      \`practice_id\`             VARCHAR(64)   NULL,
      \`integration_level\`       VARCHAR(64)   NOT NULL DEFAULT 'moderate',
      \`explicit_faith_language\`  TINYINT(1)   NOT NULL DEFAULT 1,
      \`include_prayer_language\`  TINYINT(1)   NOT NULL DEFAULT 1,
      \`include_scripture_refs\`   TINYINT(1)   NOT NULL DEFAULT 1,
      \`preferred_terminology\`    VARCHAR(255)  NULL,
      \`updated_at\`               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`idx_faith_pastoral_register_tenant\` (\`tenant_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // Copy existing rows from the old table (idempotent via INSERT IGNORE)
  await conn.query(`
    INSERT IGNORE INTO \`faith_pastoral_registers\`
      (\`id\`, \`tenant_id\`, \`practice_id\`, \`integration_level\`,
       \`explicit_faith_language\`, \`include_prayer_language\`, \`include_scripture_refs\`,
       \`preferred_terminology\`, \`updated_at\`)
    SELECT \`id\`, \`tenant_id\`, \`practice_id\`, \`integration_level\`,
           \`explicit_faith_language\`, \`include_prayer_language\`, \`include_scripture_refs\`,
           \`preferred_terminology\`, \`updated_at\`
    FROM \`faith_language_preferences\`
  `).catch(() => { /* old table may not exist in fresh installs — ignore */ });

  // ── Phase 2: Faith-integrated clinical fields on progress notes ──────────
  await addColumnIfMissing('progress_notes', 'scripture_reference', 'VARCHAR(255) NULL');
  await addColumnIfMissing('progress_notes', 'spiritual_practices', 'JSON NULL');

  // ── Phase 3: Cosign workflow columns on progress notes ────────────────────
  await addColumnIfMissing('progress_notes', 'cosign_status', "VARCHAR(32) NULL DEFAULT NULL COMMENT 'pending_review|reviewed|rejected'");
  await addColumnIfMissing('progress_notes', 'cosign_requested_by', 'VARCHAR(64) NULL');
  await addColumnIfMissing('progress_notes', 'cosign_requested_at', 'DATETIME NULL');
  await addColumnIfMissing('progress_notes', 'cosigned_by', 'VARCHAR(64) NULL');
  await addColumnIfMissing('progress_notes', 'cosigned_at', 'DATETIME NULL');
  await addColumnIfMissing('progress_notes', 'cosign_comments_enc', 'TEXT NULL');

  // ── Phase 4: Clinical note template linking on progress notes ─────────────
  await addColumnIfMissing('progress_notes', 'template_id', 'VARCHAR(64) NULL COMMENT \'references clinical_note_templates.id\'');
  await addColumnIfMissing('progress_notes', 'template_sections_enc', 'TEXT NULL COMMENT \'AES-256-GCM encrypted JSON of {sectionKey: content}\'');

  // ── Phase 3: Supervisor assignments table ────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`supervisor_assignments\` (
      \`id\`            CHAR(36)     NOT NULL,
      \`tenant_id\`     VARCHAR(64)  NOT NULL,
      \`supervisor_id\` VARCHAR(64)  NOT NULL,
      \`intern_id\`     VARCHAR(64)  NOT NULL,
      \`practice_id\`   VARCHAR(64)  NOT NULL,
      \`assigned_at\`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_sup_intern\` (\`supervisor_id\`, \`intern_id\`, \`practice_id\`),
      INDEX \`idx_sa_tenant_intern\` (\`tenant_id\`, \`intern_id\`),
      INDEX \`idx_sa_supervisor\` (\`tenant_id\`, \`supervisor_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

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

// ---------------------------------------------------------------------------
// System-level clinical note template library
// Seeded idempotently — skips rows that already exist (INSERT IGNORE).
// ---------------------------------------------------------------------------
async function seedClinicalNoteTemplates(conn) {
  const { v4: uuidv4 } = await import('uuid').catch(() => ({ v4: () => crypto.randomUUID() }));

  const templates = [
    // ── Standard formats ──────────────────────────────────────────────────
    {
      slug: 'soap',
      name: 'SOAP Note',
      category: 'standard',
      is_default: 1,
      structure: [
        { key: 'subjective', label: 'Subjective', placeholder: 'Client\'s reported experience, presenting concerns, mood, symptoms…', type: 'textarea', required: false },
        { key: 'objective', label: 'Objective', placeholder: 'Clinician\'s observable data: appearance, affect, behavior, MSE findings…', type: 'textarea', required: false },
        { key: 'assessment', label: 'Assessment', placeholder: 'Clinical interpretation, diagnostic impressions, progress toward goals…', type: 'textarea', required: false },
        { key: 'plan', label: 'Plan', placeholder: 'Treatment interventions, homework, referrals, next steps…', type: 'textarea', required: false },
      ],
    },
    {
      slug: 'dap',
      name: 'DAP Note',
      category: 'standard',
      is_default: 0,
      structure: [
        { key: 'data', label: 'Data', placeholder: 'Objective and subjective data gathered this session…', type: 'textarea', required: false },
        { key: 'assessment', label: 'Assessment', placeholder: 'Clinical interpretation and diagnostic impressions…', type: 'textarea', required: false },
        { key: 'plan', label: 'Plan', placeholder: 'Next steps, interventions, and homework…', type: 'textarea', required: false },
      ],
    },
    {
      slug: 'birp',
      name: 'BIRP Note',
      category: 'standard',
      is_default: 0,
      structure: [
        { key: 'behavior', label: 'Behavior', placeholder: 'Client\'s behavior, affect, and presenting problems this session…', type: 'textarea', required: false },
        { key: 'intervention', label: 'Intervention', placeholder: 'Therapeutic interventions applied…', type: 'textarea', required: false },
        { key: 'response', label: 'Response', placeholder: 'Client\'s response to interventions…', type: 'textarea', required: false },
        { key: 'plan', label: 'Plan', placeholder: 'Plan for next session, homework, referrals…', type: 'textarea', required: false },
      ],
    },
    {
      slug: 'girp',
      name: 'GIRP Note',
      category: 'standard',
      is_default: 0,
      structure: [
        { key: 'goal', label: 'Goal', placeholder: 'Treatment goal addressed this session…', type: 'textarea', required: false },
        { key: 'intervention', label: 'Intervention', placeholder: 'Therapeutic techniques and interventions used…', type: 'textarea', required: false },
        { key: 'response', label: 'Response', placeholder: 'Client\'s response, engagement, and progress…', type: 'textarea', required: false },
        { key: 'plan', label: 'Plan', placeholder: 'Next steps and homework…', type: 'textarea', required: false },
      ],
    },
    {
      slug: 'stop',
      name: 'STOP Note',
      category: 'standard',
      is_default: 0,
      structure: [
        { key: 'summary', label: 'Summary', placeholder: 'Brief summary of session content…', type: 'textarea', required: false },
        { key: 'treatment', label: 'Treatment', placeholder: 'Interventions and techniques applied…', type: 'textarea', required: false },
        { key: 'objective', label: 'Objective', placeholder: 'Observable data and measurable outcomes…', type: 'textarea', required: false },
        { key: 'plan', label: 'Plan', placeholder: 'Plan for next session…', type: 'textarea', required: false },
      ],
    },
    {
      slug: 'mint',
      name: 'MINT Note',
      category: 'standard',
      is_default: 0,
      structure: [
        { key: 'motivation', label: 'Motivation', placeholder: 'Client\'s motivational status, ambivalence, readiness to change…', type: 'textarea', required: false },
        { key: 'intervention', label: 'Intervention', placeholder: 'MI techniques used (OARS, change talk, affirmation)…', type: 'textarea', required: false },
        { key: 'next_steps', label: 'Next Steps', placeholder: 'Agreed action steps and client commitments…', type: 'textarea', required: false },
        { key: 'theme', label: 'Theme', placeholder: 'Overarching therapeutic theme of the session…', type: 'textarea', required: false },
      ],
    },
    // ── Faith-integrated formats ───────────────────────────────────────────
    {
      slug: 'soap-faith',
      name: 'SOAP Note — Faith Integrated',
      category: 'faith_integrated',
      is_default: 0,
      structure: [
        { key: 'subjective', label: 'Subjective', placeholder: 'Client\'s reported experience, including spiritual concerns or questions…', type: 'textarea', required: false },
        { key: 'spiritual_subjective', label: 'Spiritual Subjective', placeholder: 'Client\'s spiritual experience, prayer life, faith struggles or growth…', type: 'textarea', required: false, faithOnly: true },
        { key: 'objective', label: 'Objective', placeholder: 'Clinician\'s observable data: affect, behavior, MSE findings…', type: 'textarea', required: false },
        { key: 'assessment', label: 'Assessment', placeholder: 'Clinical interpretation and diagnostic impressions…', type: 'textarea', required: false },
        { key: 'scripture_applied', label: 'Scripture Applied', placeholder: 'Scripture reference and how it was integrated therapeutically…', type: 'textarea', required: false, faithOnly: true },
        { key: 'plan', label: 'Plan', placeholder: 'Treatment plan including faith-integrated homework and practices…', type: 'textarea', required: false },
      ],
    },
    {
      slug: 'dap-faith',
      name: 'DAP Note — Faith Integrated',
      category: 'faith_integrated',
      is_default: 0,
      structure: [
        { key: 'data', label: 'Data', placeholder: 'Data gathered this session including spiritual themes…', type: 'textarea', required: false },
        { key: 'assessment', label: 'Assessment', placeholder: 'Clinical interpretation, including theological assessment where relevant…', type: 'textarea', required: false },
        { key: 'theological_assessment', label: 'Theological Assessment', placeholder: 'Faith-lens observations: spiritual barriers, theological distortions, resources…', type: 'textarea', required: false, faithOnly: true },
        { key: 'plan', label: 'Plan', placeholder: 'Plan including faith-based practices, Scripture, spiritual disciplines…', type: 'textarea', required: false },
      ],
    },
    {
      slug: 'spiritual-formation',
      name: 'Spiritual Formation Note',
      category: 'faith_integrated',
      is_default: 0,
      structure: [
        { key: 'prayer_life', label: 'Prayer Life', placeholder: 'Current prayer practices, consistency, quality of communion with God…', type: 'textarea', required: false, faithOnly: true },
        { key: 'scripture_engagement', label: 'Scripture Engagement', placeholder: 'Bible reading, study habits, verses explored this session…', type: 'textarea', required: false, faithOnly: true },
        { key: 'spiritual_barriers', label: 'Spiritual Barriers', placeholder: 'Obstacles to faith growth, doubts, past wounds, spiritual dry seasons…', type: 'textarea', required: false, faithOnly: true },
        { key: 'spiritual_goals', label: 'Spiritual Goals', placeholder: 'Growth goals agreed upon, spiritual disciplines to practice…', type: 'textarea', required: false, faithOnly: true },
        { key: 'pastoral_notes', label: 'Pastoral Notes', placeholder: 'Pastoral observations, referral to pastoral care, church community involvement…', type: 'textarea', required: false, faithOnly: true },
      ],
    },
    // ── Specialty formats ──────────────────────────────────────────────────
    {
      slug: 'emdr',
      name: 'EMDR Session Note',
      category: 'specialty',
      is_default: 0,
      structure: [
        { key: 'target_image', label: 'Target Image / Memory', placeholder: 'Target memory or image addressed this session…', type: 'textarea', required: false },
        { key: 'negative_cognition', label: 'Negative Cognition (NC)', placeholder: 'e.g. "I am not safe" / "I am powerless"', type: 'text', required: false },
        { key: 'positive_cognition', label: 'Positive Cognition (PC)', placeholder: 'e.g. "I am safe now" / "I have choices"', type: 'text', required: false },
        { key: 'suds_score', label: 'SUDS Score (0–10)', placeholder: 'Starting and ending distress level…', type: 'text', required: false },
        { key: 'voc_score', label: 'VOC Score (1–7)', placeholder: 'Validity of Cognition rating…', type: 'text', required: false },
        { key: 'phase_reached', label: 'Phase Reached', placeholder: 'e.g. Phase 3 (Assessment), Phase 4 (Desensitization), Phase 5 (Installation)…', type: 'text', required: false },
        { key: 'session_notes', label: 'Session Notes', placeholder: 'Client response, blocks encountered, positive experiences, next session target…', type: 'textarea', required: false },
      ],
    },
    // ── Crisis / Safety ────────────────────────────────────────────────────
    {
      slug: 'crisis-safety',
      name: 'Crisis / Safety Note',
      category: 'crisis',
      is_default: 0,
      structure: [
        { key: 'si_assessment', label: 'Suicidal Ideation Assessment', placeholder: 'Ideation, intent, plan, means, timeline, protective factors…', type: 'textarea', required: false, required_for_lock: true },
        { key: 'hi_assessment', label: 'Homicidal Ideation Assessment', placeholder: 'Ideation, target, intent, plan, means, Tarasoff duty assessment…', type: 'textarea', required: false, required_for_lock: true },
        { key: 'safety_plan_status', label: 'Safety Plan Status', placeholder: 'Active safety plan reviewed, updated, or created this session…', type: 'textarea', required: false },
        { key: 'hospitalization_triggers', label: 'Hospitalization Triggers / Outcome', placeholder: 'Criteria for voluntary / involuntary hospitalization; outcome of evaluation…', type: 'textarea', required: false },
        { key: 'crisis_intervention', label: 'Crisis Intervention', placeholder: 'Interventions applied: grounding, coping skills, de-escalation, faith resources…', type: 'textarea', required: false },
        { key: 'follow_up_plan', label: 'Follow-Up Plan', placeholder: 'Between-session contacts, emergency contacts, next appointment…', type: 'textarea', required: false },
      ],
    },
    // ── Group therapy ──────────────────────────────────────────────────────
    {
      slug: 'group-therapy',
      name: 'Group Therapy Note',
      category: 'specialty',
      is_default: 0,
      structure: [
        { key: 'group_dynamics', label: 'Group Dynamics', placeholder: 'Overall group cohesion, safety, themes, conflict, or breakthroughs…', type: 'textarea', required: false },
        { key: 'individual_participation', label: 'Individual Participation', placeholder: 'This client\'s participation, disclosure level, engagement…', type: 'textarea', required: false },
        { key: 'peer_interactions', label: 'Peer Interactions', placeholder: 'Notable peer interactions, support given/received, boundary observations…', type: 'textarea', required: false },
        { key: 'group_theme', label: 'Group Theme / Topic', placeholder: 'Central theme or psychoeducation topic for this session…', type: 'textarea', required: false },
        { key: 'individual_response', label: 'Individual Clinical Response', placeholder: 'This client\'s clinical response, affect, and progress toward treatment goals…', type: 'textarea', required: false },
      ],
    },
  ];

  for (const tmpl of templates) {
    const id = uuidv4();
    await conn.query(
      `INSERT IGNORE INTO clinical_note_templates (id, name, slug, category, structure_json, is_default)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, tmpl.name, tmpl.slug, tmpl.category, JSON.stringify(tmpl.structure), tmpl.is_default],
    );
  }
  console.log(`  + seeded ${templates.length} system clinical note templates (INSERT IGNORE — safe to re-run)`);
}
