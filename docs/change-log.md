# Change Log

## v2.1.11 — Operations Header And Session Card Refresh

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Refreshes the main dashboard header and relocates session identity out of the top bar. The previous header still used the older `Practice HUB` title and surfaced `Admin User` / `Server-managed session` inline in the brand area, which diluted the visual hierarchy and made the top bar feel administrative instead of operational. This update turns the header into a more deliberate operations banner, adds a lightweight animated counseling motif, and moves session context into a dedicated metric card beside the audit summary.

### Web (v2.1.11)

- Renamed the main header title from `Practice HUB` to `Practice Operations Center`
- Increased header visual hierarchy with larger title styling and supporting operational subtitle copy
- Added a CSS-animated counseling scene in the top bar instead of relying on a static or external graphic asset
- Removed `Admin User` and `Server-managed session` from the header itself
- Added a new `Current Session` dashboard card that shows the active user identity and server-managed session status beside `Audit Events`
- Expanded the metric band from three to four cards and added dedicated styling so the session card reads as contextual status rather than a numeric KPI
- Increased the application header height to support the larger title and animated header composition without degrading mobile behavior

### Breaking changes

None.

## v2.1.10 — Static File Server Query-String Fix

**Date:** March 28, 2026
**Type:** Patch

### Overview

Fixes the web server's static file handler so URLs with query strings (e.g. `operations.js?v=2.1.7`) resolve correctly to their on-disk files. Before this patch, any `?...` suffix was passed verbatim into `path.join()`, causing the server to look for a file with the query string literally in its name — resulting in a 404, the script never loading, and the entire page becoming unresponsive to clicks.

### Web (v2.1.10)

- Fixed `resolvePublicUrl()` in `apps/web/server.js` to strip the query string with `requestUrl.split('?')[0]` before resolving the file path
- All cache-busting query strings on static assets (`?v=X`, `?t=X`, etc.) now work correctly
- No behavior change for URLs without a query string

### Breaking changes

None.

## v2.1.9 — About Page Experience Refresh

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Redesigns the static About page into a more polished product-overview experience. The page previously rendered as a minimal header plus two generic content panels. It now uses a branded hero, stronger layout hierarchy, warmer visual treatment, and dedicated module/documentation cards while preserving the same operational links and product scope.

### Web (v2.1.9)

- Rebuilt `apps/web/public/about.html` as a richer landing page with:
  - branded top navigation and a stronger Back to App control
  - hero section with large headline, supporting copy, and capability badges
  - summary sidebar with explanatory copy and compact workspace metrics
  - dedicated module cards for charting, scheduling, billing, and portal/faith workflows
  - dedicated utility cards for API health, OpenAPI, Swagger UI, and Monitoring
- Added page-local styling for a warmer gradient background, more expressive typography, softer card treatment, and clearer mobile stacking
- Preserved all existing about-page links and telemetry startup behavior

### Breaking changes

None.

## v2.1.8 — Swagger UI Proxy Repair

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Repairs the interactive API docs at `/api/docs`. The proxied Swagger page was broken because it still referenced the spec as `/openapi.yaml` instead of the proxied `/api/openapi.yaml`, and the web server applied the normal app CSP/COEP profile to the docs route, which blocked Swagger’s CDN-hosted JS and CSS assets.

### API (v2.1.8)

- Changed Swagger UI spec resolution from `/openapi.yaml` to relative `./openapi.yaml`
- Disabled the external Swagger validator with `validatorUrl: null`
- Added `HEAD` support for `/docs` and `/openapi.yaml`

### Web (v2.1.8)

- Added a Swagger-specific CSP profile for `/api/docs` and `/api/docs/`
- Allowed `https://unpkg.com` scripts and styles only on the docs route
- Allowed the inline Swagger bootstrap script only on the docs route
- Relaxed `Cross-Origin-Embedder-Policy` only on the docs route so CDN assets can load successfully
- Left the stricter CSP/COEP profile unchanged for the rest of the application

### Breaking changes

None.

## v2.1.7 — Reporting Tab UI Redesign

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Replaces the two raw JSON textareas in the Operations Studio Reporting tab with a fully rendered dashboard. Practice Reporting now displays stat cards, proportional bar charts, a document-completion progress bar, an accounts-receivable aging grid, and a location-performance table. Platform Operations Summary now renders provisioning, impersonation, and data-export activity as stat pills and sortable tables, with a retention-policy grid at the bottom.

### Web (v2.1.7)

