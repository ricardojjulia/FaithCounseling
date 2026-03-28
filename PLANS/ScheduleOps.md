# SCHEDULE OPS

**Status:** In progress  
**Prepared:** March 2026  
**Stack:** React 18, Mantine 8, Node.js API, modular monolith  
**Reference version:** `v2.1.0`  
**Supersedes:** CALENDAR.md Phase 4 scope

---

## Purpose

ScheduleOps is the operational layer on top of the core scheduling module. Where the Calendar plan delivered the booking surface (composer, calendar views, waitlist, reminders), ScheduleOps delivers the controls that make a counseling practice actually run: counselor availability exceptions, recurring appointment series, reminder lifecycle management, and utilization reporting for practice managers.

This phase is named after its intent — not just scheduling, but *operating* a schedule at practice scale.

---

## Scope

### Included

| Feature | Description |
| --- | --- |
| Availability overrides | Block time or open one-off slots for counselors (PTO, holidays, closures, special openings) |
| Recurring appointment series | Create and manage repeating appointment patterns (weekly, bi-weekly, monthly) with individual exception support |
| Reminder lifecycle management | Full reminder state machine: pending → sent / cancelled; retry logic; delivery timestamp tracking |
| Utilization reporting | Counselor load, location occupancy, appointment volume by period — exposed as a summary endpoint and a dashboard widget |

### Explicitly Deferred

- Automated waitlist promotion rules (threshold-based auto-promote)
- Client self-booking without staff confirmation
- Cross-practice shared calendars
- Embedded telehealth session launch
- Room-level resource locking beyond `location_name`
- SMS/email delivery engine (reminder dispatch remains a pluggable hook, not a built-in provider)

---

## Security Principles

All existing scheduling security rules apply and extend:

- Every availability override and series record is tenant-scoped; no cross-tenant query possible
- PHI-safe: client and counselor names in series records use field-level encryption identical to `appointments`
- Audit events emitted for: override create/update/delete, series create/cancel, reminder state transitions
- RBAC enforcement on new routes identical to existing scheduling RBAC (see table below)
- No PHI in logs, error payloads, or notification stubs

---

## RBAC Rules

| Route / Surface | Practice Owner | Practice Admin | Scheduler/Biller | Counselor | Intern | Client |
| --- | --- | --- | --- | --- | --- | --- |
| Availability overrides — view | Yes | Yes | Yes | Own | Own | No |
| Availability overrides — create/edit/delete | Yes | Yes | Yes | Own | No | No |
| Recurring series — view | Yes | Yes | Yes | Own | Own | No |
| Recurring series — create/edit/cancel | Yes | Yes | Yes | Limited future | No | No |
| Utilization report | Yes | Yes | Yes | No | No | No |
| Reminder lifecycle — view | Yes | Yes | Yes | Own | Own | No |
| Reminder lifecycle — update state | Yes | Yes | Yes | No | No | No |

---

## Database Additions

### `availability_overrides`

Stores exceptions to a counselor's normal availability template — blocks, PTO, holidays, closures, and one-off openings.

```sql
CREATE TABLE availability_overrides (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  tenant_id     VARCHAR(36)  NOT NULL,
  staff_id      VARCHAR(36)  NOT NULL,
  override_date DATE         NOT NULL,
  override_type ENUM('block','open')  NOT NULL DEFAULT 'block',
  reason        VARCHAR(255),
  start_time    TIME,
  end_time      TIME,
  all_day       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ao_tenant_staff (tenant_id, staff_id),
  INDEX idx_ao_date (override_date)
);
```

**`override_type` semantics:**

- `block` — counselor unavailable for the indicated date/time window (PTO, holiday, closure)
- `open` — one-off opening outside the normal template (Saturday session, extended hours)

`start_time` / `end_time` are NULL when `all_day = 1`.

---

### `appointment_series`

Groups recurring appointments under a single series descriptor.

```sql
CREATE TABLE appointment_series (
  id                  VARCHAR(36)   NOT NULL PRIMARY KEY,
  tenant_id           VARCHAR(36)   NOT NULL,
  counselor_id        VARCHAR(36)   NOT NULL,
  client_id           VARCHAR(36)   NOT NULL,
  client_name_enc     TEXT,
  counselor_name_enc  TEXT,
  appointment_type    VARCHAR(50),
  recurrence_rule     VARCHAR(255)  NOT NULL,
  start_date          DATE          NOT NULL,
  end_date            DATE,
  duration_minutes    INT           NOT NULL DEFAULT 50,
  location_id         VARCHAR(36),
  remote_session      TINYINT(1)    NOT NULL DEFAULT 0,
  status              ENUM('active','paused','cancelled') NOT NULL DEFAULT 'active',
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_series_tenant (tenant_id),
  INDEX idx_series_counselor (tenant_id, counselor_id),
  INDEX idx_series_client (tenant_id, client_id)
);
```

