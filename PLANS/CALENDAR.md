# CALENDAR

**Status:** In progress
**Prepared:** March 27, 2026
**Stack:** React 18, Mantine 8, Node.js API, modular monolith
**Reference codebase state:** `v1.6.0` on `feature/mantine-ui`

## Purpose

This plan defines the implementation path for the counseling practice calendar and scheduling module. The current repository already contains appointment CRUD, a daily calendar API, portal appointment requests, counselor availability templates, and audit-aware tenant scoping. What is missing is the actual product surface and the operational workflows that make scheduling usable for a counseling practice.

This implementation turns that partial foundation into a real calendar module with role-aware calendar views, appointment creation flows, client scheduling operations, dashboard entry points, and the first enterprise scheduling controls expected by a practice manager and counselor team.

## Scope

Included in this plan:

- Dedicated Scheduling page in the React app
- Working `Scheduling` sidebar destination
- Working `View Calendar` and `New Appointment` actions from the dashboard
- General calendar view for whole-practice visibility
- Per-counselor calendar view
- Practice-manager operations view for cross-counselor scheduling
- Appointment creation flow using the existing API contract
- Client-aware scheduling workflow with preselected client support
- Portal request conversion path into scheduled appointments
- Availability-aware scheduling foundation
- Conflict handling, audit preservation, and tenant-safe scheduling behavior
- Implementation roadmap for reminders, recurrence, exceptions, and waitlist operations

Explicitly deferred from the first production cut:

- Direct client self-booking without staff confirmation
- Embedded telehealth session launch
- Fully automated waitlist promotion
- Advanced resource booking beyond current location-level constraints
- Cross-practice shared calendars

## Security Principles

The implementation preserves the following system rules:

- Tenant isolation on every appointment, availability, and scheduling query
- PHI-safe handling of client and counselor names already stored with field-level encryption in the persistence layer
- Immutable audit events for appointment create, update, delete, and calendar reads
- No PHI leakage in logs, notifications, or error payloads
- Role-aware access for global schedulers versus counselor self-view workflows
- One practice per tenant, with multiple locations supported within that tenant

## RBAC Rules

| Route / Surface | Practice Owner | Practice Admin | Scheduler / Biller | Counselor | Intern | Client |
| --- | --- | --- | --- | --- | --- | --- |
| Scheduling page | Yes | Yes | Yes | Yes | Yes | No |
| General calendar | Yes | Yes | Yes | Limited | Limited | No |
| Counselor calendar | Yes | Yes | Yes | Own | Own | No |
| Practice operations calendar | Yes | Yes | Yes | No | No | No |
| Create appointment | Yes | Yes | Yes | Limited future scope | No | No |
| Reschedule / cancel any appointment | Yes | Yes | Yes | Assigned-only future scope | No | No |
| Submit portal appointment request | No | No | No | No | No | Yes |
| Convert approved request into appointment | Yes | Yes | Yes | No | No | No |

## Database and Domain Direction

Existing scheduling primitives already present:

- `appointments`
- `availability_templates`
- `portal_appointment_requests`
- `reminders`
- `waitlist_metadata`

Implementation additions planned for later slices:

- `appointment_series` for recurring appointments
- `appointment_series_occurrences` or exception rows for recurrence overrides
- `availability_overrides` for PTO, holidays, blocked time, and one-off openings
- optional `location_resources` if the practice needs room-level booking beyond `location_name`

Shared domain enums remain centered in `packages/domain/src/index.js` and will expand only when new scheduling states or recurrence concepts are introduced.

## Implementation Phases

### Phase 1 — Scheduling entry points

Deliverables:

- Create `PLANS/CALENDAR.md`
- Add a dedicated Scheduling page to the React app
- Wire the sidebar `Scheduling` destination
- Make `View Calendar` and `New Appointment` work from the dashboard
- Reuse the existing appointment and calendar endpoints without introducing a parallel API layer

### Phase 2 — Core scheduling workflows

Deliverables:

- Appointment composer modal with client, type, counselor, time, location, and timezone
- Role-aware calendar presentation for general, counselor, and practice-manager views
- Day-based calendar agenda for immediate operational usage
- Client-aware scheduling entry point support
- Conflict display based on the API’s `409 Scheduling conflict detected` response

### Phase 3 — Availability and operational hardening

Deliverables:

- Availability-aware slot guidance from counselor templates
- Portal request conversion into appointments
- More complete appointment lifecycle actions: reschedule, complete, cancel, no-show
- Better location filtering and workload visibility

### Phase 4 — Enterprise counseling calendar features

Deliverables:

- Recurring appointment series
- Availability overrides, closures, PTO, and holiday exceptions
- Reminder execution and reminder state management
- Waitlist operational tooling and manual promotion path
- Reporting hooks for utilization and schedule risk

## Files Changed

| File | Action |
| --- | --- |
| `PLANS/CALENDAR.md` | New |
| `apps/web/src/App.jsx` | Enhanced for Scheduling route and modal context |
| `apps/web/src/components/WorkspaceGrid.jsx` | Enhanced to open calendar and appointment composer |
| `apps/web/src/components/SchedulingPage.jsx` | New |
| `apps/web/src/lib/clientApi.js` | Enhanced with scheduling API helpers |

## Verification

1. Open the application and confirm the sidebar `Scheduling` item renders a dedicated page.
2. Click `View Calendar` on the dashboard and confirm it opens the Scheduling page.
3. Click `New Appointment` on the dashboard and confirm the composer opens.
4. Create an appointment with valid inputs and confirm it appears in the Scheduling view.
5. Attempt a conflicting appointment and confirm the UI surfaces the conflict response.
6. Confirm counselors default to their own calendar view while practice managers can see broader calendar modes.
7. Confirm all appointment data remains tenant scoped and existing appointment APIs still function.

## Current Status

Implementation has started with the Scheduling page shell, dashboard wiring, and appointment composer.

## Next Steps

1. Add appointment editing and cancellation flows.
2. Add client-detail entry points to schedule a specific client.
3. Convert approved portal requests into appointments in one action.
4. Add availability override management and recurrence.

## Deferred Work

- Open self-booking in the portal
- Room-level resource booking
- Full reminder delivery engine UI
- Automated waitlist promotion
- Embedded telehealth launch inside appointments
