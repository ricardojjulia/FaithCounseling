# Database Implementation Guide

MySQL persistence layer for the FaithCounseling API — covering schema, encryption, authentication, and how to activate DB mode.

## Overview

The API ships with a **dual-mode data layer**. When the `DB_NAME` environment variable is set, every handler routes through parameterized MySQL queries with PHI field-level encryption. When `DB_NAME` is absent, the API falls back to the original in-memory JavaScript arrays, so local development and tests continue to work without a database.

```text
DB_NAME set   →  MySQL path    (persistent, encrypted, session-authenticated)
DB_NAME unset →  In-memory path (ephemeral, no encryption, header-based auth)
```

---

## Environment Variables

Add these to your `.env` file (see `.env.example` for a template):

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=faith_counseling
DB_USER=faith_app
DB_PASSWORD=changeme-strong-password
DB_SSL=false
DB_ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
SEED_DEV_PORTAL_DATA=true
```

`DB_ENCRYPTION_KEY` must be a 64-character hex string (32 bytes). Keep it secret — it is the AES-256-GCM key for all PHI columns.

`SEED_DEV_PORTAL_DATA` is optional. Leave it as `true` to keep the seeded local portal client/resource, or set it to `false` to keep the local database staff-only across repeated migrations and `pnpm start` runs.

---

## First-Time Setup (Docker — recommended for local dev)

The repo ships with a `docker-compose.yml` at the root that starts a MySQL 8 container with the correct user, database, and a persistent named volume.

### 1. Start the database

```bash
docker compose up -d
```

The container is named `faith-mysql` and exposes MySQL on `127.0.0.1:3306`. Data is persisted in the `faith_mysql_data` Docker volume and survives container restarts.

### 2. Copy and configure `.env`

```bash
cp .env.example .env
# Edit .env and fill in:
#   DB_PASSWORD=<your faith_app password>
#   DB_ENCRYPTION_KEY=$(openssl rand -hex 32)
#   SESSION_SECRET=$(openssl rand -base64 32)
#   SEED_DEV_PORTAL_DATA=false   # optional; keeps local DB staff-only
```

### 3. Run the migration

```bash
node --env-file=.env apps/api/src/db/migrate.js
```

This executes `apps/api/src/db/schema.sql` against the configured database and creates all 43 tables. It is safe to run multiple times (`CREATE TABLE IF NOT EXISTS`). On first run it seeds a dev admin account, and optionally seeds the local portal client/resource when `SEED_DEV_PORTAL_DATA` is not `false`:

```text
Email:    admin@faithcounseling.local
Password: ChangeMe!Dev2024#   ← change immediately
```

### 4. Start the API

```bash
npx pnpm@10.7.0 --filter @faith/api start
```

The `start` script in `apps/api/package.json` includes `--env-file=../../.env`, so `.env` is loaded automatically. With `DB_NAME` set the API connects to MySQL on startup and logs `Database connection verified.`

### 5. Verify login

```bash
curl -s -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@faithcounseling.local","password":"ChangeMe!Dev2024#"}'
```

Expected response:

```json
{
  "profile": {
    "staffId": "staff-001",
    "tenantId": "system",
    "role": "practice_admin",
    "name": "Admin User"
  }
}
```

### Demo Dataset SQL Workflow

To generate committed SQL artifacts for the canonical demo dataset:

```bash
pnpm demo:sql:generate
```

This writes:

- `ops/demo-dataset/generated/demo-dataset.reset.sql`
- `ops/demo-dataset/generated/demo-dataset.seed.sql`
- `ops/demo-dataset/generated/demo-dataset.apply.sql`
- `ops/demo-dataset/generated/demo-dataset.meta.json`

To apply the generated SQL into the configured local MySQL database and then run the canonical demo-data verification:

```bash
pnpm demo:sql:apply
```

To regenerate and apply in one step:

```bash
pnpm demo:sql:refresh
```

---

## Manual Setup (without Docker)

### 1. Create the database and user

```sql
CREATE DATABASE faith_counseling CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'faith_app'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON faith_counseling.* TO 'faith_app'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Run the migration