`recurrence_rule` stores a compact rule string: `weekly`, `biweekly`, `monthly-date`, `monthly-weekday`.  
Individual appointment rows link back via a `series_id` column added to `appointments` (nullable, no FK for flexibility).

---

## API Endpoints

### Availability Overrides

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/v1/scheduling/availability-overrides` | List overrides for a staff member and date range |
| `POST` | `/v1/scheduling/availability-overrides` | Create an override |
| `PATCH` | `/v1/scheduling/availability-overrides` | Update an override |
| `DELETE` | `/v1/scheduling/availability-overrides` | Remove an override |

Query params for GET: `staffId`, `from` (date), `to` (date).

### Appointment Series

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/v1/scheduling/series` | List series for tenant (filterable by counselorId, clientId, status) |
| `POST` | `/v1/scheduling/series` | Create a series and generate the initial occurrence appointments |
| `PATCH` | `/v1/scheduling/series` | Update series metadata or status (pause/cancel) |

### Utilization Report

| Method | Path                          | Description                                                                        |
| ------ | ----------------------------- | ---------------------------------------------------------------------------------- |
| `GET`  | `/v1/scheduling/utilization`  | Summary of appointment volume, counselor load, location occupancy for a date range |

Query params: `from`, `to`, `counselorId` (optional).

Response shape:

```json
{
  "period": { "from": "2026-03-01", "to": "2026-03-31" },
  "totalAppointments": 42,
  "byStatus": { "scheduled": 30, "completed": 10, "cancelled": 2 },
  "byCounselor": [{ "counselorId": "...", "count": 12, "completedCount": 10 }],
  "byLocation": [{ "locationName": "Main Office", "count": 25 }]
}
```

---

## Implementation Plan

### Step 1 — DB Query Layer (`apps/api/src/db/queries/appointments.js`)

Add query functions:

- `listAvailabilityOverrides(tenantId, staffId, from, to)`
- `createAvailabilityOverride(fields)` — inserts row, returns created record
- `updateAvailabilityOverride(id, tenantId, fields)` — defensive tenant check
- `deleteAvailabilityOverride(id, tenantId)`
- `listSeries(tenantId, filters)` — supports counselorId, clientId, status filters
- `createSeries(fields)` — inserts series row; caller is responsible for generating occurrences
- `updateSeries(id, tenantId, fields)` — status updates, metadata edits
- `getUtilizationSummary(tenantId, from, to, counselorId?)` — aggregation query over `appointments`

Row mappers: `rowToOverride`, `rowToSeries`.

---

### Step 2 — API Route Handlers (`apps/api/src/index.js`)

Add three handler functions following the existing pattern:

**`handleAvailabilityOverrides(req, res, tenantId)`**  

- `GET` → `listAvailabilityOverrides` with query param validation
- `POST` → validate body, `randomUUID()` id, `createAvailabilityOverride`, emit audit event
- `PATCH` → `updateAvailabilityOverride`, emit audit event
- `DELETE` → `deleteAvailabilityOverride`, emit audit event
- In-memory fallback: return `[]` for GET, echo body for write ops (same pattern as reminders in-memory mode)

**`handleAppointmentSeries(req, res, tenantId)`**  

- `GET` → `listSeries`
- `POST` → validate body, create series row, generate the initial N appointment occurrences (max 52), return series + occurrence ids
- `PATCH` → update series status; if cancelled, update all future `scheduled` occurrence appointments to `cancelled`

**`handleUtilization(req, res, tenantId)`**  

- `GET` only → `getUtilizationSummary`, RBAC check (practice_owner / practice_admin / scheduler only)

Wire all three into the routing switch in `index.js` under the `/v1/scheduling/` path prefix.

---

### Step 3 — API Client (`apps/web/src/lib/clientApi.js`)

Add client-side helpers:

```js
fetchAvailabilityOverrides({ staffId, from, to })
createAvailabilityOverride(data)
patchAvailabilityOverride(data)
deleteAvailabilityOverride(id)

fetchSeries({ counselorId, clientId, status })
createSeries(data)
patchSeries(data)

fetchUtilization({ from, to, counselorId })
```

