# FULL-SURFACE MONITORING

**Status:** Current baseline  
**Prepared:** March 28, 2026  
**Updated:** April 21, 2026  
**Stack:** React 18, Mantine 8, standalone web pages, Node.js API, Node.js web server
**Reference codebase state:** `main`

## Purpose

This plan defines the canonical monitoring standard for FaithCounseling after OTEL removal. The goal is to keep every visible surface reviewable through consistent local monitoring, health visibility, and surface-level validation so operators can answer four questions quickly:

- Is the system healthy?
- Which screen or workflow is failing?
- Which screen or workflow appears inconsistent with the intended design?
- Can operators inspect local runtime health without external tracing infrastructure?

Monitoring is local-first. OpenTelemetry / OTEL exporters, OTLP collectors, Jaeger tracing, Prometheus scraping, and browser telemetry beacons are not part of the current implementation standard.

## Chosen Defaults

- Branch baseline: `main`
- Monitoring scope: everything visible
- Local monitoring: always on
- External observability export: not supported
- Browser-side telemetry beacons: not supported
- Telemetry privacy rule: no PHI and no high-cardinality labels

## Scope

Included in this plan:

- monitoring coverage expectations for every visible top-level page, view, tab, and major modal workflow
- health and database-monitoring visibility through the existing monitoring surfaces
- documented surface inventory for regression review and consistency testing
- local operational visibility that does not require external collectors
- audit-intelligence surface monitoring obligations

Explicitly out of scope:

- OTEL / OTLP export
- Jaeger, Prometheus, or collector infrastructure
- browser event beacons and browser vitals ingestion endpoints
- durable internal telemetry storage
- per-user, per-client, or per-record observability
- PHI-bearing monitoring attributes

## Security And Audit Boundary

Monitoring and compliance audit records are separate systems with different purposes.

- Monitoring: privacy-safe operational signals used for health, reliability, and UX visibility.
- Audit ledger: append-only compliance records used for forensics, accountability, and legal review.

Required boundary rules:

- Never export raw audit rows through monitoring flows.
- Emit only privacy-safe aggregate security signals to monitoring.
- Keep actor identifiers, target identifiers, free text, and any potentially sensitive values out of monitoring labels.
- If a feature needs both monitoring and auditing, emit a monitoring summary signal and a separate audit event.

## Canonical Surface Inventory

### Top-level application views

- `auth`
- `counselor_home`
- `tasks`
- `dashboard`
- `users`
- `counselors`
- `clients`
- `scheduling`
- `workspace_studio`
- `clinical`
- `documents`
- `offerings`
- `portal`
- `faith`
- `audit_intelligence`

### Static standalone pages

- `about`
- `operations`
- `monitor`

### Authenticated portal subviews

- `portal.dashboard`
- `portal.profile`
- `portal.appointments`
- `portal.documents`
- `portal.counselor`
- `portal.giving`
- `portal.resources`
- `portal.data_rights`

### Operations Studio tabs

- `operations.reporting`
- `operations.platform`
- `operations.data_retention`
- `operations.language_studio`
- `operations.audit_intelligence`

### Client detail tabs

- `client.demographics`
- `client.contacts`
- `client.clinical`
- `client.intake_preview`
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
- `studio.offerings`
- `studio.portal`

### Scheduling subviews

- `scheduling.general`
- `scheduling.counselor`
- `scheduling.practice`
- `scheduling.month`

### Modal and workflow surfaces

- Client picker modal
- Client create/edit modal
- Appointment composer
- User maintenance dialogs
- Counselor maintenance dialogs
- Portal action dialogs
- Audit event detail drawer or panel
- Audit filter workflow
- Audit export workflow

Placeholder but visible surfaces still count as monitored surfaces. Even when a surface is incomplete, it must still be represented in local QA, consistency checks, and current documentation.

## Monitoring Expectations For Visible Surfaces

Every visible surface must support review across these categories:

- Health
- Reliability
- Error handling
- Consistency with the intended design and workflow

These categories are satisfied through:

- existing health endpoints and database-monitoring endpoints
- monitoring and operations pages
- surface-level browser validation and walkthrough testing
- clear empty, loading, and failure states in the UI

Audit-intelligence-specific minimums:

- filter usage remains functional
- summary and drill-down fetches expose clear success/failure behavior
- empty-result states remain explicit
- export attempts remain visible at the UI level without leaking payload details

## Intended Public Interfaces

This plan establishes these local monitoring interfaces as the current standard:

- `GET /health`
- `GET /health/live`
- `GET /health/ready`
- `GET /v1/monitoring/db`

Do not add OTEL ingestion or export interfaces without updating this plan first.

## Validation And Test Requirements

- Confirm every visible surface on `main` is reachable and renders consistently
- Confirm placeholder surfaces are still represented in QA and documentation
- Confirm visible loading, empty, denied, and error states remain coherent
- Confirm monitoring pages render local health and database-monitoring details
- Confirm local monitoring still works with no OTEL / OTLP environment configuration
- Confirm no PHI or high-cardinality identifiers appear in monitoring-related output

## Implementation Notes For Future Sessions

- Any session that adds or changes a visible surface must update this plan if the monitoring expectation changes materially.
- Any session that changes monitoring behavior must update this plan first, then align `AGENTS.md`, then update user-facing docs.
- Do not reintroduce OpenTelemetry / OTEL instrumentation casually. Treat that as an architectural change that requires explicit documentation updates first.
