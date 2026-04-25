#!/usr/bin/env node
/**
 * ops/verify-backups.mjs
 *
 * Checks that every tenant Cloud SQL instance has a successful backup
 * within the last 26 hours. Exits with code 1 if any instance is stale
 * or unreachable — suitable for use in CI or a nightly cron alert.
 *
 * Usage:
 *   TENANT_INSTANCE_MAP='{"grace-counsel":"churchcore-db-grace-counsel","riverview":"churchcore-db-riverview"}' \
 *   PLATFORM_INSTANCE=churchcore-db \
 *   node ops/verify-backups.mjs
 *
 * Requires: gcloud CLI authenticated with an account that has
 *   roles/cloudsql.viewer on all instances.
 *
 * Options:
 *   --max-age-hours=<n>   Alert threshold in hours (default: 26)
 *   --project=<id>        GCP project ID (default: reads from gcloud config)
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

// ─── Argument parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const maxAgeArg = args.find((a) => a.startsWith('--max-age-hours='))?.split('=')[1];
const projectArg = args.find((a) => a.startsWith('--project='))?.split('=')[1];

const MAX_AGE_MS = Number(maxAgeArg ?? 26) * 60 * 60 * 1000;

// ─── Instance resolution ──────────────────────────────────────────────────────

function resolveInstances() {
  const instances = [];

  const platformInstance = process.env.PLATFORM_INSTANCE;
  if (platformInstance) {
    instances.push({ label: 'platform', instance: platformInstance });
  }

  const raw = process.env.TENANT_INSTANCE_MAP;
  if (raw) {
    try {
      const map = JSON.parse(raw);
      for (const [tenantId, instanceName] of Object.entries(map)) {
        instances.push({ label: tenantId, instance: instanceName });
      }
    } catch {
      console.error('Failed to parse TENANT_INSTANCE_MAP — must be valid JSON');
      process.exit(1);
    }
  }

  if (instances.length === 0) {
    console.error('No instances configured. Set PLATFORM_INSTANCE and/or TENANT_INSTANCE_MAP.');
    process.exit(1);
  }

  return instances;
}

// ─── Backup check ─────────────────────────────────────────────────────────────

async function getLatestSuccessfulBackup(instanceName, project) {
  const gcloudArgs = [
    'sql', 'backups', 'list',
    `--instance=${instanceName}`,
    '--filter=status=SUCCESSFUL',
    '--sort-by=~startTime',
    '--limit=1',
    '--format=json',
  ];
  if (project) gcloudArgs.push(`--project=${project}`);

  const { stdout } = await exec('gcloud', gcloudArgs);
  const backups = JSON.parse(stdout || '[]');
  return backups[0] ?? null;
}

async function checkInstance({ label, instance }) {
  try {
    const backup = await getLatestSuccessfulBackup(instance, projectArg);

    if (!backup) {
      return { label, instance, ok: false, reason: 'No successful backups found' };
    }

    const backupTime = new Date(backup.startTime).getTime();
    const ageMs = Date.now() - backupTime;
    const ageHours = (ageMs / (60 * 60 * 1000)).toFixed(1);

    if (ageMs > MAX_AGE_MS) {
      return {
        label, instance, ok: false,
        reason: `Last backup ${ageHours}h ago (threshold: ${MAX_AGE_MS / (60 * 60 * 1000)}h)`,
        backupTime: backup.startTime,
      };
    }

    return { label, instance, ok: true, ageHours, backupTime: backup.startTime };
  } catch (err) {
    return { label, instance, ok: false, reason: `gcloud error: ${err.message}` };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const instances = resolveInstances();
console.log(`Checking ${instances.length} instance(s) (max age: ${MAX_AGE_MS / (60 * 60 * 1000)}h)\n`);

const results = await Promise.all(instances.map(checkInstance));

let allOk = true;
for (const result of results) {
  if (result.ok) {
    console.log(`✓ [${result.label}] ${result.instance} — last backup ${result.ageHours}h ago (${result.backupTime})`);
  } else {
    console.error(`✗ [${result.label}] ${result.instance} — ${result.reason}`);
    allOk = false;
  }
}

console.log('');
if (allOk) {
  console.log(`All ${results.length} instances have recent backups.`);
} else {
  const failed = results.filter((r) => !r.ok).length;
  console.error(`${failed}/${results.length} instances have stale or missing backups.`);
  process.exit(1);
}
