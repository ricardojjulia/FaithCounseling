# Change Log

## v2.1.2 — Monitoring Foundation And OTEL Surface Coverage

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Adds the first full frontend monitoring foundation across visible application surfaces, expands the monitoring dashboard to consume per-surface telemetry, and formalizes the repo governance baseline for monitoring and security/auditing work.

### Governance and planning

- Added implementation record: `docs/MONITORING-AND-GOVERNANCE-FOUNDATION.md`
- Added canonical monitoring enforcement in `AGENTS.md`
- Added canonical security/auditing enforcement in `AGENTS.md`
- Added `PLANS/FULL-SECURITY-AND-AUDITING.md`
- Expanded `PLANS/FULL-SURFACE-MONITORING.md` with audit-intelligence monitoring obligations and audit-vs-telemetry separation rules

### API and telemetry

- Added structured frontend telemetry ingestion: `POST /v1/telemetry/events`
- Extended `GET /v1/telemetry/summary` with `overall`, `frontend`, `surfaces`, and health detail blocks
- Added OTEL-ready UI metric families for screen views, load time, active time, interaction latency, actions, validation failures, empty states, UI errors, and fetch failures
- Kept local monitoring available without OTEL export while preserving optional OTLP export support
- Corrected `exportedViaOtel` behavior so metrics-only OTLP configuration is treated as active export

### Web and monitoring

- Added shared surface registry and frontend telemetry helpers for React and standalone pages
- Instrumented app shell views, detail tabs, scheduling subviews, Workspace Studio tabs, and standalone pages
- Expanded the monitoring dashboard with overall UI summary, failing surface/workflow lists, health probe visibility, OTEL export status, and per-surface breakdown tables

### Breaking changes

None.

## v2.1.1 — AegisTrail Baseline Slice

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Introduces the first implementation slice of the AegisTrail security and auditing initiative: canonical standards, enforcement updates, and a privileged audit intelligence read path.

### Standards and governance

- Added canonical security and auditing standard document: `PLANS/FULL-SECURITY-AND-AUDITING.md`
- Updated `PLANS/FULL-SURFACE-MONITORING.md` to include audit intelligence monitoring obligations
- Updated `AGENTS.md` to require the canonical security plan for security/audit-related work

### API (v2.1.1)

- Added `GET /v1/audit/intelligence`
- Added bounded filters (`days`, `limit`, `action`, `actorRole`, `result`, optional `tenantId` for platform admin)
- Added aggregated summary outputs and recent event list for investigation workflows
- Added in-memory runtime audit event buffer for non-DB mode visibility

### Web (v2.1.1)

- Added **Audit Intelligence** tab in Operations Studio with filter controls, summary output, and recent-event output

### Breaking changes

None.

## v2.1.0 — ScheduleOps

**Date:** March 28, 2026
**Type:** Minor Release

### v2.1.0 Overview

Phase 4 of the scheduling roadmap — availability overrides, recurring appointment series, utilization reporting, and worker reminder lifecycle hardening.

### API

- `GET/POST/PATCH/DELETE /v1/scheduling/availability-overrides` — manage staff availability overrides (PTO, holidays, one-off openings); RBAC-gated to admin and scheduler roles
- `GET/POST/PATCH /v1/scheduling/series` — manage recurring appointment series with recurrence rules, status lifecycle, and counselor/client filters
- `GET /v1/scheduling/utilization` — appointment utilization summary by status, counselor, and location; restricted to `practice_owner`, `practice_admin`, `scheduler_biller`

### Web

- **Availability tab** (`AvailabilityOverridesPanel`): table of staff availability overrides with create/delete support; block vs. open override types; optional time range for partial-day overrides
- **Recurring tab** (`SeriesPanel`): list and create recurring appointment series; cancel series in place; filters by counselor and client
- **Utilization tab** (`UtilizationPanel`): date-range filter; stat cards for total count and per-status breakdown; per-counselor table; visible only to authorized roles

### Worker

