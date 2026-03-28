# FULL-SURFACE MONITORING

**Status:** Proposed baseline
**Prepared:** March 28, 2026
**Stack:** React 18, Mantine 8, standalone web pages, Node.js API, Node.js web server, OpenTelemetry
**Reference codebase state:** `v1.6.0` on `main`

## Purpose

This plan defines the canonical monitoring standard for FaithCounseling. The goal is to make every visible surface in the product observable through a consistent OpenTelemetry-aligned model so operators can answer four questions quickly:

- Is the system healthy?
- Which screen or workflow is slow?
- Which screen or workflow is failing?
- Is telemetry available locally and, when configured, exporting to an external OTEL collector?

The repository already contains request-level server telemetry, browser vitals plumbing, health probes, and a monitoring page. What is missing is full-surface coverage across the React app, standalone operational pages, detail tabs, modal workflows, and placeholder but visible surfaces. This plan closes that gap and establishes the permanent implementation standard for future work.

## Chosen Defaults

- Branch baseline: `main`
- Monitoring scope: everything visible
- OTEL strategy: hybrid
- Local monitoring: always on
- External OTEL export: optional and config-driven
- In-app retention: live rolling window only
- Telemetry privacy rule: no PHI and no high-cardinality labels

## Scope

Included in this plan:

- Instrumentation for every visible top-level page, view, tab, and major modal workflow
- Shared surface registry with stable `surface_id` values
- Shared frontend telemetry helper for React and standalone pages
- Structured frontend telemetry ingestion through the API
- Extended `/v1/telemetry/summary` as the canonical monitoring payload
- Monitoring page support for overall summary plus per-surface visibility
- OTEL export compatibility for all collected metrics when configured

Explicitly deferred from this plan:

- Durable internal telemetry storage
- Per-user, per-client, or per-record observability
- PHI-bearing telemetry attributes
- Custom analytics warehouse behavior outside OTEL-compatible export
- A second internal observability UI beyond the existing monitoring page

## Canonical Surface Inventory

### Top-level application views

- `auth`
- `dashboard`
- `users`
- `counselors`
- `clients`
- `scheduling`
- `workspace_studio`
- `clinical`
- `documents`
- `billing`
- `portal`
- `faith`

### Static standalone pages

- `about`
- `operations`
- `monitor`

### Client detail tabs

- `client.demographics`
- `client.insurance`
- `client.contacts`
- `client.clinical`
- `client.diagnoses`
- `client.faith`
- `client.legal`

### Counselor detail tabs

- `counselor.profile`
- `counselor.licenses`
- `counselor.specialties`
- `counselor.faith`
- `counselor.certifications`
- `counselor.employment`
- `counselor.availability`

### Workspace Studio tabs

- `studio.practice`
- `studio.locations`
- `studio.staff`
- `studio.lifecycle`
- `studio.chart`
- `studio.documents`
- `studio.clients`
- `studio.appointments`
- `studio.billing`
- `studio.portal`

### Scheduling subviews

- `scheduling.general`
- `scheduling.counselor`
- `scheduling.practice`

### Modal and workflow surfaces

- Client picker modal
- Client create/edit modal
- Appointment composer
- User maintenance dialogs
- Counselor maintenance dialogs
- Portal action dialogs

Placeholder but visible surfaces still count as monitored surfaces. Until they gain real business logic, they must emit at least visit, active-time, and empty/placeholder-state telemetry.

## Monitoring Categories Required For Every Visible Surface

Every visible surface must expose metrics for:

- Performance
- Usability
- Errors
- Telemetry / export status

These categories are satisfied through the following standard behaviors:

- Performance: load duration, interaction duration, fetch duration, active time, web vitals where applicable
- Usability: surface views, action success/failure, validation friction, empty-state exposure, abandonment proxies for modal workflows
- Errors: UI exceptions, failed fetches, failed mutations, unhandled rejections, degraded dependency state where surfaced to the user
- Telemetry / export status: local monitoring availability plus external OTEL export status

## Canonical Metric Families

Use OTEL semantic conventions first when a standard mapping exists. Use the following custom metrics for application-specific coverage:

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

Required low-cardinality attributes:

- `surface_id`
- `surface_kind`
- `workflow`
- `action`
- `result`
- `role`
- `status_class`
- `empty_state`
- `validation_state`

Forbidden telemetry content:

- PHI
- names
- emails
- client IDs
- staff IDs
- free text
- search terms
- any unbounded or high-cardinality label

## Architecture Direction

### Shared telemetry layer

Add a shared telemetry registry and helper layer that all UI surfaces use. The helper must provide stable APIs for:

- screen view tracking
- load duration tracking
- active time tracking
- interaction timing
- validation error counting
- empty-state counting
- UI error counting
- fetch timing and fetch failure counting

### Frontend instrumentation

Instrument both the React application and the standalone pages.

The React application must capture:

- top-level view changes
- tab changes
- modal open/close
- submit success/failure
- validation failures
- fetch timings through the shared client API layer
- screen dwell / active time
- JS runtime errors and unhandled promise rejections

The standalone pages must capture:

- page views
- refresh/action timings
- action failures
- placeholder/empty-state exposure
- OTEL export status display behavior

### Backend ingestion and aggregation

The API becomes the canonical aggregator for frontend UI telemetry. Add a structured ingestion path:

- `POST /v1/telemetry/events`

Extend the existing summary payload:

- `GET /v1/telemetry/summary`

The summary must expose:

- `summary.overall`
- `summary.frontend`
- `summary.surfaces[]`
- existing request/process/health sections
- top-level `exportedViaOtel`

Keep `GET /telemetry/summary` for web-server process telemetry and merge it into the monitor page as supplemental data, not as the canonical UI summary.

### Monitoring page requirements

The monitoring page is the overall monitoring surface and must show:

- overall health summary
- per-surface metrics
- top failing surfaces
- top failing workflows
- OTEL export state
- health probes and dependency health
- request and browser-vitals context already present today

## Intended Public Interfaces

This plan does not implement runtime behavior itself, but it establishes these intended interfaces as part of the standard:

- `POST /v1/telemetry/events`
- extended `GET /v1/telemetry/summary`
- canonical `surface_id` registry
- `faith.ui.*` metric family

## Validation And Test Requirements

- Confirm every visible surface on `main` emits a corresponding `surface_id`
- Confirm placeholder surfaces emit baseline view and empty-state metrics
- Confirm React fetch workflows emit duration and failure telemetry through the shared client API layer
- Confirm JS runtime errors and unhandled rejections are counted
- Confirm `/v1/telemetry/summary` includes overall, frontend, and per-surface sections
- Confirm the monitoring page renders overall health plus per-surface visibility
- Confirm local monitoring still works when OTEL export is not configured
- Confirm external OTEL export works when OTLP environment variables are configured
- Confirm no PHI or high-cardinality labels are present in emitted telemetry

## Implementation Notes For Future Sessions

- The shared surface registry is mandatory; new surfaces must not invent ad hoc names
- Any session that adds or changes a visible surface must update the registry, summary coverage, and monitoring page representation
- Any session that changes the monitoring standard must update this plan first, then align `AGENTS.md`, then update user-facing docs if behavior changes
