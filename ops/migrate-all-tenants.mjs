#!/usr/bin/env node
/**
 * ops/migrate-all-tenants.mjs
 *
 * Runs apps/api/src/db/migrate.js against every active tenant DB.
 * Reads tenant DB credentials from TENANT_DB_MAP (JSON env var).
 *
 * Usage:
 *   TENANT_DB_MAP='{"grace-counsel":{"host":"...","port":3306,...},...}' \
 *   DB_ENCRYPTION_KEY=<hex> \
 *   node ops/migrate-all-tenants.mjs
 *
 * Options:
 *   --dry-run     Print which tenants would be migrated without running anything
 *   --tenant=<id> Migrate only the specified tenant
 *   --concurrency=<n>  Max parallel migrations (default: 3)
 *
 * Exit code is 1 if any tenant migration fails.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrateScript = path.join(repoRoot, 'apps/api/src/db/migrate.js');

// ─── Argument parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyTenant = args.find((a) => a.startsWith('--tenant='))?.split('=')[1];
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='))?.split('=')[1];
const CONCURRENCY = Math.max(1, Number(concurrencyArg ?? 3));

// ─── Tenant config resolution ─────────────────────────────────────────────────

function parseTenantDbMap() {
  const raw = process.env.TENANT_DB_MAP;
  if (!raw) {
    console.error('TENANT_DB_MAP is not set. Export a JSON map of tenantId → DB credentials.');
    process.exit(1);
  }
  try {
    const map = JSON.parse(raw);
    if (!map || typeof map !== 'object') throw new Error('Not an object');
    return map;
  } catch (err) {
    console.error('Failed to parse TENANT_DB_MAP:', err.message);
    process.exit(1);
  }
}

// ─── Migration runner ─────────────────────────────────────────────────────────

async function migrateOne(tenantId, config) {
  const env = {
    ...process.env,
    DB_HOST:     String(config.host     ?? '127.0.0.1'),
    DB_PORT:     String(config.port     ?? 3306),
    DB_NAME:     String(config.database ?? config.db ?? ''),
    DB_USER:     String(config.user     ?? ''),
    DB_PASSWORD: String(config.password ?? ''),
    DB_SSL:      String(config.ssl      ?? 'false'),
    NODE_ENV:              'production',
    SEED_DEV_PORTAL_DATA:  'false',
  };

  const { stdout, stderr } = await exec('node', [migrateScript], {
    env,
    cwd: repoRoot,
    timeout: 120_000,
  });

  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

// ─── Concurrency helper ───────────────────────────────────────────────────────

async function runWithConcurrency(tasks, limit) {
  const results = [];
  const queue = [...tasks];

  async function worker() {
    while (queue.length > 0) {
      const task = queue.shift();
      results.push(await task());
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const tenantMap = parseTenantDbMap();
let entries = Object.entries(tenantMap);

if (onlyTenant) {
  entries = entries.filter(([id]) => id === onlyTenant);
  if (entries.length === 0) {
    console.error(`Tenant "${onlyTenant}" not found in TENANT_DB_MAP.`);
    process.exit(1);
  }
}

console.log(`Tenants to migrate: ${entries.map(([id]) => id).join(', ')}`);

if (dryRun) {
  console.log('--dry-run: no migrations executed.');
  process.exit(0);
}

console.log(`Running with concurrency=${CONCURRENCY}\n`);

const tasks = entries.map(([tenantId, config]) => async () => {
  const start = Date.now();
  try {
    const { stdout, stderr } = await migrateOne(tenantId, config);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✓ [${tenantId}] (${elapsed}s)`);
    if (stdout) console.log(`  ${stdout.replace(/\n/g, '\n  ')}`);
    if (stderr) console.warn(`  stderr: ${stderr.replace(/\n/g, '\n  ')}`);
    return { tenantId, ok: true };
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`✗ [${tenantId}] FAILED (${elapsed}s): ${err.message}`);
    return { tenantId, ok: false, error: err.message };
  }
});

const results = await runWithConcurrency(tasks, CONCURRENCY);
const failures = results.filter((r) => !r.ok);

console.log(`\nDone. ${results.length - failures.length}/${results.length} tenants migrated successfully.`);

if (failures.length > 0) {
  console.error('Failed tenants:');
  for (const { tenantId, error } of failures) {
    console.error(`  ${tenantId}: ${error}`);
  }
  process.exit(1);
}