- Added `expireStaleReminders()`: pending reminders still unsent > 24 h past their scheduled time are auto-marked `expired`, preventing stale entries from re-entering the poll window
- Added in-loop cancellation re-check guard in `processDueReminders()`: each reminder's status is re-fetched before dispatch to prevent a race between cancel and send
- Introduced `poll()` orchestrator that runs `processDueReminders` and `expireStaleReminders` concurrently on each interval

### Runtime

- Added graceful startup handling for `EADDRINUSE` in the API server so port collisions now fail with a direct remediation message instead of an unhandled Node error event
- Added `pnpm start:api:standalone` and `@faith/api start:standalone` to run the API on port `3104` for isolated local development
- Updated `start-api.sh` to load `.env` and respect an existing `PORT` override while defaulting to `3104`

### v2.1.0 Breaking Changes

None.

---

## v2.0.0 — Tenant-Model Update

**Date:** March 27, 2026
**Type:** Major Release

### v2.0.0 Overview

Hardened the full DB query layer to enforce tenant isolation on every domain. Stabilized smoke test suites (Step 11, Step 12, security regression) and resolved SQL timestamp, return-shape, and CORS preflight failures that blocked DB-mode operation.

### v2.0.0 Changes

- Normalized all SQL `TIMESTAMP` inserts to `YYYY-MM-DD HH:MM:SS` format across all query modules
- Fixed return-shape mismatches in `clinical.js` and `platform.js` query helpers to match the API contract
- Added `DEFAULT_ALLOWED_ORIGINS` in `security.js` to include Vite dev server ports (`5173`); env-defined origins now merge with defaults instead of replacing them
- Fixed `createAuditEvent` in `packages/domain` to auto-generate a UUID `id`, resolving `AUDIT_FAIL: Column 'id' cannot be null` on every audit write
- Added `docs/security/tenant-query-safety-checklist.md` with 7 required query rules and a grep-based CI gate design
- Verified all Step 11, Step 12, and security regression smokes green under DB mode

### v2.0.0 Breaking Changes

None — DB-mode query shapes are now correct and consistent with in-memory equivalents.

---

## v1.6.0 — Explicit Health Probes & OTEL Health Metrics

**Date:** March 27, 2026  
**Type:** Minor Release

### v1.6.0 Overview

Adds explicit API liveness/readiness endpoints and dedicated OpenTelemetry health metrics so infrastructure can distinguish process-up from dependency-ready.

### v1.6.0 Changes

- Added `GET /health/live`
- Added `GET /health/ready`
- Kept `GET /health` as the liveness-compatible endpoint
- Added OTEL metrics:
  - `faith.service.health_status`
  - `faith.service.dependency.health_status`
  - `faith.service.healthcheck.duration`
  - `faith.service.healthcheck.total`
- Added readiness health state into `/v1/telemetry/summary`
- Exposed new health routes through the public-route allowlist for probes

### v1.6.0 Breaking Changes

None.

## v1.0.0 — Production Release: Client Management Module

**Date:** March 24, 2026  
**Type:** Major Release

### v1.0.0 Overview

First production-ready release completing Phase 1 of the full client management suite. Implements comprehensive client CRUD operations with React UI components, audit logging, RBAC enforcement, and complete OpenAPI documentation.

### New API Endpoints

- `GET /v1/clients/{id}` — Retrieve single client with tenant scoping
- `DELETE /v1/clients/{id}` — Soft-delete (archive) client
- Enhanced `PATCH /v1/clients/{id}` — Full client update support

### New React Components

- `ClientForm.jsx` — Reusable form component for create/edit workflows
- `ClientModal.jsx` — Modal wrapper for form presentation
- Enhanced `WorkspaceGrid.jsx` — Integrated add/edit/delete UI

### UI Features

- "New Client" button in Clients panel
- Edit and delete buttons on each client row
- Real-time client list refresh after mutations
- Loading, error, and empty states
- Form validation and error handling

### Documentation