```bash
node --env-file=.env apps/api/src/db/migrate.js
```

### 3. Start the API

```bash
npx pnpm@10.7.0 --filter @faith/api start
```

---

## Architecture

### Connection Pool

`apps/api/src/db/pool.js` — singleton `mysql2/promise` pool shared across all requests.

```text
connectionLimit: 10
timezone: 'Z'  (UTC)
SSL: controlled by DB_SSL env var
```

### Query Helpers

Domain-specific modules under `apps/api/src/db/queries/`:

| File | Domain | Key tables |
| --- | --- | --- |
| `clients.js` | Client records | `clients` |
| `clinical.js` | Chart data | `client_lifecycles`, `consent_records`, `intake_packets`, `treatment_plans`, `progress_notes`, `inventory_definitions`, `inventory_assignments` |
| `appointments.js` | Scheduling | `appointments`, `appointment_reminders`, `waitlist_entries` |
| `billing.js` | Financials | `service_codes`, `fee_schedules`, `invoices`, `payments`, `superbills`, `claim_placeholders` |
| `documents.js` | Forms & docs | `document_templates`, `document_assignments` |
| `portal.js` | Client portal | `portal_accounts`, `portal_messages`, `portal_message_threads`, `portal_resources`, `portal_appointment_requests` |
| `staff.js` | Staff & locations | `staff_members`, `staff_accounts`, `practices`, `locations`, `availability_templates` |
| `faith.js` | Faith integration | `faith_note_templates`, `faith_goal_templates`, `faith_consent_variants`, `faith_resources`, `faith_inventories`, `faith_church_referrals`, `faith_language_preferences` |
| `platform.js` | Platform admin | `tenant_provisioning_requests`, `support_impersonation_sessions`, `data_export_jobs`, `retention_policies` |

All queries use parameterized form (`pool.query('... WHERE id = ?', [id])`) — no string interpolation.

### PHI Encryption

`apps/api/src/lib/encrypt.js` — AES-256-GCM field-level encryption.

**Columns encrypted at rest** (column name suffix `_enc`):

| Table | Encrypted columns |
| --- | --- |
| `clients` | `first_name_enc`, `last_name_enc` |
| `client_lifecycles` | `emergency_contact_enc` (JSON blob) |
| `staff_members` | `first_name_enc`, `last_name_enc`, `license_number_enc`, `bio_enc` |
| `locations` | `address_enc` |
| `progress_notes` | `summary_enc`, `interventions_enc` |
| `treatment_plans` | `goals_enc`, `interventions_enc` |
| `inventory_assignments` | `responses_enc` |
| `appointments` | `client_name_enc`, `counselor_name_enc` |
| `invoices` | `insurance_info_enc` (JSON blob) |
| `portal_accounts` | `email_enc` |
| `portal_messages` | `content_enc` |

Non-PHI fields (IDs, statuses, timestamps, codes) remain plaintext for SQL indexing and filtering.

**Encryption format:** `base64(iv):base64(authTag):base64(ciphertext)` stored in `TEXT` columns.

### Session Authentication

`apps/api/src/lib/auth.js` — cookie-based sessions stored in the `sessions` table.

- Login: `POST /v1/auth/login` → sets `session` HttpOnly cookie
- Token stored as SHA-256 hash in DB; plaintext token only travels over the wire
- Idle timeout: `last_active_at` updated on each request; sessions expire after 8 hours
- Account lockout: 10 consecutive failures locks the account

In development (no `DB_NAME`), the API falls back to reading `x-staff-role` and `x-tenant-id` request headers for identity — matching the legacy test harness behavior.

---

## Schema Reference

Full DDL: `apps/api/src/db/schema.sql`

### Core tables

```text
tenants                    — top-level tenant accounts
practices                  — practices within a tenant
locations                  — physical/virtual locations
staff_members              — counselor and admin records (PHI encrypted)
staff_accounts             — login credentials + lockout state
sessions                   — active session tokens (hashed)
clients                    — client records (PHI encrypted)
audit_events               — immutable audit trail
```

### Clinical tables

