# Operations Dashboard Upgrade Summary

**Date:** March 30, 2026
**Status:** Implemented, validated, and extended with drill-downs, alert thresholds, and 7-day trends
**Plan:** [PLANS/OPERATIONS-DASHBOARD-UPGRADE.md](../PLANS/OPERATIONS-DASHBOARD-UPGRADE.md)
**Implementation log:** [docs/OPERATIONS-DASHBOARD-IMPLEMENTATION-LOG-2026-03-30.md](./OPERATIONS-DASHBOARD-IMPLEMENTATION-LOG-2026-03-30.md)

## What shipped

The Operations Dashboard is now backed by a real operations-summary API instead of placeholder text.

It also now supports in-dashboard drill-down workflows so staff can open the underlying queues directly from the summary metrics, operational alerts when key thresholds are crossed, and 7-day trend context so operators can see whether conditions are stabilizing or getting worse.

### Today's Schedule

- total appointments for the day
- number of counselors with calendar entries
- counselor workload graph using utilization bars
- total 1-hour gaps remaining across available counselors

Availability math now:

- uses declared counselor availability templates when they exist
- applies same-day availability overrides
- falls back to `09:00-12:00` and `13:00-17:00` when no availability template exists

### Priority Queue

- now shows the count of clients explicitly marked `high touchpoint`
- includes staff-facing explanation text so the metric is self-describing
- supports direct drill-down into the flagged-client queue with one-click access to client detail
- now contributes to an alert when flagged clients do not have a future appointment

### Compliance Watch

- clients with unresolved locked-note gaps after their latest completed or checked-in session at:
  - 1 day
  - 3 days
  - 1 week
- assigned but incomplete:
  - documents
  - forms
  - total
- each metric now opens the affected backlog directly from the dashboard

### Clients

The dashboard Clients card now contains only:

- total clients
- clients without scheduled appointment
- portal request totals and statuses

Portal requests combine:

- public registration requests
- portal appointment requests

Status buckets remain separated by request type.

The dashboard now also supports direct drill-downs for:

- clients without scheduled appointments
- outstanding document/form assignments
- portal request backlog

### Operational Alerts

The dashboard now raises alerts for:

- high-touchpoint clients without a future appointment
- note-gap backlogs that cross configured thresholds
- no remaining counselor capacity for the current day
- portal request backlog crossing the configured target

Default thresholds in this release:

- high-touchpoint unscheduled clients: `1`
- note gaps over 1 day: `5`
- note gaps over 3 days: `3`
- note gaps over 7 days: `1`
- portal request backlog: `5`

Thresholds are backend-configured with environment variables, while the dashboard alert strip stays on the existing `dashboard` surface.

### 7-day Trends

The dashboard now includes a compact 7-day trend section for:

- counselor utilization
- documentation backlog
- portal request flow
- unscheduled-client backlog

Trend behavior in this release:

- utilization is derived from booked vs available counselor minutes per day
- documentation uses snapshot counts of unresolved latest-session note gaps
- portal flow shows request creation vs resolution volume
- unscheduled-client trend shows active/waitlist clients who still lack an upcoming appointment

## Technical changes

- added `high_touchpoint` to `clients`
- extended client create/read/update payloads with `highTouchpoint`
- upgraded `GET /v1/operations/summary` with structured dashboard sections
- preserved backward-compatible `priorityItems` and `complianceItems`
- wired dashboard refresh on:
  - staff app boot
  - client mutations
  - scheduling mutations
  - timed dashboard refresh while visible
- added drill-down detail payloads and modal actions without creating a new dashboard surface id
- added backend-derived alert objects and env-backed threshold configuration
- added 7-day trend payloads and compact bar-style dashboard visuals
- rebuilt the served web bundle and refreshed `apps/web/public/index.html`

## Validation

- `node --env-file=.env apps/api/src/db/migrate.js`
- `pnpm --filter @faith/api exec node --check src/index.js`
- `pnpm lint`
- `pnpm --filter @faith/web build`
- `pnpm test:e2e` — passed (`10/10`)
- `pnpm test:launch-readiness` — passed (`3/3`)
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "practice admin can drill into dashboard queues and open actionable client details|practice admin dashboard renders the upgraded operations summary cards and payload shape"` — passed
