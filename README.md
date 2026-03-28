# Faith Counseling

Christian counseling practice management SaaS for solo counselors, group practices, and multi-location clinics.

## Version

- Current release: `1.9.0`
- Status: production-ready (client module + MySQL persistence layer + Docker local DB + counselor profiling + Mantine UI + revamped ops/monitoring + explicit health probes + OTEL health export + full Scheduling module with Waitlist, Reminders & Calendar DB support)

## v1.9.0 — Scheduling: Waitlist, Reminders & Calendar DB Support (March 2026)

### v1.9.0 Overview

Completes the scheduling module by wiring the three remaining features — waitlist management, appointment reminders, and the calendar endpoint — to the MySQL persistence layer. Fixes three latent schema mismatches in the DB query module that would have caused runtime crashes when `DB_NAME` is set. Adds a live reminder-dispatch polling loop to the worker process.

### v1.9.0 Changes

#### Frontend — Waitlist & Reminders Tabs (`apps/web/src/components/SchedulingPage.jsx`)

The Scheduling page now exposes three tabs:

- **Appointments** — existing calendar, counselor, and practice-manager views (unchanged)
- **Waitlist** — priority-sorted table showing all clients in waitlist status; inline editing of priority rank, requested service, preferred session type, and notes
- **Reminders** — list of all reminders with status badges; "New Reminder" modal to schedule a reminder against any upcoming appointment; mark-sent and cancel actions per row

#### API — DB Branches for Waitlist & Calendar (`apps/api/src/index.js`)

- `handleWaitlist` (GET + PATCH) — now has a full DB-mode branch; GET enriches rows with decrypted client names; PATCH updates via the query module
- `handleSchedulingCalendar` — DB-mode branch uses `listAppointmentsByDateRange` for appointments and a live staff query for availability templates
- Fixed bug: PATCH reminders was querying a non-existent `appointment_reminders` table — corrected to `reminders`

#### DB Query Module — Schema Mismatches Fixed (`apps/api/src/db/queries/appointments.js`)

Three column-name mismatches that would have caused runtime errors in DB mode:

| Table | Was | Now |
| --- | --- | --- |
| `reminders` | `scheduled_for`, `channel` | `reminder_at`, `delivery_channel` |
| `waitlist_metadata` | `requested_counselor_id`, `preferred_days`, `estimated_wait`, `priority` | `priority_rank`, `requested_service`, `preferred_session_type` |
| `availability_templates` | normalized `day_of_week`/`start_time`/`end_time` rows | single JSON `slots` column |

Also added the previously-missing `upsertAvailabilityTemplate` and `deleteAvailabilityTemplate` functions that were imported by `index.js` but did not exist.

#### Worker — Reminder Polling Loop (`apps/worker/src/index.js`)

- Added a 60-second polling loop that queries `reminders WHERE status='pending' AND reminder_at <= NOW()`
- Each due reminder is logged (delivery channel, type, appointment, client) and marked `sent` with a `sent_at` timestamp
- In production, replace the `console.log` dispatch with your email/SMS provider integration
- Loop is skipped gracefully when `DB_NAME` is not set
- `mysql2` added to worker dependencies

#### API Client — New Scheduling Functions (`apps/web/src/lib/clientApi.js`)

- `fetchWaitlist()` — `GET /v1/waitlist`
- `patchWaitlistEntry(data)` — `PATCH /v1/waitlist`
- `fetchReminders({ status, appointmentId })` — `GET /v1/reminders`
- `createReminderRecord(data)` — `POST /v1/reminders`
- `patchReminderRecord(data)` — `PATCH /v1/reminders`

### v1.9.0 Backward Compatibility

No breaking changes. All existing API routes and in-memory fallback behavior are preserved. The new tabs are additive UI surfaces. The worker reminder loop is a no-op when `DB_NAME` is not configured.

---

## Hotfixes (March 2026)

### Appointments table — missing columns (`starts_at`, `ends_at`, `location_name`, `timezone`)

**Problem:** The appointments DB table was created with a `scheduled_at` column, but the query layer (`apps/api/src/db/queries/appointments.js`) was written expecting `starts_at`, `ends_at`, `location_name`, and `timezone`. Any read or write to the scheduling feature threw `Unknown column 'starts_at' in 'order clause'`.

**Fix:** Added the four missing columns via an idempotent `addColumnIfMissing` migration in `apps/api/src/db/migrate.js`. Re-run `node --env-file=.env apps/api/src/db/migrate.js` to apply on any environment that hasn't been updated yet. The old `scheduled_at` column is retained for backward compatibility.

