# Security Run 2026-03-28

**Run Date:** 2026-03-28
**Timezone:** America/New_York
**Agent:** Security Compliance Guardian
**Repository Baseline:** `main`
**Status:** remediated and validated

## Scope

This run covered:

- authentication and session handling
- RBAC and tenant-boundary enforcement
- public portal intake safety
- monitoring and telemetry access boundaries
- audit ledger contract alignment with the canonical security plan
- database storage of sensitive email identifiers

## Confirmed Findings

### 2026-03-28 FND-001

- Severity: High
- Category: multi-tenant data integrity / workflow tampering
- Route: `POST /v1/portal/public-requests`
- Finding: unauthenticated callers could choose both `tenantId` and `status` in the request body, allowing public submissions to be written into an arbitrary tenant and to appear in an internally advanced state such as `approved`.
- Impact: cross-tenant intake pollution, queue tampering, and incorrect workflow state.

### 2026-03-28 FND-002

- Severity: Medium
- Category: operational information disclosure
- Route: `GET /v1/monitoring/db`
- Finding: live database diagnostics were reachable without authentication.
- Impact: exposure of operational metadata to unauthenticated callers.

### 2026-03-28 FND-003

- Severity: Medium
- Category: operational information disclosure
- Route: `GET /v1/telemetry/summary`
- Finding: canonical monitoring summary data was reachable without authentication.
- Impact: disclosure of runtime health and traffic characteristics to unauthenticated callers.

### 2026-03-28 FND-004

- Severity: High
- Category: audit compliance gap
- Files:
  - `apps/api/src/db/schema.sql`
  - `apps/api/src/index.js`
- Finding: the DB-backed audit ledger did not persist the full canonical contract required by `PLANS/FULL-SECURITY-AND-AUDITING.md`. Missing persisted fields included `actorType`, `result`, `reasonCode`, `sourceSurface`, `sourceWorkflow`, and `systemComponent`.
- Impact: incomplete forensic and compliance evidence in DB mode.

### 2026-03-28 FND-005

- Severity: High
- Category: sensitive data at rest
- Files:
  - `apps/api/src/db/schema.sql`
  - `apps/api/src/lib/auth.js`
  - `apps/api/src/db/queries/platform.js`
- Finding: staff login email and tenant-provisioning owner email were stored in plaintext columns.
- Impact: stricter HIPAA/GDPR-oriented engineering posture was not met for these identifiers at rest.

## Remediation Completed

- Public portal registration requests now ignore caller-supplied tenant selection and force unauthenticated requests into the server-selected public tenant with `requested` status.
- `/v1/monitoring/db` now requires an authenticated admin role.
- `/v1/telemetry/summary` now requires an authenticated admin role.
- Audit events now persist the canonical DB fields:
  - `actor_type`
  - `result`
  - `reason_code`
  - `source_surface`
  - `source_workflow`
  - `system_component`
- Audit intelligence queries now use the persisted audit contract instead of inferring result semantics only from action names.
- Staff account emails are now stored as:
  - encrypted `email_enc`
  - deterministic HMAC lookup field `email_lookup_hash`
  - legacy plaintext `email` nulled during migration
- Tenant-provisioning owner email is now stored as encrypted `owner_email_enc`, with the legacy plaintext column nulled during migration.
- API startup now runs the DB migration path before starting, so the updated schema is applied consistently in local and test runs.

## Validation

Commands executed during and after remediation:

```bash
node --env-file=.env apps/api/src/db/migrate.js
API_BASE_URL=http://127.0.0.1:3104 pnpm test:security
```

Manual exploit reruns confirmed:

- unauthenticated public portal intake no longer writes into attacker-selected tenant
- unauthenticated public portal intake no longer accepts attacker-selected internal status
- unauthenticated `/v1/monitoring/db` returns `401`
- unauthenticated `/v1/telemetry/summary` returns `401`
- authenticated practice admin still receives `200` on both admin monitoring endpoints

## Proposals

These are forward hardening proposals, not unresolved confirmed defects from this run:

1. Enforce MFA for `platform_admin` and `practice_owner` accounts once the product has a real MFA flow instead of a stored flag.
2. Add a dedicated rotation workflow for encrypted-at-rest lookup keys so `email_lookup_hash` and field encryption can be rekeyed with a documented rollout.
3. Add explicit audit events for denied access to monitoring and telemetry endpoints so investigation views can separate successful reads from blocked probes.
4. Add a small security-focused smoke suite for production-mode cookie/session behavior instead of relying mainly on development header fallbacks.

## Outcome

All confirmed findings from this run were fixed in code and schema handling, then revalidated against the patched API.
