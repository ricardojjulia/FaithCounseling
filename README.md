# Faith Counseling

Christian counseling practice management SaaS for solo counselors, group practices, and multi-location clinics.

## Version

- Current release: `2.1.7`
- Status: production-ready (client module + MySQL persistence layer + Docker local DB + counselor profiling + Mantine UI + revamped ops/monitoring + explicit health probes + OTEL health export + full Scheduling module with Waitlist, Reminders & Calendar DB support + waitlist-to-appointment promotion + audit UUID hardening + deep DB engine monitoring dashboard + full Audit Intelligence UI redesign + structured PHI-safe API logging + live dashboard appointment and audit metrics + full Reporting tab UI redesign)

## v2.1.7 — Reporting Tab UI Redesign (March 2026)

### v2.1.7 Overview

Replaces the two raw JSON textarea boxes in the Operations Studio Reporting tab with a purpose-built dashboard. The previous implementation dumped entire API payloads into read-only textareas, making it impossible to scan trends, compare figures, or understand the shape of the data without hand-parsing JSON. The redesign renders every field in a form suited to its meaning — numbers as numbers, ratios as percentages, time-series as bars, aging buckets as colored cells, and lists as sortable tables.

### v2.1.7 Changes

#### Operations Studio — Reporting Tab (`apps/web/public/operations.js`)

##### Background and motivation

`initReporting()` previously attached click handlers that fetched the API and wrote the raw response to `el('reportingSummary').value` and `el('platformSummary').value`. Neither textarea element exists in the current HTML anymore. The replacement decouples fetch, render, and DOM attachment into three layers so each section can be tested or extended independently.

##### `initReporting()`

- Wires `.rpt-window-btn` preset toggling so clicking 7/30/90/180 flips the `active` class without any hidden `<input>` — consistent with the active-button-as-state-source pattern used in the Audit tab
- Attaches Run Report → `runPracticeReport()` and Refresh → `runPlatformSummary()`

##### `runPracticeReport()`

Reads the selected window from `document.querySelector('.rpt-window-btn.active')?.dataset?.days ?? '30'`, calls `GET /v1/reporting/overview?days=N`, writes the as-of timestamp from `summary.generatedAt` to `#reportingAsOf`, and delegates to `renderPracticeReport(summary)`.

##### `renderPracticeReport(summary)`

| Section | What it renders |
| --- | --- |
| Stat cards | Sessions (total), Completed, Remote Rate (%), Avg/Counselor — each with a colored top-accent card |
| Referral sources | Proportional horizontal bar chart; bar width is relative to the highest-count source |
| Document completion | Progress bar (green fill) showing completed vs pending vs overdue; percentage caption beneath |
| Assessment trends | Proportional bar chart of assessment types administered in the window |
| AR aging | Grid of cells — Current, 30–60d, 60–90d, 90d+ — with amber/danger color coding on older buckets |
| Outstanding by client | Table with client ID, outstanding balance, and invoice count |
| Location performance | Table with total / completed / remote session counts and a completion-% column |

##### `renderPlatformSummary(summary)`

| Section | What it renders |
| --- | --- |
| Provisioning | Stat pills (Total / Queued / In Progress / Completed), recent tenants table with status badges and timestamps |
| Impersonation | Stat pills (Total / Active / Ended), recent sessions table with tenant, role, reason, status, start time, duration |
| Data exports | Stat pills (Total / Queued / Completed / Failed), recent exports table with type, format, requester, status, timestamps |
| Retention policy | Grid of policy cards using `.plat-policy-item` CSS — each shows data type, retention days, and purgeability flag |

##### Helper functions added

| Function | Purpose |
| --- | --- |
| `fmtMoney(cents)` | Formats an integer cent value as a locale `$` string with two decimal places |
| `fmtPct(ratio)` | Formats a 0–1 float as a `%` string with one decimal |
| `rptBars(containerId, items, labelKey, valueKey, total)` | Generic horizontal bar chart renderer; bar widths are relative to the max value in the dataset; optionally appends a % share label |
| `platStatPill(label, value, color)` | Renders a `.plat-stat` card with a colored top border using the existing CSS |
| `statusBadgeHtml(status)` | Wraps a status string in a `.status-badge` span matched to the existing CSS class variants |

### v2.1.7 Validation