- Replaced `initReporting()` in `operations.js` with purpose-built rendering functions; the old `textarea.value = pretty(data)` pattern is gone
- Added `renderPracticeReport(summary)` — drives utilization stat cards (sessions, completed, remote rate, avg/counselor), referral-source bar chart, document-completion progress bar with pending/overdue counts, assessment-trends bar chart, AR aging cells with warn/danger color coding, outstanding-by-client table, and location-performance table
- Added `renderPlatformSummary(summary)` — drives provisioning stat pills + recent-tenants table, impersonation stat pills + recent-sessions table, data-exports stat pills + recent-exports table, and retention-policy grid
- Added `runPracticeReport()` — reads active `.rpt-window-btn` for day window, fetches `/v1/reporting/overview?days=N`, populates as-of timestamp
- Added `runPlatformSummary()` — fetches `/v1/platform/overview`, delegates to `renderPlatformSummary`
- Added JS helpers: `fmtMoney(cents)`, `fmtPct(ratio)`, `rptBars()`, `platStatPill()`, `statusBadgeHtml()`
- `initReporting()` now wires `.rpt-window-btn` preset toggling (same active-button-as-state-source pattern as Audit tab), Run Report → `runPracticeReport`, Refresh → `runPlatformSummary`
- All CSS classes reference existing definitions in `operations.html`; no new styles needed

### Breaking changes

None.

## v2.1.6 — Dashboard Metrics Correction

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Corrects the dashboard metric cards so they show live appointment and audit data instead of a miswired appointment-type count and a never-populated audit total. Before this change, the second card reported configuration depth (`Appointment Types`) instead of future workload, and the audit card displayed `0` because the frontend never issued an audit-summary request.

### Web (v2.1.6)

- Replaced `Appointment Types` with `Future Appointments` in the React dashboard metrics component
- Changed dashboard appointment metric sourcing from `/api/v1/appointment-types` to `/api/v1/appointments`
- `Today's Sessions` now counts current-day non-cancelled appointments
- `Future Appointments` now counts upcoming non-cancelled appointments
- Replaced placeholder metric badge copy with live, context-appropriate metadata tied to the underlying values
- Fixed the dashboard audit metric bug by fetching `GET /api/v1/audit/intelligence?days=7&limit=1` and reading `summary.total`
- Renamed the third card from `Audit Event Sync` to `Audit Events` so the label matches the displayed number
- Added role-aware audit metric messaging so non-admin users see `Admin visibility required` instead of a misleading silent zero state

### Breaking changes

None.

## v2.1.5 — Structured PHI-Safe API Logging

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Hardens the API logging layer so useful error and warning lines always reach operators as structured JSON without exposing request bodies, raw SQL, auth material, names, emails, or other PHI/PII-sensitive content.

### API (v2.1.5)

- Added shared structured API logger: `apps/api/src/lib/log.js`
- Added `x-request-id` correlation header generation/preservation on API responses
- Added structured startup, listen-failure, uncaught exception, and unhandled rejection logging
- Added structured `request.failed`, `request.complete`, and `request.slow` events with normalized route templates, status code, duration, tenant context, and actor role
- Added structured audit console output (`audit.event`) and audit failure logging (`audit.write_failed`)
- Sanitized error text before logging so obvious secrets, cookies, JWTs, bearer tokens, and email addresses are redacted
- Explicitly kept request/response bodies and raw SQL out of operational logs

### Standards and documentation

- Updated `PLANS/FULL-SECURITY-AND-AUDITING.md` with the canonical operational logging standard
- Updated `README.md` with the new API logging contract and validation notes

### Breaking changes

None.

## v2.1.4 — Audit Intelligence UI Redesign

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Replaces the two raw JSON textarea boxes in the Audit Intelligence tab of Operations Studio with a purpose-built investigation interface. No API changes — entirely a frontend improvement. Operators now have a filter bar, live stat cards, breakdown bar charts, and a formatted event log table instead of unreadable JSON blobs.

### Web (v2.1.4)

#### Filter bar (`operations.html`)

- Time window preset buttons replace the number input: **7 days**, **30 days**, **90 days** — active selection shown with filled indigo pill
- Result dropdown: All results / Success / Denied / Error
- Actor role dropdown pre-populated with all known system roles
- Free-text "action contains" search field; pressing Enter triggers the query
- All controls in a single card-style row above results

#### Summary stat cards (`operations.html`)

Four cards rendered after each query, each with a large count and a color-coded top border:

| Card | Color | Metric |
| --- | --- | --- |
| Total Events | Neutral | All events in window |
| Successful | Green | `result: success` count |
| Denied | Amber | Access / permission blocks |
| Errors | Red | Unexpected failures |

#### Breakdown charts (`operations.html`)

Two side-by-side cards with proportional horizontal bar charts:

- **Top Actions** (indigo) — up to 8 most frequent action codes with counts
- **By Actor Role** (purple) + **By Target Type** (cyan) — stacked in a single card; up to 8 rows each

All bars animate to width via CSS transition on render.

#### Event Log table (`operations.html`)

Full-width table replacing the events textarea:

| Column | Content |
| --- | --- |
| Dot | Color-coded glow dot — green (success), amber (denied), red (error) |
| Action | Monospace; module prefix highlighted indigo; result label in matching color below |
| Actor Role | Color-coded badge by role |
| Target | Target type + target ID in grey monospace |
| Tenant | Tenant ID in monospace |
| When | Relative ("3m ago") + full locale timestamp |

Description line under the card title narrates active filters. Count badge shows number of events returned.

#### Zero state (`operations.html`)

Centered search icon, "No events matched" heading, and a suggestion message replace the empty table when no results are returned.

#### Intro banner (`operations.html`)

Contextual paragraph at the tab top explains what is tracked and explicitly states no PHI or client names are stored — operators get context without reading documentation.

### JS (`operations.js`)

- `escapeHtml(str)` — XSS-safe rendering for all dynamic content
- `fmtRelTime(iso)` — relative time label (s / m / h / d ago)
- `fmtActionHtml(action)` — highlights module prefix of dot-notation action strings
- `roleBadgeClass(role)` — maps role strings to CSS badge modifier classes
- `runAuditQuery()` — decoupled from click handler; also wired to Enter key on action filter
- `renderAuditSummary(summary, days)` — drives stat cards and all bar charts
- `renderAuditEvents(events, days)` — drives event log table and zero state

### Breaking changes

None. No API changes. Existing `GET /v1/audit/intelligence` response shape is consumed directly.

---

## v2.1.3 — Deep Database Engine Monitoring

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Replaces the single DB health ping with a live, rich monitoring surface backed by MySQL internal status tables. The monitoring dashboard now shows connection counts, InnoDB buffer pool hit ratio, per-operation query breakdowns, throughput, slow-query alerting, and per-table row/size estimates alongside an animated SVG database-engine graphic.

### API (v2.1.3)

- Added `GET /v1/monitoring/db` — no-auth monitoring endpoint (same RBAC exemption as `/v1/telemetry/summary`)
- Queries `SHOW GLOBAL STATUS` for: `Uptime`, `Threads_connected`, `Threads_running`, `Max_used_connections`, `Questions`, `Slow_queries`, `Com_select/insert/update/delete`, `Innodb_buffer_pool_pages_total/free`, `Innodb_buffer_pool_read_requests/reads`, `Bytes_received/sent`
- Queries `SHOW GLOBAL VARIABLES` for: `max_connections`, `innodb_buffer_pool_size`
- Queries `information_schema.TABLES` for per-table row estimates and `data_length + index_length` storage sizes, scoped to `DB_NAME`
- Derives `bufferPool.hitRatio` as `(1 − reads/requests) × 100`
- Returns `{ mode: "unavailable" }` gracefully when `DB_NAME` is not set
- Route registered in `resolveRoute()` as `/v1/monitoring/db`

### Web (v2.1.3)

- Added **Database Engine** section in `apps/web/public/monitor.html` between Health Probes and Request Activity
- Animated SVG graphic: 3D cylinder with glowing cap, three staggered pulsing ground rings, animated data-stream from above, and three orbiting data packets (cyan 3.2 s, indigo 3.2 s half-offset, amber 2.1 s) — pure SVG SMIL, no external libraries
- Six metric tiles: Uptime, Connections (with running/max sub-line), Buffer Pool Hit %, Total Queries (S/I/U/D sub-line), Slow Queries (amber highlight when > 0), Throughput (human-readable bytes)
- Table Storage & Row Estimates pill grid: one card per table with name, row count estimate, and KB/MB size
- Added `fmtBytes()` and `fmtUptimeLong()` helpers to `apps/web/public/monitor.js`
- Added `updateDbPanel()` to drive all DB panel DOM updates with graceful fallback
- `/api/v1/monitoring/db` added as a fourth parallel fetch in `doRefresh()` `Promise.allSettled` call

### Breaking changes (v2.1.3)

None.

---

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