```text
client_lifecycles          — case status, referral source, emergency contact
consent_records            — consent types and signature states
intake_packets             — intake form assignments
treatment_plans            — goals and interventions (encrypted)
progress_notes             — session notes (encrypted)
inventory_definitions      — assessment instrument definitions
inventory_assignments      — client assessment submissions
```

### Scheduling tables

```text
appointments               — scheduled sessions (PHI encrypted names)
appointment_reminders      — reminder delivery records
waitlist_entries           — waitlist metadata
availability_templates     — staff weekly availability blocks
```

### Billing tables

```text
service_codes              — CPT/procedure codes
fee_schedules              — rate tables per payer/service
invoices                   — invoices with line items (insurance info encrypted)
payments                   — payment records
superbills                 — superbill documents
claim_placeholders         — insurance claim tracking
```

### Document tables

```text
document_templates         — form/consent template definitions
document_assignments       — assignments to clients or staff
```

### Portal tables

```text
portal_accounts            — client portal login accounts (email encrypted)
portal_message_threads     — secure messaging threads
portal_messages            — individual messages (content encrypted)
portal_resources           — educational resources shared with clients
portal_appointment_requests — appointment requests from portal
```

### Faith integration tables

```text
faith_note_templates       — faith-aware progress note templates
faith_goal_templates       — faith-integrated treatment goal templates
faith_consent_variants     — faith-specific consent language
faith_resources            — scripture and prayer resources
faith_inventories          — spiritual assessment instruments
faith_church_referrals     — church coordination records
faith_language_preferences — per-tenant faith language settings
```

### Platform tables

```text
tenant_provisioning_requests   — new tenant onboarding requests
support_impersonation_sessions — platform admin impersonation log
data_export_jobs               — data export job queue
retention_policies             — per-tenant data retention schedules
```

---

## Key Rotation

To rotate the encryption key:

1. Generate a new key: `openssl rand -hex 32`
2. Write a migration script that:
   - Reads each encrypted row using the old key (`OLD_DB_ENCRYPTION_KEY`)
   - Re-encrypts with the new key (`DB_ENCRYPTION_KEY`)
   - Writes back in a transaction
3. Deploy the new key with zero downtime by supporting both keys during the transition window

A runbook template is planned for `ops/runbooks/key-rotation.md`.

---

## Audit Events

All mutations write a row to `audit_events`:

```text
id, tenant_id, actor_id, actor_role, action, target_type, target_id, occurred_at, request_id
```

When `DB_NAME` is not set, audit events are console-logged only. With `DB_NAME` set, they are persisted to the table AND console-logged.

---

## Known Issues Fixed (v1.2.0)

### `start` script missing `--env-file`

**File:** `apps/api/package.json`

Previously `"start": "node src/index.js"` launched the API without loading `.env`, causing the DB connection to use empty credentials and fall back silently to in-memory mode even when a database was configured.

**Fix:** `"start": "node --env-file=../../.env src/index.js"`

### Login `Column 'role' cannot be null`

**File:** `apps/api/src/lib/auth.js`

The `login()` query selected `sa.*` (all `staff_accounts` columns) but `role` lives on `staff_members`. The `sessions` INSERT uses `account.role`, so it received `undefined` and MySQL rejected the row with a NOT NULL constraint error.

**Fix:** Added `sm.role` to the SELECT:

```sql
SELECT sa.*, sm.role, sm.first_name_enc, sm.last_name_enc
FROM staff_accounts sa
JOIN staff_members sm ON sm.id = sa.staff_member_id
WHERE sa.email = ?
```

---

## Pending Work

- **Portal handlers** — `handlePortalOverview`, `handlePortalAccounts`, `handlePortalMessages`, and related handlers need a DB-aware `resolvePortalClient` helper before their DB paths can be wired.
- **`handleClaimPlaceholders`** — cross-references invoices; to be completed alongside portal.
- **`handleWaitlist`** — complex join of client status + waitlist metadata; needs a dedicated `waitlist_entries` query helper.
- **Real login UI** — `AuthGate.jsx` still uses the role dropdown in development; the production login form (`email + password`) is planned for the next sprint.
- **CSRF protection** — `X-CSRF-Token` header validation planned for `apps/web/server.js`.