- Updated OpenAPI spec (`docs/api/openapi.yaml`) with full `/v1/clients/{id}` operations
- Comprehensive release notes (`docs/RELEASE_1.0.0.md`)
- Updated README.md with v1.0.0 status
- All package.json files bumped to 1.0.0

### Files Modified

- `apps/api/src/index.js` — Enhanced handleClientById()
- `apps/web/src/components/ClientForm.jsx` — New
- `apps/web/src/components/ClientModal.jsx` — New
- `apps/web/src/components/WorkspaceGrid.jsx` — Enhanced
- `apps/web/src/App.jsx` — Added refresh state management
- `docs/api/openapi.yaml` — Added /v1/clients/{id} paths
- `README.md` — Updated version and release notes
- `package.json` (all) — Bumped to 1.0.0

### v1.0.0 Breaking Changes

None — fully backward compatible.

### Performance

- <100ms API response time for client operations
- Efficient client list refresh via state triggers
- Client-side validation prevents unnecessary API calls

### Security

- Tenant-scoped access enforcement on all endpoints
- RBAC checks (admin-only for delete)
- Audit logging for all client operations
- Soft-delete pattern preserves data integrity

For detailed release notes, see `docs/RELEASE_1.0.0.md`.

---

## Step 10 — Christian Counseling Differentiation

### Step 10 Files

- `apps/api/src/index.js`
- `apps/web/public/index.html`
- `apps/web/src/app.js`
- `ops/step10-smoke.mjs`

### Step 10 Summary

- Added `/v1/faith/*` endpoints for note templates, treatment goals, consent variants, resources, inventories, referral coordination, and language preferences.
- Added the **Faith Workflows** tab in Operations Studio and wired all create/save actions.
- Added smoke coverage for happy paths and client-role guard behavior.

## Step 11 — Reporting and Platform Operations

### Step 11 Files

- `apps/api/src/index.js`
- `apps/web/public/index.html`
- `apps/web/src/app.js`
- `ops/step11-smoke.mjs`
- `docs/change-log.md`

### Step 11 Summary

- Added reporting API: `/v1/reporting/overview` with utilization, counselor productivity, referral sources, document completion, assessment trends, A/R, and location performance.
- Added platform ops APIs:
  - `/v1/platform/overview`
  - `/v1/platform/tenant-provisioning`
  - `/v1/platform/impersonation-sessions`
  - `/v1/platform/data-exports`
  - `/v1/platform/retention-policies`
- Added strict platform-admin checks for tenant provisioning and impersonation sessions.
- Added **Reporting & Ops** tab in the web app with refresh/actions for reporting, provisioning, impersonation, exports, and retention policy updates.
- Added Step 11 smoke script for endpoint + guard verification.

## How to Track Current Changes

- List changed files: `git status --short`
- Inspect full diff: `git diff`
- Inspect a file diff: `git diff -- apps/api/src/index.js`
- Run latest smoke script: `node ops/step11-smoke.mjs`

## Step 12 — Hardening, UX, and Validation

### Step 12 Files

- `apps/api/src/index.js`
- `apps/api/src/lib/http.js`
- `apps/api/src/lib/security.js`
- `apps/web/build.js`
- `apps/web/public/index.html`
- `apps/web/public/styles.css`
- `apps/web/src/app.js`
- `ops/step12-validate.mjs`
- `package.json`

### Step 12 Summary

- Hardened request handling with explicit malformed JSON and payload-size responses.
- Expanded local CORS allowlist for the current web port and prevented API response caching.
- Fixed the web build script to resolve paths correctly from the repository root.
- Improved UI accessibility and UX with keyboard tab navigation, role-aware tab visibility, better live status messaging, textarea styling, and reduced-motion support.
- Added Step 12 workflow validation covering tenant isolation, security checks, and end-to-end flows across lifecycle, documents, billing, portal, faith workflows, reporting, and platform operations.
- Added Playwright coverage for highest-value browser journeys plus launch-readiness accessibility and performance audits.
- Added a dedicated RBAC and tenant-isolation regression script and tightened client-role access so non-portal reads are blocked centrally.
