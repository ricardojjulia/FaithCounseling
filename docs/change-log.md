# Change Log

## v1.6.0 — Explicit Health Probes & OTEL Health Metrics

**Date:** March 27, 2026  
**Type:** Minor Release

### Overview

Adds explicit API liveness/readiness endpoints and dedicated OpenTelemetry health metrics so infrastructure can distinguish process-up from dependency-ready.

### Changes

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

### Breaking Changes

None.

## v1.0.0 — Production Release: Client Management Module

**Date:** March 24, 2026  
**Type:** Major Release

### Overview

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

### Breaking Changes

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