### Portal API — `resolvePortalClient` not DB-aware

**Problem:** All portal endpoints (`/v1/portal/overview`, `/v1/portal/accounts`, etc.) validated the incoming `clientId` against the in-memory mock client array. When the app runs with a real MySQL database, clients have real UUIDs that don't exist in that array, causing every portal request to return `400 Valid clientId is required`.

**Fix:** `resolvePortalClient` in `apps/api/src/index.js` is now `async` and queries the `clients` table directly when `DB_NAME` is set. All seven call sites were updated with `await`.

### Appointment composer — counselor dropdown included non-counselor staff

**Problem:** The counselor selector in the appointment composer was populated from a list that included admin and scheduler roles (`platform_admin`, `practice_owner`, `practice_admin`, `scheduler_biller`) in addition to actual counselors and interns.

**Fix:** The `counselors` memo in `SchedulingPage.jsx` now filters exclusively on `COUNSELING_ROLES` (`counselor`, `intern`), so only staff classified as counselors appear in the dropdown.

### `npm run start` — `.env` not loaded, DB credentials empty

**Problem:** `ops/start-all.mjs` spawned child processes inheriting `process.env`, but the root `.env` file was never loaded into the parent process. DB credentials were undefined, causing MySQL to reject the connection with `Access denied for user ''`.

**Fix:** The `start` and `start:all` scripts in `package.json` now use `node --env-file=.env`, which is natively supported in Node 20+. No additional dependencies required.

### Web server — `app.js` served with 1-hour browser cache

**Problem:** `apps/web/server.js` intended to serve `no-cache` for all files under `assets/`, but the path check (`requestedPath.startsWith('assets/')`) never matched because the resolved path starts with `/assets/`. The JS bundle was cached for up to an hour after a rebuild.

**Fix:** Changed to `requestedPath.includes('assets/')` so all asset files are correctly served with `cache-control: no-cache`.

---

## v1.8.0 — Major Feature Addition: Scheduling (March 2026)

### v1.8.0 Overview

This release formally declares **Scheduling** as a major platform feature. The product now includes an end-to-end scheduling workflow covering calendar access, appointment creation, lifecycle updates, client-preselected booking flows, and portal request conversion into scheduled appointments.

### v1.8.0 Highlights

- Scheduling is now a first-class module in the primary app shell
- General, counselor, and practice-manager calendar views are available
- Dashboard `View Calendar` and `New Appointment` actions are fully wired
- Appointment lifecycle actions (edit, complete, cancel, no-show, delete) are available from scheduling views
- Staff can open scheduling with client-preselected context from client list and client detail
- Portal appointment requests can be converted into live scheduled appointments

### v1.8.0 Backward Compatibility

No breaking API changes were introduced. The scheduling feature is built on existing appointment endpoints and extends UI/workflow capability without altering established API contracts.

## v1.7.0 — Scheduling Module Foundation, Client Scheduling Flows & Portal Conversion (March 2026)

### v1.7.0 Overview

Introduces the first end-to-end Scheduling module implementation in the React app. The release adds a dedicated Scheduling surface, working dashboard scheduling actions, appointment lifecycle controls, client-preselected scheduling flows, and portal request handoff into live appointment scheduling.

### v1.7.0 Changes

#### Dedicated Scheduling Surface

- Added a real Scheduling page in the app shell (replacing placeholder navigation behavior)
- Added role-aware calendar modes:
  - General Calendar
  - Counselor Calendar
  - Practice Manager Calendar
- Added operational metrics cards for day-level scheduling visibility

#### Working Scheduling Entry Points

- `View Calendar` on the dashboard now opens the Scheduling page
- `New Appointment` on the dashboard now opens a functioning appointment composer
- Client rows now expose a `Schedule` action that opens scheduling with the client preselected
- Client detail header now exposes `Schedule Appointment` for direct scheduling

#### Appointment Creation & Lifecycle Actions

- Appointment composer supports:
  - client
  - appointment type
  - counselor
  - start/end
  - location or remote mode
  - timezone
- Added conflict handling from API `409` responses to surface scheduling collisions
- Added lifecycle actions from Scheduling agenda/grid:
  - Edit appointment
  - Mark completed
  - Mark cancelled
  - Mark no-show
  - Delete appointment

#### Portal Request to Appointment Conversion

