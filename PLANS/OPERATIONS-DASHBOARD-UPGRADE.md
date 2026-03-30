# OPERATIONS DASHBOARD UPGRADE

**Status:** Approved implementation plan
**Prepared:** March 30, 2026
**Scope:** React dashboard, operations summary API, client schema, docs, tests
**Monitoring baseline:** [PLANS/FULL-SURFACE-MONITORING.md](FULL-SURFACE-MONITORING.md)

## Purpose

Upgrade the staff-facing Operations Dashboard from placeholder cards into a real daily operations summary for practice leadership, scheduling, and compliance follow-up. The implementation must stay within the existing `dashboard` monitoring surface and keep all telemetry low-cardinality and PHI-safe.

## Approved Scope

The dashboard upgrade covers four cards:

- `Today's Schedule`
- `Priority Queue`
- `Compliance Watch`
- `Clients`

This work does not introduce a new page or monitoring standard. It upgrades the existing dashboard content and data pipeline.

## Product Decisions

- Add a first-class client-level `highTouchpoint` flag.
- Define note-gap compliance from the latest `completed` or `checked_in` appointment that still lacks a locked progress note.
- When a counselor has no declared availability, assume a local workday of `09:00-12:00` and `13:00-17:00`.
- The `Clients` card must combine:
  - public portal registration requests
  - authenticated portal appointment requests
- Keep request status buckets separated by request type.

## Implementation Plan

### Step A — Client high-touchpoint foundation

- Add `high_touchpoint` to `clients` with default `false`.
- Extend DB schema and DB query mappers.
- Extend `/v1/clients` create/read/update payloads.
- Add staff-side editing support in the client create/edit flow.

### Step B — Operations summary backend

Upgrade `/v1/operations/summary` so it returns structured data for:

- `todaySchedule`
- `priorityQueue`
- `complianceWatch`
- `clientsBox`

Required behavior:

- `todaySchedule`
  - total appointments
  - counselors with entries
  - counselor workload rows
  - total 1-hour gaps
  - appointment list
- availability calculation
  - start from declared availability templates when present
  - apply same-day overrides
  - use fallback workday when no template exists
- `priorityQueue`
  - count of clients marked `highTouchpoint`
  - explanatory copy
- `complianceWatch`
  - unresolved note gaps at:
    - 1 day
    - 3 days
    - 1 week
  - assigned but incomplete:
    - documents
    - forms
    - total
- `clientsBox`
  - total clients
  - clients without a scheduled appointment
  - portal request totals with separate status buckets for:
    - public registration requests
    - portal appointment requests

Backward compatibility:

- Keep `priorityItems` and `complianceItems` in the response as derived summaries so existing callers do not break.

### Step C — Dashboard UI upgrade

Update the React dashboard flow so `App.jsx` loads `/api/v1/operations/summary` and passes it into `WorkspaceGrid`.

Refresh requirements:

- initial staff app boot
- after client mutations
- after scheduling mutations
- timed refresh while the dashboard is visible

UI expectations:

- `Today's Schedule`
  - appointment total
  - counselors with entries
  - 1-hour gaps
  - counselor workload bars built with Mantine/layout primitives only
- `Priority Queue`
  - high-touchpoint count
  - explicit explanation of what the count means
- `Compliance Watch`
  - 1-day, 3-day, 1-week note-gap metrics
  - incomplete documents/forms total
- `Clients`
  - total clients
  - clients without scheduled appointment
  - combined portal request totals/statuses
  - remove the current client roster list from this dashboard card

### Step D — Monitoring, tests, and release docs

- Keep the existing `dashboard` surface id.
- Do not add PHI, names, emails, free text, client ids, or counselor ids to telemetry.
- Add or update tests for:
  - fallback availability assumptions
  - availability overrides
  - workload and gap calculations
  - high-touchpoint counts
  - note-gap thresholds
  - incomplete form/document totals
  - combined portal request aggregation
  - dashboard rendering states
- Update release docs and README after implementation ships.

## API Shape

`GET /v1/operations/summary`

Returns:

```json
{
  "summary": {
    "timezone": "America/New_York",
    "generatedAt": "2026-03-30T12:00:00.000Z",
    "todaySchedule": {
      "totalAppointments": 0,
      "counselorsWithEntries": 0,
      "oneHourGapsTotal": 0,
      "workload": [],
      "items": []
    },
    "priorityQueue": {
      "highTouchpointClients": 0,
      "description": ""
    },
    "complianceWatch": {
      "noteGapClients": {
        "over1Day": 0,
        "over3Days": 0,
        "over7Days": 0
      },
      "outstandingAssignments": {
        "total": 0,
        "documents": 0,
        "forms": 0
      }
    },
    "clientsBox": {
      "totalClients": 0,
      "withoutScheduledAppointment": 0,
      "portalRequests": {
        "total": 0,
        "publicRegistrationStatuses": {},
        "appointmentRequestStatuses": {}
      }
    },
    "priorityItems": [],
    "complianceItems": []
  }
}
```

## Acceptance Criteria

- Dashboard cards render live operational data instead of placeholder text.
- `Priority Queue` is derived from a real client flag.
- `Compliance Watch` is based on unresolved documentation and incomplete assignments.
- `Clients` card reflects only the requested client and portal-request metrics.
- Counselor workload and 1-hour gap calculations honor declared availability, same-day overrides, and fallback assumptions.
- Dashboard monitoring remains on the existing `dashboard` surface with privacy-safe attributes only.
