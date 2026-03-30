# Operations Dashboard Implementation Log

**Date:** March 30, 2026
**Feature:** Operations Dashboard Upgrade
**Canonical plan:** [PLANS/OPERATIONS-DASHBOARD-UPGRADE.md](../PLANS/OPERATIONS-DASHBOARD-UPGRADE.md)

## Initial Planning Entry

### Objective

Replace the current placeholder Operations Dashboard cards with a production-ready daily operations summary for staff users.

### Approved Feature Scope

- `Today's Schedule`
  - counselor count with calendar entries
  - counselor workload graph
  - total 1-hour counselor gaps
- `Priority Queue`
  - count of clients marked high touchpoint
  - explanatory copy
- `Compliance Watch`
  - clients at 1 day, 3 days, and 1 week without locked notes after completed or checked-in sessions
  - assigned but incomplete documents/forms total
- `Clients`
  - total clients
  - clients without scheduled appointments
  - combined portal requests with separated status buckets

### Data Model Change

- Add `high_touchpoint` boolean to `clients`
- Default value: `false`
- Exposed to staff create/edit/read flows only

### API Change

Upgrade `GET /v1/operations/summary` to provide structured dashboard sections:

- `todaySchedule`
- `priorityQueue`
- `complianceWatch`
- `clientsBox`

Legacy `priorityItems` and `complianceItems` remain present as derived compatibility fields.

### Dashboard UI Goals

- Fetch operations summary through the React app on dashboard load
- Replace placeholder card text with metrics and workload visualization
- Keep the existing `dashboard` monitored surface
- Use Mantine/layout primitives only for the workload display

### Test Plan

- availability fallback and override calculations
- counselor workload and 1-hour gap math
- high-touchpoint client counting
- note-gap compliance thresholds
- incomplete documents/forms aggregation
- combined portal request aggregation
- dashboard render coverage and refresh behavior

## Step Log

### Step 0 — Planning checkpoint published

Planned outputs for the first Git checkpoint:

- [PLANS/OPERATIONS-DASHBOARD-UPGRADE.md](../PLANS/OPERATIONS-DASHBOARD-UPGRADE.md)
- this implementation log

No product code changes are included in the planning checkpoint.

### Step 1 — Client high-touchpoint foundation completed

Implemented:

- added `high_touchpoint` to the `clients` schema
- added migration compatibility for existing databases
- extended client create/read/update API payloads with `highTouchpoint`
- extended the shared client DB query mapper
- added staff-side editing in the existing client modal/form flow

Files touched in this step:

- `apps/api/src/db/schema.sql`
- `apps/api/src/db/migrate.js`
- `apps/api/src/db/queries/clients.js`
- `apps/api/src/index.js`
- `apps/web/src/components/ClientForm.jsx`

### Step 2 — Operations summary backend completed

Implemented:

- upgraded `GET /v1/operations/summary` to return:
  - `todaySchedule`
  - `priorityQueue`
  - `complianceWatch`
  - `clientsBox`
- preserved derived `priorityItems` and `complianceItems`
- added DB-aware summary loading for:
  - clients
  - appointments
  - progress notes
  - document assignments
  - form assignments
  - portal registration requests
  - portal appointment requests
  - staff availability templates
  - availability overrides
- added counselor workload and 1-hour gap calculations
- added note-gap compliance thresholds
- added combined portal-request aggregation with separated status buckets

Files touched in this step:

- `apps/api/src/index.js`

### Step 3 — Dashboard UI upgrade completed

Implemented:

- added operations-summary fetching in the React app for staff users
- added timed dashboard refresh while visible
- refreshed dashboard data after client and scheduling mutations
- replaced placeholder dashboard cards with:
  - Today’s Schedule metrics and counselor workload bars
  - Priority Queue high-touchpoint metric
  - Compliance Watch note-gap and incomplete-assignment metrics
  - Clients summary with portal request status breakdowns
- kept the client-create action in the dashboard while removing the roster from the dashboard card

Files touched in this step:

- `apps/web/src/App.jsx`
- `apps/web/src/components/WorkspaceGrid.jsx`
- `apps/web/src/components/SchedulingPage.jsx`
- `apps/web/src/lib/clientApi.js`
- `packages/i18n/src/index.js`

### Step 4 — Validation and release docs completed

Validation results:

- `node --env-file=.env apps/api/src/db/migrate.js` — passed
- `pnpm --filter @faith/api exec node --check src/index.js` — passed
- `pnpm lint` — passed
- `pnpm --filter @faith/web build` — passed
- `pnpm test:e2e` — passed (`9/9`)
- `pnpm test:launch-readiness` — passed (`3/3`)

Notes:

- initial migration failed because some older local databases did not yet include `clients.court_ordered`; the new `high_touchpoint` migration was updated to avoid positional `AFTER` dependence
- `launch-readiness` was rerun serially after `test:e2e` because both suites target the same `3001/3002` Playwright web-server ports

Final documentation outputs:

- [PLANS/OPERATIONS-DASHBOARD-UPGRADE.md](../PLANS/OPERATIONS-DASHBOARD-UPGRADE.md)
- [docs/OPERATIONS-DASHBOARD-IMPLEMENTATION-LOG-2026-03-30.md](./OPERATIONS-DASHBOARD-IMPLEMENTATION-LOG-2026-03-30.md)
- [docs/OPERATIONS-DASHBOARD-UPGRADE-SUMMARY.md](./OPERATIONS-DASHBOARD-UPGRADE-SUMMARY.md)

### Step 5 — Dashboard drill-down workflows completed

Implemented:

- added actionable drill-down rows to `GET /v1/operations/summary` for:
  - high-touchpoint clients
  - note-gap compliance clients
  - outstanding documents/forms
  - unscheduled clients
  - portal request backlog
- added dashboard drill-down modals so staff can open detail lists without leaving the dashboard immediately
- added targeted actions from drill-down rows to:
  - open client detail
  - open scheduling for unscheduled clients
  - open Documents for assignment backlog review
  - open Workspace Studio Portal for portal-request review
- kept drill-down data inside the existing `dashboard` monitored surface without introducing PHI-bearing telemetry labels or a new surface id

Files touched in this step:

- `apps/api/src/index.js`
- `apps/web/src/App.jsx`
- `apps/web/src/components/WorkspaceGrid.jsx`
- `apps/web/src/components/WorkspaceStudio/WorkspaceStudioPage.jsx`
- `packages/i18n/src/index.js`
- `tests/e2e/high-value-journeys.spec.mjs`

Validation results for this step:

- `pnpm --filter @faith/api exec node --check src/index.js` — passed
- `pnpm lint` — passed
- `pnpm --filter @faith/web build` — passed
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "practice admin can drill into dashboard queues and open actionable client details|practice admin dashboard renders the upgraded operations summary cards and payload shape"` — passed
- `pnpm test:e2e` — passed (`10/10`)
- `pnpm test:launch-readiness` — passed (`3/3`)

Operational note:

- full Playwright suites were rerun serially because both target the shared `3001/3002` local stack; concurrent startup still produces expected `EADDRINUSE` contention

### Step 6 — Operational alerts and thresholds completed

Implemented:

- added backend-derived operational alerts on top of the dashboard summary
- introduced env-backed alert thresholds for:
  - high-touchpoint clients without future appointments
  - note gaps over 1 day
  - note gaps over 3 days
  - note gaps over 1 week
  - portal request backlog
- added a capacity alert when no tracked counselor 1-hour gaps remain for the rest of the day
- added a dashboard alert strip with severity badges and direct action buttons back into the existing drill-down queues or calendar
- kept alert telemetry low-cardinality by tracking only alert action ids and severity, without client or counselor identifiers

Default thresholds in this pass:

- high-touchpoint unscheduled clients: `1`
- note-gap over 1 day: `5`
- note-gap over 3 days: `3`
- note-gap over 7 days: `1`
- portal request backlog: `5`

Files touched in this step:

- `apps/api/src/index.js`
- `apps/web/src/components/WorkspaceGrid.jsx`
- `packages/i18n/src/index.js`
- `tests/e2e/high-value-journeys.spec.mjs`

Validation results for this step:

- `pnpm lint` — passed
- `pnpm --filter @faith/api exec node --check src/index.js` — passed
- `pnpm --filter @faith/web build` — passed
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "practice admin can drill into dashboard queues and open actionable client details|practice admin dashboard renders the upgraded operations summary cards and payload shape"` — passed
- `pnpm test:e2e` — passed (`10/10`)
- `pnpm test:launch-readiness` — passed (`3/3`)