- `node --check apps/web/public/operations.js` — no syntax errors
- All CSS class names (`plat-stat`, `plat-stat-label`, `plat-stat-value`, `plat-policy-item`, `rpt-aging-cell`, `rpt-aging-val`, `status-badge`, etc.) reference existing definitions in `operations.html`; no new styles required
- Run Report with a 30-day window should populate all six sections: stat cards, referral bars, doc completion, assessment bars, AR aging + client table, location table
- Refresh Platform should populate all four sections: provisioning, impersonation, exports, retention policy
- A `null` or missing subsection (e.g. no `clients` array in AR) degrades gracefully to a "No outstanding AR" table row, never a JS error

## v2.1.6 — Dashboard Metrics Correction (March 2026)

### v2.1.6 Overview

Corrects the top dashboard metrics so they reflect live operational data instead of placeholder or miswired values. Before this fix, the second card was labeled `Appointment Types` and showed how many appointment types were configured, which is not an operational workload metric. The third card rendered `Audit Event Sync` but never loaded any audit data at all, so it silently stayed at the initial `0` value even when audit activity existed. The dashboard now reports actual scheduling load and real audit activity.

### v2.1.6 Changes

#### Dashboard metric cards (`apps/web/src/App.jsx`, `apps/web/src/components/Metrics.jsx`)

- Replaced the `Appointment Types` dashboard card with `Future Appointments`
- Removed the misleading configuration-style metric that counted `/api/v1/appointment-types`
- Dashboard scheduling metrics now come from `/api/v1/appointments`, which makes the cards reflect actual scheduled work instead of setup metadata
- `Today's Sessions` now counts non-cancelled appointments scheduled for the current calendar day
- `Future Appointments` now counts non-cancelled appointments scheduled at or after the current time
- Replaced the static `+12% from yesterday` and `5 configured` badge text with live, relevant metadata tied to what the cards actually measure

#### Audit metric wiring

- Fixed the dashboard audit metric bug where `auditEvents` stayed at `0` because the frontend initialized the state but never fetched any audit summary data
- Dashboard now calls `GET /api/v1/audit/intelligence?days=7&limit=1` for admin-capable roles and uses `summary.total` as the displayed count
- The card label now reflects what is actually being shown: `Audit Events` instead of the vague `Audit Event Sync`
- Non-admin roles now see `Admin visibility required` instead of a misleading silent zero-fetch state
- When the summary loads successfully, the card metadata now states `Last 7 days` so operators know the count is a bounded audit window, not a lifetime total

### v2.1.6 Validation

- `pnpm --filter @faith/web build`
- Dashboard metric source code now fetches live appointment data and live audit summary data
- The `Future Appointments` label and metadata are rendered from the React source instead of the old appointment-type placeholder
- Audit metric no longer relies on the default `0` initializer alone

## v2.1.5 — Structured PHI-Safe API Logging (March 2026)

### v2.1.5 Overview

Hardens the API logging layer so server failures, request warnings, audit failures, and startup events always emit usable structured JSON lines without leaking request bodies, raw SQL, names, emails, tokens, cookies, or other PHI/PII-sensitive content.

### v2.1.5 Changes

#### API logging contract (`apps/api/src/index.js`, `apps/api/src/lib/log.js`)

- Added a shared structured logger for API runtime events
- Every request now gets a correlation-friendly `x-request-id` response header; inbound IDs are preserved when present, otherwise the API generates one
- Request logs now use normalized route templates like `/v1/appointments/:id` instead of raw paths
- Caught request failures emit structured `request.failed` lines with method, route, request ID, status code, duration, tenant context, actor role, and sanitized error details
- Request warnings now cover non-5xx client errors and slow requests; successful low-latency traffic stays quiet unless `API_LOG_ALL_REQUESTS=1`
- Startup logs and listen failures now use the same JSON logger instead of plain `console.log` / `console.error`

#### Audit console output (`apps/api/src/index.js`)

- Audit events now flow through the same structured logger as `audit.event`
- Audit write failures now emit structured `audit.write_failed` lines with request correlation and sanitized error detail
- Audit logging keeps IDs required for audit usability, but the logger still strips or redacts free text and credential material

#### Privacy and usability guardrails

