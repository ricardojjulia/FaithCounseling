# Backup & Recovery Runbook — ChurchCore Care

**Date:** April 24, 2026
**Status:** Required before launch (HIPAA §164.308(a)(7))
**Scope:** All Cloud SQL MySQL instances (platform DB + per-tenant practice DBs)

---

## Overview

ChurchCore Care stores PHI in isolated Cloud SQL MySQL instances — one per practice. This runbook documents the backup configuration, retention policy, RTO/RPO targets, and per-tenant restore procedure.

**RTO (Recovery Time Objective):** 4 hours — a single practice database must be restorable within 4 hours of a declared incident.

**RPO (Recovery Point Objective):** 1 hour — maximum acceptable data loss is 1 hour of transactions. Achieved via point-in-time recovery (PITR) with binary logging.

---

## Backup Configuration

Every Cloud SQL instance (platform DB and all tenant DBs) must be provisioned with the following settings. These must be applied via Terraform/IaC so new tenant instances inherit them automatically.

### Automated Backups

```bash
gcloud sql instances patch <INSTANCE_NAME> \
  --backup-start-time=02:00 \
  --retained-backups-count=35 \
  --retained-transaction-log-days=7
```

| Setting | Value | Reason |
| --- | --- | --- |
| `--backup-start-time` | `02:00` (UTC) | Low-traffic window |
| `--retained-backups-count` | `35` | 35 daily snapshots (~5 weeks) |
| `--retained-transaction-log-days` | `7` | Enables PITR up to 7 days back |

### Point-in-Time Recovery (PITR)

PITR requires binary logging to be enabled. Verify per instance:

```bash
gcloud sql instances describe <INSTANCE_NAME> \
  --format="value(settings.backupConfiguration.binaryLogEnabled)"
# Must return: True
```

If `False`, enable it:

```bash
gcloud sql instances patch <INSTANCE_NAME> --enable-bin-log
```

**Note:** Enabling binary logging on a running instance requires a restart. Schedule during a maintenance window and notify the affected practice admin.

---

## Verifying Backup Status

Run `ops/verify-backups.mjs` to check backup status across all tenant instances:

```bash
TENANT_INSTANCE_MAP='{"grace-counsel":"churchcore-db-grace-counsel",...}' \
node ops/verify-backups.mjs
```

Or check a single instance manually:

```bash
gcloud sql backups list \
  --instance=<INSTANCE_NAME> \
  --filter="status=SUCCESSFUL" \
  --sort-by="~startTime" \
  --limit=5
```

A healthy instance should show a `SUCCESSFUL` backup within the last 26 hours.

---

## Per-Tenant Restore Procedure

Follow this procedure to restore a single practice database without affecting other tenants.

### Step 1 — Identify the restore target

```bash
# List available backups for the instance
gcloud sql backups list --instance=<INSTANCE_NAME> --sort-by="~startTime"

# Note the backup ID (e.g. 1234567890) or choose a PITR timestamp
```

### Step 2 — Create a clone (non-destructive, recommended first)

Before overwriting the live instance, restore to a clone and verify data integrity.

```bash
gcloud sql instances clone <INSTANCE_NAME> <INSTANCE_NAME>-restore-clone \
  --point-in-time="2026-04-24T03:00:00.000Z"
# or use --restore-backup-id=<BACKUP_ID> for a full backup restore
```

### Step 3 — Verify the clone

```bash
# Connect to the clone
gcloud sql connect <INSTANCE_NAME>-restore-clone --user=<DB_USER>

# Spot-check critical tables
SELECT COUNT(*) FROM clients WHERE tenant_id = '<TENANT_ID>';
SELECT COUNT(*) FROM appointments WHERE tenant_id = '<TENANT_ID>';
SELECT MAX(created_at) FROM audit_events WHERE tenant_id = '<TENANT_ID>';
```

Confirm row counts are consistent with expectations from before the incident.

### Step 4 — Promote the clone (if verified)

Option A — swap connection string: update the tenant's entry in Secret Manager to point to the clone instance. The pool registry picks it up on next request. Zero downtime.

```bash
gcloud secrets versions add practice/<SLUG>/db-credentials \
  --data-file=<new_credentials.json>
```

Option B — restore in-place (destructive):

```bash
gcloud sql instances restore-backup <INSTANCE_NAME> \
  --backup-id=<BACKUP_ID>
# WARNING: this overwrites all data on the live instance since the backup point.
# Only use if clone verification confirmed the backup is correct.
```

### Step 5 — Run schema migrations on the restored instance

After a restore, run migrations to ensure the schema is current (the backup may predate recent schema changes):

```bash
DB_HOST=<restored_host> DB_PORT=3306 DB_NAME=<db_name> \
DB_USER=<user> DB_PASSWORD=<password> DB_SSL=true \
NODE_ENV=production SEED_DEV_PORTAL_DATA=false \
node apps/api/src/db/migrate.js
```

### Step 6 — Delete the clone when no longer needed

```bash
gcloud sql instances delete <INSTANCE_NAME>-restore-clone
```

Cloud SQL instances incur cost while running. Delete the clone within 24 hours of incident resolution.

---

## Platform DB Restore

The platform DB (`churchcore-db`) holds the tenant registry, slugs, provisioning records, and billing state. It does not hold PHI. Restore follows the same procedure as above. After restoring the platform DB, verify:

```bash
SELECT requested_tenant_id, status FROM tenant_provisioning WHERE status = 'active';
```

All active tenants should appear. If rows are missing (restore predates a provisioning), re-provision or manually re-insert the missing rows from ops logs.

---

## Backup Monitoring & Alerting

Configure a Cloud Monitoring alert to page on-call if any instance goes 26+ hours without a successful backup:

```bash
# Create alert policy via gcloud or Terraform
gcloud alpha monitoring policies create \
  --notification-channels=<CHANNEL_ID> \
  --display-name="Cloud SQL backup age > 26h" \
  --condition-display-name="No recent successful backup" \
  --condition-filter='resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/backup/last_successful_backup_age" AND metric.label.database_id!="platform"' \
  --condition-threshold-value=93600 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-duration=300s
```

---

## Annual Restore Test

HIPAA requires that backup and recovery procedures be tested. Schedule a restore test at minimum once per year (or after any major schema change):

1. Pick a non-production tenant instance (or create a test clone)
2. Follow the restore procedure above using a backup from 7+ days ago
3. Verify row counts match audit logs from that date
4. Document the test, the tester, and the outcome in the ops log
5. If restore fails, open a P0 incident immediately

**Last tested:** Not yet (pre-launch)
**Next test due:** Before first practice goes live

---

## HIPAA Audit Requirements

- Backup logs must be retained for 6 years (Cloud Logging → Log Bucket with 6-year retention)
- Restore operations must be logged: Cloud SQL audit logs capture all admin actions automatically
- Every restore must be documented in an incident report, including what data was affected, the cause, and corrective actions taken

---

## References

- `ops/verify-backups.mjs` — automated backup status check across all tenant instances
- `ops/migrate-all-tenants.mjs` — run schema migrations after a restore
- `docs/cloud-implementation.md` — Cloud SQL instance provisioning
- [Cloud SQL PITR docs](https://cloud.google.com/sql/docs/mysql/backup-recovery/pitr)
- [Cloud SQL clone docs](https://cloud.google.com/sql/docs/mysql/clone-instance)
