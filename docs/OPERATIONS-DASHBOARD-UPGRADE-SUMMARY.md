# Operations Dashboard Upgrade Summary

**Date:** March 30, 2026
**Status:** Implemented, validated, and extended with dashboard drill-downs
**Plan:** [PLANS/OPERATIONS-DASHBOARD-UPGRADE.md](../PLANS/OPERATIONS-DASHBOARD-UPGRADE.md)
**Implementation log:** [docs/OPERATIONS-DASHBOARD-IMPLEMENTATION-LOG-2026-03-30.md](./OPERATIONS-DASHBOARD-IMPLEMENTATION-LOG-2026-03-30.md)

## What shipped

The Operations Dashboard is now backed by a real operations-summary API instead of placeholder text.

It also now supports in-dashboard drill-down workflows so staff can open the underlying queues directly from the summary metrics.

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
- rebuilt the served web bundle and refreshed `apps/web/public/index.html`

## Validation

- `node --env-file=.env apps/api/src/db/migrate.js`
- `pnpm --filter @faith/api exec node --check src/index.js`
- `pnpm lint`
- `pnpm --filter @faith/web build`
- `pnpm test:e2e` — passed (`10/10`)
- `pnpm test:launch-readiness` — passed (`3/3`)
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "practice admin can drill into dashboard queues and open actionable client details|practice admin dashboard renders the upgraded operations summary cards and payload shape"`