- Logged request context is bounded to operational metadata: request ID, method, normalized route, tenant ID, actor role, auth state, status code, and duration
- Request/response bodies are never logged
- Raw SQL statements and payload dumps are never logged
- Error messages are sanitized before emission so obvious secrets, cookies, bearer tokens, JWTs, and email addresses are redacted

### v2.1.5 Validation

- `node --check apps/api/src/lib/log.js`
- `node --check apps/api/src/index.js`
- Live malformed JSON request to `POST /v1/auth/login` returned `400` and emitted structured `request.failed` + `request.complete` log lines with request correlation
- Live auth-gated requests emitted structured `request.complete` warning lines instead of disappearing silently
- The API now returns `x-request-id` headers for correlation

## v2.1.4 — Audit Intelligence UI Redesign (March 2026)

### v2.1.4 Overview

Replaces the two raw JSON textarea boxes in the Audit Intelligence tab with a purpose-built investigation interface. Operators now see a descriptive introduction, a compact filter bar, live stat cards, proportional breakdown charts, and a properly formatted event log table — all without touching the API.

### v2.1.4 Changes

#### Operations Studio — Audit Intelligence Tab (`apps/web/public/operations.html`, `apps/web/public/operations.js`)

##### What changed and why

The previous UI rendered the API's JSON payloads directly into `<textarea>` elements. That made it impossible to scan for patterns, compare counts at a glance, or read an action name without parsing dot-notation mentally. The redesign treats operators as the primary audience and presents every field in a form suited to its meaning.

##### Intro banner

A contextual description at the top of the tab explains what the audit log tracks and explicitly notes that no PHI, client names, or free-text is stored — only action codes, roles, target types, and IDs. This gives operators immediate context before they run a query.

##### Filter bar

- **Time window** — three preset buttons (7 days / 30 days / 90 days) replace the raw number input; the selected window is shown as an active pill
- **Result** — dropdown: All results / Success / Denied / Error
- **Actor role** — dropdown pre-populated with all known roles (Practice Owner, Practice Admin, Counselor, Scheduler / Biller, System)
- **Action contains** — free-text search field; supports Enter key to trigger query without reaching for the button
- **Run Query** button — aligned flush to the bottom of the filter row

##### Summary stat cards (appear after first query)

Four cards in a row, each with a large numeric value and a colored top accent:

| Card | Accent | What it shows |
| --- | --- | --- |
| Total Events | Neutral | All events in the selected window |
| Successful | Green | Events with `result: success` |
| Denied | Amber | Access or permission blocks |
| Errors | Red | Unexpected failures |

##### Breakdown charts (two cards side by side)

- **Top Actions** — horizontal bar chart of the 8 most frequent action codes; bars are indigo; each bar row shows the full action string and a count
- **Activity Breakdown** — two stacked bar charts: By Actor Role (purple bars) and By Target Type (cyan bars); up to 8 rows each

All bars animate to their correct width on render via a CSS transition.

##### Event Log table

Replaces the raw events textarea with a proper table:

| Column | Content |
| --- | --- |
| (dot) | Color-coded result indicator — green glow for success, amber for denied, red for error |
| Action | Action string in monospace; the module prefix (e.g. `billing`) is highlighted indigo; the result label appears below in matching color |
| Actor Role | Color-coded badge — purple for practice_owner, blue for practice_admin, green for system, amber for counselor |
| Target | Target type in bold with the target ID in grey monospace below |
| Tenant | Tenant ID in monospace grey |
| When | Relative time ("3m ago") with full locale timestamp below |

A description line beneath the card title narrates the active filters. A count badge shows the number of events returned.

##### Zero state

When a query returns no events, a centered search icon, heading, and suggestion message replace the empty table — no blank textarea, no confusion.

##### JS helpers added (`apps/web/public/operations.js`)

- `escapeHtml(str)` — XSS-safe string rendering for all dynamic content
- `fmtRelTime(iso)` — converts ISO timestamp to relative label (s / m / h / d ago)
- `fmtActionHtml(action)` — renders dot-notation action strings with the module prefix highlighted
- `roleBadgeClass(role)` — maps role strings to CSS badge modifier classes
- `runAuditQuery()` — extracted from the click handler; also called on Enter in the action filter field
- `renderAuditSummary(summary, days)` — drives stat cards and all three bar charts
- `renderAuditEvents(events, days)` — drives the event log table and zero state

### v2.1.4 Validation

