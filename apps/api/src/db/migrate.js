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
} finally {
  await connection.end();
}

async function applyColumnMigrations(conn) {
  const dbName = process.env.DB_NAME;

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
    }
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
    }
  }

  console.log('Applying column migrations…');
  await addColumnIfMissing('clients', 'primary_counselor_id', 'VARCHAR(64) NULL');
  await addIndexIfMissing('clients', 'idx_clients_counselor', '(primary_counselor_id)');

  // Appointments: rename scheduled_at → starts_at, add ends_at / location_name / timezone
  await addColumnIfMissing('appointments', 'counselor_id', 'VARCHAR(64) NULL AFTER client_id');
  await addColumnIfMissing('appointments', 'starts_at',     'TIMESTAMP NULL AFTER status');
  await addColumnIfMissing('appointments', 'ends_at',       'TIMESTAMP NULL AFTER starts_at');
  await addColumnIfMissing('appointments', 'location_name', 'VARCHAR(200) NULL AFTER ends_at');
  await addColumnIfMissing('appointments', 'timezone',      'VARCHAR(64) NULL AFTER location_name');
  await addIndexIfMissing('appointments', 'idx_appointments_counselor', '(tenant_id, counselor_id)');
  await addIndexIfMissing('appointments', 'idx_appointments_starts_at', '(tenant_id, starts_at)');

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
  try {
    const mod = await import('../lib/encrypt.js');
    encrypt = mod.encrypt;
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
       (id, staff_member_id, tenant_id, email, password_hash)
     VALUES (?, ?, ?, ?, ?)`,
    ['acct-001', 'staff-001', 'system', 'admin@faithcounseling.local', passwordHash],
  );

  console.log('Dev seed complete.');
  console.log('  Tenant:   system');
  console.log('  Email:    admin@faithcounseling.local');
  console.log('  Password: ChangeMe!Dev2024#  (change immediately)');
}