### Step 7 — 7-day trend visibility completed

Implemented:

- added 7-day trend payloads for:
  - counselor utilization
  - documentation backlog
  - portal request inflow vs resolved volume
  - unscheduled-client backlog
- added compact bar-based dashboard visuals without introducing a chart library
- used real historical dates already present in appointments, notes, and portal request records
- kept the trend display inside the existing `dashboard` surface and reused the existing operations-summary fetch path

Trend model in this pass:

- counselor utilization uses booked minutes divided by available minutes per day across tracked counselors
- documentation trend tracks unresolved latest-session note gaps as day-based snapshots for `1`, `3`, and `7` day thresholds
- portal trend tracks requests created per day and requests resolved per day
- unscheduled-client trend tracks active/waitlist clients without an upcoming appointment for each day in the 7-day window

Files touched in this step:

- `apps/api/src/index.js`
- `apps/web/src/components/WorkspaceGrid.jsx`
- `packages/i18n/src/index.js`
- `tests/e2e/high-value-journeys.spec.mjs`

Validation results for this step:

- `pnpm lint` — passed
- `pnpm --filter @faith/api exec node --check src/index.js` — passed
- `pnpm --filter @faith/web build` — passed
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "practice admin dashboard renders the upgraded operations summary cards and payload shape|practice admin can drill into dashboard queues and open actionable client details"` — passed
- `pnpm test:e2e` — passed (`10/10`)
- `pnpm test:launch-readiness` — passed (`3/3`)

### Step 8 — Clients surface separation regression fixed

Issue found:

- `currentView === 'clients'` was still rendering the shared dashboard `WorkspaceGrid`, which made the dashboard and client screen look effectively identical and hid the intended client-maintenance workflow
- the staff top bar still labeled the clients surface as `Operations Dashboard`, which reinforced the regression

Implemented:

- restored a dedicated `Clients` workspace surface with:
  - client search
  - status filtering
  - summary counts
  - create flow
  - detailed edit entry for existing clients
  - quick edit modal for lightweight updates
  - direct schedule-client actions
- updated the app routing so only `dashboard` renders the operations-summary grid
- updated the top bar copy so the clients workspace identifies itself as a client-maintenance surface instead of the dashboard
- restored existing-client `Edit` to open the full detailed client record with demographics, insurance, contacts, clinical, diagnoses, faith, and legal tabs

Files touched in this step:

- `apps/web/src/App.jsx`
- `apps/web/src/components/ClientsPage.jsx`
- `apps/web/src/components/TopBar.jsx`
- `packages/i18n/src/index.js`
- `apps/api/data/i18n/en.json`
- `apps/api/data/i18n/es.json`
- `tests/e2e/high-value-journeys.spec.mjs`

Validation results for this step:

- `pnpm lint` — passed
- `pnpm --filter @faith/web build` — passed
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "practice admin sees a dedicated client workspace instead of the dashboard grid|practice admin can create a client and schedule an appointment from the current workspace flow"` — passed
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "practice admin sees a dedicated client workspace instead of the dashboard grid|practice admin edit from clients workspace opens the detailed client record screen"` — passed
- `pnpm test:e2e` — passed (`12/12`) after the detailed edit restoration and scheduling regression hardening
- `pnpm test:launch-readiness` — passed (`3/3`)