- Querying with no filters renders stat cards, both breakdown charts, and the full event log
- Applying a result filter recalculates all panels correctly
- Pressing Enter in the action filter field triggers the query
- Zero-state renders when no events match; event log card is hidden
- Role badges render the correct color for each known role
- All dynamic content is XSS-safe via `escapeHtml`
- `node --check` passes on `operations.js`

## v2.1.3 — Deep Database Engine Monitoring (March 2026)

### v2.1.3 Overview

Replaces the single "is the database reachable?" health ping with a live, rich monitoring surface that queries MySQL internal status and metadata tables. The monitoring dashboard now displays real-time connection counts, InnoDB buffer pool efficiency, query-type breakdowns, throughput, slow-query alerting, and per-table row/size estimates — all alongside an animated database-engine graphic.

### v2.1.3 Changes

#### API — `GET /v1/monitoring/db` (`apps/api/src/index.js`, `apps/api/src/lib/security.js`)

New public (no-auth) monitoring endpoint that queries the running MySQL instance and returns:

| Field | Source | Description |
| --- | --- | --- |
| `uptime.seconds` | `SHOW GLOBAL STATUS · Uptime` | Seconds the MySQL process has been running |
| `connections.current` | `Threads_connected` | Open connections right now |
| `connections.running` | `Threads_running` | Queries actively executing |
| `connections.maxUsed` | `Max_used_connections` | High-water mark since last restart |
| `connections.maxAllowed` | `SHOW GLOBAL VARIABLES · max_connections` | Configured connection ceiling |
| `queries.total` | `Questions` | Cumulative queries handled |
| `queries.slow` | `Slow_queries` | Queries that exceeded `long_query_time` |
| `queries.selects/inserts/updates/deletes` | `Com_*` | Per-operation counts |
| `bufferPool.hitRatio` | `Innodb_buffer_pool_read_requests` vs `Innodb_buffer_pool_reads` | InnoDB cache efficiency (%) |
| `bufferPool.pagesUsed/pagesTotal` | `Innodb_buffer_pool_pages_*` | Buffer pool page utilization |
| `bufferPool.sizeBytes` | `innodb_buffer_pool_size` | Configured buffer pool size |
| `throughput.bytesReceived/bytesSent` | `Bytes_received/sent` | Cumulative network I/O |
| `tables[]` | `information_schema.TABLES` | Per-table row estimate and storage size (data + index) |

Returns `{ mode: 'unavailable' }` gracefully when `DB_NAME` is not configured. Route registered in `resolveRoute()`. Exempt from RBAC (same policy as other monitoring/telemetry endpoints).

#### Monitoring Dashboard — Database Engine Section (`apps/web/public/monitor.html`, `apps/web/public/monitor.js`)

A new **Database Engine** section appears between the Health Probes row and the Request Activity charts. It contains:

**Animated SVG graphic** — a 3D database cylinder with:

- Glowing elliptical cap with a pulsing center dot
- Three staggered pulsing ground rings (blue, indigo, cyan) that expand and fade outward
- An animated data-stream line falling into the cylinder top with a travelling packet dot
- Three orbiting data packets (cyan, indigo, amber) traversing an elliptical orbit around the cylinder's equator at different speeds (3.2 s, 3.2 s offset by half cycle, 2.1 s) — all implemented with pure SVG SMIL `<animateMotion>` and `<mpath>` — no external libraries

**Six metric tiles** (pulled from `/api/v1/monitoring/db` on every 15-second refresh):

| Tile | Metric | Notes |
| --- | --- | --- |
| Uptime | `d h m` formatted uptime | Shows days when > 24 h |
| Connections | Current open count | Sub-line: running threads · max used / max allowed |
| Buffer Pool Hit | InnoDB hit ratio % | Sub-line: pages used / total |
| Total Queries | Cumulative query count | Sub-line: S / I / U / D breakdown |
| Slow Queries | Count of slow queries | Value turns amber when non-zero |
| Throughput | Total bytes received + sent | Human-readable (KB / MB / GB) |

**Table Storage & Row Estimates grid** — one pill per table showing:

- Table name (monospace, truncated with tooltip)
- Estimated row count
- Storage size (data + index, shown as KB or MB)

**JS helpers added** (`apps/web/public/monitor.js`):