- Portal appointment requests now provide `Schedule` actions for requested/approved items
- Selecting `Schedule` opens Scheduling with the client preselected and request timing prefilled
- Successful appointment creation marks the originating portal request as `scheduled`

#### Planning & Documentation

- Added implementation record: `PLANS/CALENDAR.md`
- Updated package versions to the `1.x` major line with synchronized release value `1.7.0`

### v1.7.0 Backward Compatibility

No breaking API changes were introduced. Existing appointment endpoints remain in place and were reused for the new Scheduling UX. The release adds UI and workflow capabilities on top of the current API contract.

## v1.6.0 — Explicit Health Probes & OTEL Health Metrics (March 2026)

### v1.6.0 Overview

Adds explicit liveness and readiness health endpoints to the API and exports dedicated service/dependency health metrics through OpenTelemetry. This closes the gap between generic request telemetry and actual machine-readable health status.

### v1.6.0 Changes

#### API Health Endpoints

- `GET /health` and `GET /health/live` now provide liveness status
- `GET /health/ready` now performs a DB readiness check and returns dependency/check detail
- Health routes are publicly accessible for probes and load balancers

#### OpenTelemetry Health Export

- Added `faith.service.health_status` observable gauge
- Added `faith.service.dependency.health_status` observable gauge
- Added `faith.service.healthcheck.duration` histogram
- Added `faith.service.healthcheck.total` counter
- Readiness results now update the API telemetry summary health block for operator visibility

### v1.6.0 Bug Fixes

- `exportedViaOtel` in `GET /v1/telemetry/summary` now reports active OTEL export when only `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` is configured
- Repository package manifests and OpenAPI metadata have been normalized to the `1.6.0` release line

### v1.6.0 Backward Compatibility

No breaking API changes. Existing `/health` callers still receive a successful liveness response, while `/health/ready` is available for deeper readiness probes.

## v1.5.0 — Operations Studio Revamp, Monitoring Dashboard & API Auth Fix (March 2026)

### v1.5.0 Overview

Overhauls the two standalone operational pages (Operations Studio and Monitoring Dashboard) from broken placeholder UIs into polished, fully-functional tools. Fixes a session-propagation bug that blocked platform admin operations with spurious "Admin role required" errors.

### v1.5.0 Changes

#### Monitoring Dashboard — Full Rewrite (`apps/web/public/monitor.html`)

The monitoring page has been completely rewritten as a self-contained dark-theme dashboard with live animated visualizations. No external chart library — all charts are pure SVG or CSS.

##### Visual Design

- Dark palette (`#080c18` background, `#141b2d` cards, glassmorphism sticky topbar)
- Pulsing health status chip with live "healthy / degraded / error" classification
- 15-second auto-refresh with countdown timer in the topbar
- CSS `countUp` animation on all KPI values when data loads

##### KPI Row (6 cards)

- Total Requests, Error Count, Avg Latency (ms), Uptime, Active Requests, Mutations — each with color-coded top-border accent

##### SVG Sparkline Chart

- Gradient-filled area chart for request volume (rolling 20-point browser history)
- Dashed overlay line for error rate
- Scales dynamically with `buildPath` / `buildFillPath` helpers

##### SVG Donut Chart

- Animated `stroke-dasharray` showing error percentage in the centre
- Colour shifts green → amber → red based on error rate threshold

##### Latency Bar Chart

- Horizontal bars for avg / p95 / max with CSS `transition: width 1s ease`
- Separate proxy latency sub-section

##### Memory Gauges

- Gradient-filled bars for Heap Used, Heap Total, and RSS (from `process` block in telemetry summary)

##### Status Code Drill-Down

- Clickable status code pills (colour-coded by 2xx / 3xx / 4xx / 5xx)
- Clicking a pill filters the HTTP Errors table below
- HTTP Errors table shows time, method, route, and status — filterable by All / 4xx / 5xx / GET / POST
- Powered by `recentErrors[]` from `GET /api/v1/telemetry/summary`

##### Browser Vitals Grid

- Renders `browserVitals` fields from the telemetry summary (LCP, FID, CLS, TTFB, etc.)

##### OTEL Settings Panel (admin)

- Active / Inactive status banner driven by `exportedViaOtel` from the API, including metrics-only OTLP configuration
- Editable inputs for `OTEL_EXPORTER_OTLP_ENDPOINT`, traces endpoint, and metrics endpoint
- Test Connection — sends a live OTLP probe (`POST { resourceSpans: [] }`) with a 5-second timeout; reports success or failure inline
- Generate .env Snippet — outputs a ready-to-paste `.env` block with current endpoint values