---

### Step 4 — UI (`apps/web/src/components/SchedulingPage.jsx`)

#### Availability Overrides Panel

New `AvailabilityOverridesPanel` component within `SchedulingPage.jsx`:

- Practice managers and admins see all counselors' overrides with a counselor filter
- Counselors see only their own overrides
- Date range picker (defaults to current month)
- Table: date, counselor, type (block/open), time window or "All day", reason, Edit/Delete action buttons
- **Add Override** button → inline modal with date picker, type select, optional time range, reason field
- Optimistic local state update on save/delete

Add an **Availability** tab alongside Appointments / Waitlist / Reminders.

#### Recurring Series Panel

New `SeriesPanel` component:

- Table of active series: client, counselor, recurrence rule, start date, next occurrence, status badge
- **New Series** button → composer-style modal: select client, counselor, type, recurrence rule dropdown, start date, duration, location/remote toggle
- **Cancel Series** action updates status and voids future occurrences (with confirmation dialog)

Add a **Recurring** tab.

#### Utilization Widget

Add a summary bar to the **Appointments** tab header (visible only to practice managers and admins):

- Shows: total appointments, completion rate %, most active counselor, and busiest location for the selected period
- Pulls from `fetchUtilization` on tab mount, 60-second cache
- Renders as a row of `<Paper>` stat cards using Mantine's `<SimpleGrid>`

---

### Step 5 — Reminder Lifecycle Hardening

Enhance the existing `RemindersPanel` and worker loop:

**UI improvements (`SchedulingPage.jsx` — `RemindersPanel`):**

- Add a **Cancel** action button per pending reminder (calls `patchReminderRecord({ id, status: 'cancelled' })`)
- Surface `sentAt` timestamp on sent reminders
- Add a `pending` / `sent` / `cancelled` filter toggle (Mantine `SegmentedControl`)

**Worker (`apps/worker/src/index.js`):**

- Add a `cancelled` status guard — skip any reminder already cancelled between poll cycles
- Log delivery channel alongside reminder type for better operational observability
- Emit an audit event for each successful `sent` state transition (using `createAuditEvent` from `@faithcounseling/domain`)

---

## Files Changed

| File | Action |
| ---- | ------ |
| `PLANS/ScheduleOps.md` | New — this plan |
| `apps/api/src/db/queries/appointments.js` | Enhanced — overrides, series, utilization query functions |
| `apps/api/src/index.js` | Enhanced — three new route handlers |
| `apps/web/src/lib/clientApi.js` | Enhanced — API client helpers for overrides, series, utilization |
| `apps/web/src/components/SchedulingPage.jsx` | Enhanced — AvailabilityOverridesPanel, SeriesPanel, utilization widget, reminder lifecycle UI |
| `apps/worker/src/index.js` | Enhanced — reminder cancel guard, audit event on send |
| `docs/change-log.md` | Enhanced — v2.1.0 entry |

---

## Verification

1. **Availability overrides** — Create a "block" override for a counselor on tomorrow's date; confirm it appears in the Availability tab; confirm the calendar view reflects no slots for that counselor on that date.
2. **Recurring series** — Create a weekly series starting next Monday for 4 occurrences; confirm 4 appointment rows are created in the Appointments tab with the correct dates.
3. **Cancel series** — Cancel the series above; confirm all 4 future appointments move to `cancelled` status.
4. **Utilization report** — Navigate to Appointments tab as a practice manager; confirm the stat card bar renders with correct totals matching the appointment table.
5. **Reminder cancel** — Create a reminder in Pending status; click Cancel; confirm status badge changes to Cancelled and the reminder no longer appears in the worker poll results.
6. **Worker audit** — Start the worker with `DB_NAME` set; wait for a due reminder to fire; confirm an audit event row appears in the `audit_log` table with a non-null `id`.
7. **Tenant isolation** — Confirm no override, series, or utilization query returns data from a different tenant.
8. **RBAC** — Log in as a counselor; confirm the Utilization widget is not rendered and direct GET to `/v1/scheduling/utilization` returns 403.

---

## Current Status

Implementation starting now at v2.1.0 on `main`.

## Next Steps (Phase 5 preview)

- Automated waitlist promotion rules (threshold + counselor capacity triggers)
- Portal self-booking with staff confirmation gate
- Integrated reminder delivery (email via configurable SMTP, SMS via pluggable provider)
- Cross-location reporting and capacity planning dashboard