- `fmtBytes(bytes)` — converts raw byte count to human-readable string
- `fmtUptimeLong(sec)` — converts seconds to `Xd Xh Xm` format
- `updateDbPanel(data)` — drives all DB panel DOM updates; falls back gracefully when data is null or unavailable

**Wired into the refresh cycle**: `/api/v1/monitoring/db` is added as a fourth parallel fetch in `Promise.allSettled`, so it updates on every 15-second refresh alongside health, API telemetry, and web telemetry.

### v2.1.3 Validation

- `curl http://localhost:3001/v1/monitoring/db` returns `mode: "live"` with all fields populated when `DB_NAME` is set
- Returns `mode: "unavailable"` when `DB_NAME` is not configured (no crash, no 500)
- Monitoring dashboard "Database Engine" section renders with live data on page load and subsequent refreshes
- Animated SVG renders in Chrome, Firefox, and Safari without external dependencies
- Slow Queries tile turns amber correctly when `Slow_queries > 0`
- `monitor.js` passes `node --check` syntax validation

## v2.1.0 — ScheduleOps: Audit Hardening, Waitlist Promotion & Startup Hardening (March 2026)

### v2.1.0 Overview

Patches latent defects discovered during tenant-model validation and ScheduleOps rollout, delivers the first ScheduleOps Phase 4 quick-wins, and hardens local API startup behavior when shared dev ports are already occupied.

### v2.1.0 Changes

#### Domain — Audit UUID Auto-Generation (`packages/domain/src/index.js`)

`createAuditEvent` now auto-generates a `crypto.randomUUID()` `id` before spreading caller-provided fields. Previously, callers never supplied an `id`, causing `AUDIT_FAIL: Column 'id' cannot be null` on every audit write in DB mode. All downstream callers (`createAppointment`, `updateAppointment`, `deleteAppointment`, and any module that emits audit events) benefit automatically — no call-site changes required.

#### Scheduling — Waitlist Promote-to-Appointment (`apps/web/src/components/SchedulingPage.jsx`)

The **Waitlist** tab now exposes a **Schedule** button on each row. Clicking any waitlist entry pre-seeds the appointment composer with that client's id and immediately opens the composer on the Appointments tab, ready for a counselor and time slot. This closes the manual waitlist promotion gap — formerly, staff had to open the composer separately and re-enter the client.

- `WaitlistPanel` accepts a new `onPromote(clientId)` prop
- `SchedulingPage` manages a `composerClientId` state that overrides the default `initialClientId` for the duration of a promoted session
- Selecting **New Appointment** from the toolbar resets `composerClientId` back to the default, preserving existing entry-point behavior

#### API Runtime — Graceful Port Collision Handling (`apps/api/src/index.js`, `apps/api/package.json`, `start-api.sh`)

The API server now handles `EADDRINUSE` startup failures explicitly instead of crashing with an unhandled Node `error` event. When the default/shared local port is already occupied, startup exits cleanly and prints a direct remediation hint.

- `pnpm start:api` keeps the default/shared startup path
- `pnpm start:api:standalone` starts the API on port `3104` for isolated local work
- `apps/api/package.json` adds `start:standalone`
- `start-api.sh` now loads `.env` and honors an existing `PORT` override while defaulting to `3104`

### v2.1.0 Validation

- Audit events written in DB mode no longer produce `Column 'id' cannot be null` errors
- Clicking **Schedule** on any waitlist row opens the composer pre-seeded with the correct client
- **New Appointment** toolbar button continues to function as before
- `pnpm start:api` now reports a clear port-in-use message instead of terminating on an unhandled server event
- `pnpm start:api:standalone` successfully starts the API on port `3104`
- All previously-passing smoke tests (`step11`, `step12`, `security-regression`) remain green

## AegisTrail Security & Auditing Baseline (March 2026)

Initial implementation slice for the AegisTrail initiative has been added.

### Governance and standards

- Added canonical security/auditing baseline at `PLANS/FULL-SECURITY-AND-AUDITING.md`
- Extended `PLANS/FULL-SURFACE-MONITORING.md` to include audit intelligence surface obligations and audit-vs-telemetry separation rules
- Updated `AGENTS.md` so security/auditing work now requires the canonical security plan

### API

- Added `GET /v1/audit/intelligence` (admin-gated) for bounded-window audit investigation
- Supports filters: `days`, `limit`, `action`, `actorRole`, `result`, and optional `tenantId` for platform admin workflows
- Returns aggregated summary slices (`byResult`, `byAction`, `byActorRole`, `byTargetType`) plus recent events
- Added runtime in-memory audit buffer for local/in-memory mode visibility