#### Operations Studio — Revamp (`apps/web/public/operations.html` + new `apps/web/public/operations.js`)

The Operations Studio page has been rebuilt from scratch with a clean layout and every button wired to real API endpoints.

##### Layout

- Sticky dark header with logo, connection status pill, navigation back to main app, and Sign In Panel
- Four tabs: Reporting, Platform Ops, Data & Retention, Language Studio
- White cards with inline status bars per action group
- Toast notifications (bottom-right) for success/error feedback

##### Reporting Tab

- Refresh Summary → `GET /api/v1/reporting/overview?days=N`

##### Platform Ops Tab

- Refresh Platform Summary → `GET /api/v1/platform/overview`
- Create Tenant → `POST /api/v1/platform/tenant-provisioning` (tenantId, practiceName, ownerEmail)
- Start Impersonation → `POST /api/v1/platform/impersonation-sessions` (auto-populates End Session ID)
- End Impersonation → `PATCH /api/v1/platform/impersonation-sessions/:id`

##### Data & Retention Tab

- Queue Export → `POST /api/v1/platform/data-exports`
- Save Retention Policy → `PUT /api/v1/platform/retention-policies`

##### Language Studio Tab

- Create Locale → `POST /api/v1/i18n/locales`
- Load Catalog → `GET /api/v1/i18n/catalog?locale=`
- Inline translation editor — key/value rows; tracks catalog state in memory
- Save Translations → `PATCH /api/v1/i18n/catalog/:locale`
- Auto-Translate → `POST /api/v1/i18n/translate`
- Save Config → `PATCH /api/v1/i18n/settings/:locale`

### v1.5.0 Bug Fixes

#### Platform / Reporting Operations — "Admin role required" Error

`handlePlatformOverview`, `handleReportingOverview`, and `handleTenantProvisioning` in `apps/api/src/index.js` were dispatched **without passing the resolved `session` object**. `callerRole()` then fell back to the `x-staff-role` request header, which the browser never sends, so every call was treated as unauthenticated and returned 403.

**Fix:** All three dispatch sites now pass `session` as an argument; handler signatures were updated accordingly.

### v1.5.0 Backward Compatibility

No breaking changes. All API routes, database schema, and client-side React application are unchanged. The standalone monitoring and operations pages are served as static HTML from `apps/web/public/` and do not affect the React bundle.

---

## v1.4.0 — Mantine UI Migration, Counselor Maintenance & Bug Fixes (March 2026)

### Overview

Completes a full migration of all React components from raw HTML inputs and inline styles to [Mantine v7](https://mantine.dev) component primitives. Adds a dedicated Counselor Maintenance screen showing only counselor and intern staff. Fixes two navigation regressions introduced during the UI refactor.

### Changes

#### Full Mantine v7 UI Migration

Every component in `apps/web/src/components/` has been rewritten to use Mantine v7 primitives, replacing raw `<input>`, `<select>`, `<textarea>`, and all inline style objects.

**Migrated components:**

| Component | Notes |
| --- | --- |
| `ClientForm.jsx` | `useForm` with field-level validation; `TextInput`, `Select`, `Alert` |
| `ClientModal.jsx` | Replaced custom backdrop div with Mantine `Modal` |
| `WorkspaceGrid.jsx` | `Paper`, `Tabs`, `Button`, `UnstyledButton`; `notifications.show()` for delete feedback |
| `UserMaintenance.jsx` | `Table`, `Modal`, `useForm`, `Badge`, `PasswordInput` |
| `CounselorDetail/tabs/ProfileTab.jsx` | `useForm`, `Select`, `Textarea`; self/admin RBAC |
| `CounselorDetail/tabs/LicensesTab.jsx` | List-of-cards with `Modal` for add/edit; `DateInput` for issue/expiry dates |
| `CounselorDetail/tabs/SpecialtiesTab.jsx` | `CheckGroup` multi-select for specialties, modalities, age groups; `NumberInput` for max caseload |
| `CounselorDetail/tabs/CounselorFaithProfileTab.jsx` | `Select` for tradition/integration style; `Checkbox` for ordained/memberships |
| `CounselorDetail/tabs/CertificationsTab.jsx` | Two-section layout (Certifications / CEU Log); `Modal` for add/edit |
| `CounselorDetail/tabs/EmploymentTab.jsx` | `DateInput` for hire/termination/malpractice dates; non-admin masked read-only view |
| `CounselorDetail/tabs/AvailabilityTab.jsx` | Mantine `Table` with `Badge` for remote/in-person |
| `ClientDetail/tabs/DemographicsTab.jsx` | `PasswordInput` for SSN; `DateInput` for DOB with age calculation; inline phone/address rows |
| `ClientDetail/tabs/ContactsTab.jsx` | `ContactCard` sub-component with `Paper`, `SimpleGrid`, `Badge` indicators |
| `ClientDetail/tabs/InsuranceTab.jsx` | Collapsible `Paper` header; `NumberInput` for copay/authorized visits; `DateInput` for all date fields |
| `ClientDetail/tabs/ClinicalHistoryTab.jsx` | `CollapsibleSection` pattern; `YesNoToggle` checkboxes; risk active `Alert` with confirmation |
| `ClientDetail/tabs/DiagnosesTab.jsx` | Three sub-lists (Diagnoses, Medications, Allergies); discontinued medications toggle |
| `ClientDetail/tabs/FaithProfileTab.jsx` | `Select` with `searchable` for denomination; faith integration description panel |
| `ClientDetail/tabs/LegalAdminTab.jsx` | Guardian toggle for non-minors; `DateInput` for court order expiry; Minor badge |

`CounselorDetail/sharedStyles.js` was deleted after all tabs were migrated off it.

#### Counselor Maintenance Screen

New `CounselorMaintenance.jsx` component replaces the generic `UserMaintenance` component in the Counselors sidebar view:

- Title reads **"Counselor Maintenance"** (was "User Maintenance")
- Filters staff list to only `counselor` and `intern` roles — admin and other roles do not appear
- Adds a **License Type** column relevant to clinical staff
- **"View Profile"** button (primary) opens the full `CounselorDetailPage`
- **"Edit"** button opens a quick-edit modal scoped to counselor/intern role options only
- **"Add Counselor"** modal limits the Role dropdown to `counselor` and `intern`
- `App.jsx` updated to import and render `CounselorMaintenance` for the `counselors` nav view

### Bug Fixes

#### Clients Sidebar — Empty Screen After Navigation

Clicking "Clients" in the sidebar called `onOpenClientPicker()` (a search modal) without updating `currentView`. Closing the modal left the app on whatever screen was previously active, often showing nothing if `currentView` had no matching render branch.

**Fix:** `Sidebar.jsx` now calls `onNavigate('clients')` for the Clients item, same as all other nav items. The Clients view navigates to `currentView = 'clients'`, which renders `WorkspaceGrid` with the full client list.

#### Client Detail Page — Blank Screen on Open

Clicking "Edit" on any client rendered a completely blank screen. Root cause: Mantine v7 `Tabs` renders **all panel children on mount** (hidden via CSS, not unmounted). `ClientDetailTabs.jsx` passed the `client` prop only to `DemographicsTab` but not to `InsuranceTab`, `ClinicalHistoryTab`, `FaithProfileTab`, or `LegalAdminTab`. All four components access `client.insurance`, `client.clinical`, etc. at the top of their render function, throwing a `TypeError` immediately — before anything was displayed.

**Fix:** `ClientDetailTabs.jsx` now passes `client` to every tab panel component.

### Backward Compatibility

No breaking changes. All API routes, database schema, and authentication behavior are unchanged.

---

## v1.3.0 — Counselor Profiling System (March 2026)

### v1.3.0 Overview

Adds a comprehensive counselor profiling system covering all information a Christian counseling practice needs to maintain on its counseling personnel. Each counselor now has a dedicated detail page with seven tabs: Profile, Licenses, Specialties, Faith Profile, Certifications, Employment, and Availability. RBAC allows counselors to edit their own specialty and faith profiles while keeping licenses, certifications, and employment records admin-controlled.

### v1.3.0 Changes

#### Database Schema (5 new tables)

- `staff_licenses` — multi-row, one per state license per counselor; PHI-encrypted license number
- `staff_certifications` — multi-row, one per certification or CEU entry; PHI-encrypted cert number and notes
- `staff_specialty_profiles` — singleton per counselor; JSON columns for specialties, modalities, age groups, languages
- `staff_employment` — singleton per counselor; PHI-encrypted NPI, malpractice policy, and direct phone
- `staff_faith_profiles` — singleton per counselor; PHI-encrypted theological approach, faith credentials, and spiritual gifts

Run migration: `node apps/api/src/db/migrate.js`

#### API Routes (7 new sub-resource routes)

All routes are scoped under `/api/v1/staff/:staffId/`:

- `GET|POST /licenses` — list and create licenses (admin or self for GET; admin-only POST)
- `GET|PATCH|DELETE /licenses/:id` — get, update, delete a single license
- `GET|POST /certifications` — list and create certifications
- `GET|PATCH|DELETE /certifications/:id` — get, update, delete a single certification
- `GET|PUT /specialty-profile` — get or upsert specialty profile (self or admin write)
- `GET|PUT /employment` — get or upsert employment record (admin-only)
- `GET|PUT /faith-profile` — get or upsert faith profile (self or admin write)

#### Domain Enums (8 new)

Added to `packages/domain/src/index.js`: `counselingSpecialties`, `therapeuticModalities`, `ageGroupsServed`, `employmentTypes`, `employmentStatuses`, `licenseStatuses`, `faithTraditions`, `integrationStyles`

#### Web UI — CounselorDetailPage

New component tree at `apps/web/src/components/CounselorDetail/`:

- **Profile tab** — core staff record fields; admins edit all, counselors edit their own bio
- **Licenses tab** — list-of-cards with add/edit/delete (admin only); masked license numbers
- **Specialties tab** — checkbox multi-select for 19 specialties, 16 modalities, 9 age groups, 10 languages; editable by self or admin
- **Faith Profile tab** — faith tradition, ordination details, AACC/ACBC/CCCA memberships, prayer and scripture integration preferences; editable by self or admin
- **Certifications tab** — cards split into Certifications and CEU Log sections with total CEU hours; admin write
- **Employment tab** — NPI, malpractice insurance, employment status; admin-only write with sensitive fields masked for non-admins; 10-digit NPI validation
- **Availability tab** — read-only weekly grid from existing scheduling data

#### App Routing

- `Sidebar.jsx` — added "Counselors" nav item, visible to admin roles only
- `UserMaintenance.jsx` — added "View Profile" button per staff row when `onViewCounselor` prop is provided
- `App.jsx` — added `selectedCounselorId` state, `handleOpenCounselor`/`handleCounselorBack` handlers, and `CounselorDetailPage` render branch

### v1.3.0 RBAC Summary

| Resource | Read | Write |
| --- | --- | --- |
| Licenses | Admin or self | Admin only |
| Certifications | Admin or self | Admin only |
| Specialty Profile | Admin or self | Self or admin |
| Faith Profile | Admin or self | Self or admin |
| Employment | Admin only | Admin only |

### v1.3.0 Backward Compatibility

No breaking changes. Existing staff list, user maintenance, and client workflows are unaffected.

### v1.3.0 Deferred

- Availability editing (managed through Scheduling)
- Credentialing expiry alerts
- CEU reporting and export
- Supervision assignment UI
- Counselor-facing self-service portal

See `PLANS/CounselorProfiling.md` for the full implementation plan.

---

## v1.2.0 — Docker Local Database, Env Loading Fix & Login Bug Fix (March 2026)

### v1.2.0 Overview

Completes the local developer experience for the MySQL persistence layer. Adds a Docker Compose file for one-command database startup, fixes environment variable loading so the API always reads `.env` on start, and resolves a login regression where the session INSERT failed due to a missing `role` column in the staff account query.

### v1.2.0 Changes

#### Docker Local Database

- `docker-compose.yml` added at repo root — starts MySQL 8 with persistent named volume (`faith_mysql_data`), healthcheck, and the `faith_app` user pre-configured
- Start the database: `docker compose up -d`
- Data persists across container restarts via the named volume

#### Environment Loading Fix

- `apps/api/package.json` `start` script updated from `node src/index.js` to `node --env-file=../../.env src/index.js`
- Previously, running `pnpm --filter @faith/api start` would launch the API without `.env` loaded, causing the DB connection to fail silently and fall back to anonymous credentials

#### Login Bug Fix

- `apps/api/src/lib/auth.js` — `login()` query was `SELECT sa.*, sm.first_name_enc, sm.last_name_enc` which omitted `sm.role`
- The `sessions` INSERT uses `account.role`, so `role` was `undefined` → MySQL `Column 'role' cannot be null` error
- Fixed by adding `sm.role` to the SELECT: `SELECT sa.*, sm.role, sm.first_name_enc, sm.last_name_enc`

#### Local Dev Quick Start

```bash
# 1. Start MySQL
docker compose up -d

# 2. Create all tables + seed dev account
node apps/api/src/db/migrate.js

# 3. Start the API (DB mode activates automatically via .env)
npx pnpm@10.7.0 --filter @faith/api start

# 4. Login
curl -s -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@faithcounseling.local","password":"ChangeMe!Dev2024#"}'
```

### v1.2.0 Bug Fixes

- API no longer connects anonymously when started via `pnpm start` without explicit env vars
- Login endpoint no longer throws `Column 'role' cannot be null` on first attempt

### v1.2.0 Backward Compatibility

No breaking changes. In-memory mode (no `DB_NAME`) is unaffected.

See `docs/DATABASE-IMPLEMENTATION.md` for full setup reference.

---

## v1.1.0 — MySQL Persistence, PHI Encryption & Session Auth (March 2026)

### v1.1.0 Overview

Full database persistence layer replacing the in-memory store. Introduces MySQL-backed storage for all domains, AES-256-GCM field-level encryption for PHI columns, session-based authentication with argon2id password hashing, and persistent audit logging. The API operates in **dual mode**: when `DB_NAME` is set it routes all requests through parameterized MySQL queries; without it the in-memory fallback remains fully functional for local development and tests.

### New Features

#### Database Layer

- MySQL connection pool (`apps/api/src/db/pool.js`) with configurable SSL, connection limit, and UTC timezone
- Full DDL schema (`apps/api/src/db/schema.sql`) — 30+ tables across all domains
- Run-once migration script: `node apps/api/src/db/migrate.js`
- Per-domain query helper modules under `apps/api/src/db/queries/` — `clients.js`, `clinical.js`, `appointments.js`, `billing.js`, `documents.js`, `portal.js`, `staff.js`, `faith.js`, `platform.js`
- 83 `process.env.DB_NAME` guards wired into all major handlers — each falls back to in-memory when DB is not configured

#### PHI Encryption

- AES-256-GCM field-level encryption (`apps/api/src/lib/encrypt.js`) for all PHI columns
- Encrypted fields: client names, staff names/license/bio, location addresses, progress note summaries, treatment plan goals, emergency contacts, insurance info, portal emails, message content
- Key sourced from `DB_ENCRYPTION_KEY` env var (32-byte hex); format: `iv:authTag:ciphertext` (all base64)

#### Authentication

- Session-based login (`apps/api/src/lib/auth.js`) replacing insecure header-based identity
- `POST /v1/auth/login` — argon2id password verification, HttpOnly session cookie
- `POST /v1/auth/logout` — server-side session revocation
- `GET /v1/auth/me` — current session profile
- Sessions stored as SHA-256 token hashes in `sessions` table; sliding 8-hour idle timeout
- Account lockout after 10 failed attempts

#### Security

- Persistent audit events — all mutations write to `audit_events` table in addition to console log
- Parameterized queries throughout — no SQL string interpolation
- Staff accounts table with `failed_attempts`, `locked_until`, `last_login_at`, `mfa_enabled` columns

### New Environment Variables

```env
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL
DB_ENCRYPTION_KEY  (openssl rand -hex 32)
```

See `docs/DATABASE-IMPLEMENTATION.md` for full setup instructions.

### v1.1.0 Backward Compatibility

Fully backward compatible. Without `DB_NAME` set, all behavior is identical to `v1.0.0`.

---

## v1.0.0 — Client Management Module (Major Release)

### Release Overview

Major release completing Phase 1 of the full client management suite. Implements comprehensive client CRUD operations with full UI integration, audit logging, and OpenAPI documentation.

### Release Features

#### API Enhancements

- `GET /v1/clients/{id}` — Retrieve single client with tenant-scoped access audit logging
- `DELETE /v1/clients/{id}` — Soft-delete (archive) client by setting status to inactive
- `PATCH /v1/clients/{id}` — Full client update with validation and appointment name sync
- All endpoints include tenant-scope enforcement, RBAC checks, and audit trail recording

#### React Components

- `ClientForm.jsx` — Reusable form component for create/edit workflows with validation
- `ClientModal.jsx` — Modal wrapper with backdrop and form integration
- Enhanced `WorkspaceGrid.jsx` — Edit/delete buttons on client list with real-time refresh

#### UI Features

- "New Client" button in Clients panel
- Inline edit on client name (opens modal with pre-populated data)
- Delete (archive) button with confirmation dialog
- Live client list with loading, error, and empty states
- Automatic refresh after add/edit/delete mutations

#### Documentation

- Updated OpenAPI specification with full `/v1/clients/{id}` path documentation
- Added `UpdateClientRequest` schema for PATCH operations
- Documented all status codes, request/response formats, and RBAC requirements

### Breaking Changes

None — fully backward compatible. Extends existing client functionality without modifying previous endpoints.

### Performance Improvements

- Form submission with client-side validation before API calls
- Optimistic UI updates with fallback error states
- Efficient refresh mechanism using state triggers
- Soft-delete prevents data loss while preserving referential integrity

### v1.0.0 Bug Fixes

- Previous build/serving issues resolved with Vite configuration
- Stale bundle issues mitigated with cache control headers

For a detailed feature breakdown, see `docs/RELEASE_1.0.0.md`.
For current implementation history, see `docs/PRE-BETA-DEVELOPMENT.md`.

## Initial Scope

This repository starts with the product and architecture foundation required before feature coding:

- product requirements and release scope
- domain model and permissions model
- architecture decision records
- initial API contracts
- HIPAA-ready security and compliance baseline
- monorepo structure for web, API, worker, shared packages, infrastructure, and operations

## Repository Layout

- `docs/` product, architecture, contracts, and compliance documents
- `apps/web/` responsive web application
- `apps/api/` HTTP API and tenant-aware application services
- `apps/worker/` background jobs for reminders, document processing, and audit support
- `packages/domain/` shared domain types and business concepts
- `infra/` infrastructure-as-code assets
- `ops/` operational runbooks and launch readiness procedures

## Technical Direction

The initial implementation follows a modular monolith approach with clear domain boundaries:

- one practice per tenant
- role-based access control and strict tenant scoping
- relational system of record for operational and clinical data
- encrypted object storage for documents and generated files
- immutable audit trail for PHI-sensitive actions
- responsive web-first product before native mobile apps

## Next Build Steps

1. Scaffold the web, API, and worker applications.
2. Implement tenant, staff, and client identity boundaries.
3. Build audit logging and permission enforcement before feature expansion.
4. Add practice administration, intake, scheduling, and chart workflows incrementally.

## Local Run

- Install dependencies:
  - `npx pnpm@10.7.0 install`
- Start API:
  - `npx pnpm@10.7.0 --filter @faith/api start`
- Start web (auto-builds bundled client first):
  - `npx pnpm@10.7.0 --filter @faith/web start`
- Start worker:
  - `npx pnpm@10.7.0 --filter @faith/worker start`

## Verification

- Step 12 API workflow validation:
  - `node ops/step12-validate.mjs`
- Focused security regression coverage:
  - `node ops/security-regression.mjs`
- High-value browser journeys with Playwright:
  - `npx playwright test tests/e2e/high-value-journeys.spec.mjs`
- Launch-readiness browser audits for accessibility and performance:
  - `npx playwright test tests/e2e/launch-readiness.spec.mjs`

## Telemetry & Performance

- Node services use OpenTelemetry initialization from `packages/telemetry/src/node.js`.
- Browser experience metrics use OpenTelemetry + `web-vitals` from `packages/telemetry/src/browser.js`.
- Health probe endpoints:
  - `GET /health`
  - `GET /health/live`
  - `GET /health/ready`
- API telemetry summary endpoint:
  - `GET /v1/telemetry/summary`
- `exportedViaOtel` is `true` when any of these are configured:
  - `OTEL_EXPORTER_OTLP_ENDPOINT`
  - `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
  - `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`
- Web proxy telemetry summary endpoint:
  - `GET /telemetry/summary`
- Browser vitals ingestion endpoint:
  - `POST /v1/telemetry/vitals`
- Dedicated OTEL health metrics:
  - `faith.service.health_status`
  - `faith.service.dependency.health_status`
  - `faith.service.healthcheck.duration`
  - `faith.service.healthcheck.total`

To export traces/metrics to an OTLP backend, set one or more environment variables before startup:

- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`

## Language / Translation Studio

UI copy is keyed and managed through `@faith/i18n` with runtime locale APIs:

- List/create locales:
  - `GET /v1/i18n/locales`
  - `POST /v1/i18n/locales`
- Load/save catalog:
  - `GET /v1/i18n/catalog?locale=<code>`
  - `PATCH /v1/i18n/catalog/<code>`
- Generate draft translations:
  - `POST /v1/i18n/translate`

If `GOOGLE_TRANSLATE_API_KEY` is set, draft translations are generated via Google Translate API.
If not set, the system generates safe prefixed placeholders (for example, `[es] ...`) so teams can still refine text manually.