### Operations Studio

- Added **Audit Intelligence** tab to `apps/web/public/operations.html`
- Added bounded filters and read-only outputs for summary and recent events
- Wired frontend behavior in `apps/web/public/operations.js`

### Privacy and compliance boundary

- Audit ledger data and monitoring telemetry are explicitly separated
- Raw audit rows are not to be exported via OTEL telemetry

## Tenant-Model Update (March 2026)

This update hardens tenant-isolated DB behavior and completes blocker remediation needed for full cross-module smoke validation in DB mode.

### Highlights

- Tenant-safe compatibility fixes across platform, clinical, documents, inventory, billing, portal, and faith DB query paths.
- SQL timestamp normalization for DB writes to avoid ISO-to-TIMESTAMP failures.
- DB-mode handler fixes where in-memory lookups previously caused false "not found" errors.
- CORS preflight hardening for local web origins used by integration smoke validation.
- Added tenant guardrail checklist and CI gate design in `docs/security/tenant-query-safety-checklist.md`.

### Validation

- `node ops/step11-smoke.mjs` passed.
- `node ops/step12-validate.mjs` passed.
- `node ops/security-regression.mjs` passed.

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

### Monitoring dashboard — DB dependency always shown as `unhealthy` (2026-03-28)

**Timestamp:** 2026-03-28 · commit `503ee6b`

**Problem:** The Health Probes & Dependencies section of the monitoring dashboard (`apps/web/public/monitor.html` + `monitor.js`) displayed every dependency as `unhealthy` regardless of actual DB status. This was misleading — the API and database were healthy but the badge always rendered red.

**Root cause:** In `updateHealthChecks()` inside `monitor.js`, the dependencies block destructured `Object.entries(health.dependencies)` as `([name, status])`. Each value in `health.dependencies` is a full object (`{ status: 2, observedAt: "..." }`), not a raw numeric status code. The function then called `healthBadge(status)` with the entire object. Inside `healthLabel()`:

```js
function healthLabel(status) {
  if (status === 2) return 'healthy';   // { status:2, ... } !== 2 → false
  if (status === 1) return 'degraded';  // { status:2, ... } !== 1 → false
  return 'unhealthy';                   // always reached
}
```

Because a plain object never strict-equals a number, the function always fell through to `'unhealthy'`, even when `status.status === 2`.

**Fix:** Renamed the destructured variable from `status` to `dep` to avoid shadowing confusion, and passed `dep?.status` (the numeric value) to `healthBadge()`:

```js
// Before
dependencies.map(([name, status]) => healthBadge(status))

// After
dependencies.map(([name, dep]) => healthBadge(dep?.status))
```

**File changed:** `apps/web/public/monitor.js` — no rebuild required (served as a static file).

---

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

#### Frontend Monitoring Foundation

- Added a shared visible-surface registry for app views, tabs, scheduling subviews, workspace studio tabs, static pages, and key modal workflows
- Added structured frontend telemetry ingestion via `POST /v1/telemetry/events`
- Extended `GET /v1/telemetry/summary` with `overall`, `frontend`, and `surfaces` sections for per-surface monitoring aggregation
- Added app-shell, tab, scheduling, shared fetch-layer, and standalone page instrumentation for surface views, load time, active time, fetch timing, action outcomes, and UI errors
- Expanded the monitoring page to show overall UI health, top failing surfaces/workflows, health probe status, OTEL export state, and a per-surface breakdown sourced from the API summary

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
- Frontend telemetry ingestion endpoint:
  - `POST /v1/telemetry/events`
- API telemetry summary now includes:
  - `summary.overall`
  - `summary.frontend`
  - `summary.surfaces`
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
- Dedicated UI monitoring metrics:
  - `faith.ui.screen.view`
  - `faith.ui.screen.load.duration`
  - `faith.ui.screen.active.duration`
  - `faith.ui.interaction.duration`
  - `faith.ui.action.total`
  - `faith.ui.validation.error.total`
  - `faith.ui.empty_state.view.total`
  - `faith.ui.error.total`
  - `faith.ui.fetch.duration`
  - `faith.ui.fetch.error.total`

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
