# Monitoring And Governance Foundation

**Date:** March 28, 2026  
**Scope:** planning baselines, OTEL health coverage, frontend telemetry foundation, monitoring UI, audit-governance alignment

## Summary

This implementation establishes the first full monitoring foundation for visible product surfaces and adds the canonical repo governance needed to keep future work aligned.

The delivered scope combines:

- canonical monitoring instructions in `AGENTS.md`
- canonical monitoring plan in `PLANS/FULL-SURFACE-MONITORING.md`
- canonical security and auditing plan in `PLANS/FULL-SECURITY-AND-AUDITING.md`
- explicit API liveness/readiness health metrics and summary visibility
- structured frontend telemetry ingestion and aggregation
- shared surface registry and UI instrumentation baseline
- monitoring page support for overall UI and per-surface visibility

## Planning And Governance

The repository now has two durable plan baselines and one durable instruction layer:

- `PLANS/FULL-SURFACE-MONITORING.md`
  - defines the monitoring standard for every visible surface
  - defines `faith.ui.*` metric families and OTEL hybrid naming rules
  - defines privacy limits, low-cardinality labels, and per-surface expectations
- `PLANS/FULL-SECURITY-AND-AUDITING.md`
  - defines audit event semantics, investigation requirements, and audit-vs-telemetry separation
  - defines privileged audit access rules and telemetry privacy boundaries
- `AGENTS.md`
  - requires future sessions to read the canonical plan files before making related changes
  - enforces the monitoring baseline and the security/audit baseline

## API And Telemetry Changes

The backend monitoring model now supports both service health and frontend surface telemetry.

### Health

- `GET /health`
- `GET /health/live`
- `GET /health/ready`
- OTEL health metrics:
  - `faith.service.health_status`
  - `faith.service.dependency.health_status`
  - `faith.service.healthcheck.duration`
  - `faith.service.healthcheck.total`

### Frontend telemetry ingestion

- `POST /v1/telemetry/events`
  - accepts structured frontend telemetry batches
  - feeds the same in-memory telemetry aggregator used for the monitoring summary

### Summary expansion

`GET /v1/telemetry/summary` now includes:

- `summary.overall`
- `summary.frontend`
- `summary.surfaces`
- `summary.health`

The top-level `exportedViaOtel` flag now treats any configured OTLP endpoint, including metrics-only OTLP configuration, as active export.

## Frontend Instrumentation Foundation

The UI now emits a shared set of OTEL-aligned events and metrics across the main product surfaces.

### Shared surface model

Added a shared surface registry covering:

- top-level React views
- client detail tabs
- counselor detail tabs
- scheduling subviews and tabs
- Workspace Studio tabs
- standalone pages
- key modal workflows

### Shared frontend helpers

Added:

- React/browser telemetry helper
- `useSurfaceTelemetry` hook
- standalone-page telemetry helper for `operations`, `monitor`, and `about`
- shared request instrumentation through the web API client layer

### Current instrumentation coverage

- app shell and top-level view switching
- client detail tabs
- counselor detail tabs
- scheduling tabs and scheduling subviews
- Workspace Studio tabs
- monitor page
- operations page
- about page
- shared API fetch path
- global runtime error and unhandled promise rejection capture

## Monitoring Page Changes

The monitoring page now shows both backend runtime telemetry and frontend surface telemetry in one view.

Added sections for:

- overall UI summary
- top failing surfaces
- top failing workflows
- health probe and dependency status
- OTEL export state
- per-surface breakdown with views, load/fetch latency, actions, errors, validation friction, empty states, and last seen time

## Privacy And Compliance Boundary

The implementation explicitly keeps telemetry and auditing separate:

- no raw audit rows in OTEL or frontend telemetry
- no PHI, names, emails, free text, or high-cardinality labels in telemetry
- audit intelligence surfaces are monitored through aggregate operational signals only

## Validation

The following checks were run during implementation:

- `node --check apps/api/src/index.js`
- `node --check packages/telemetry/src/node.js`
- `pnpm --filter @faith/web build`

## Remaining Follow-On Work

This foundation does not yet represent every form and modal workflow in the product. The next instrumentation slices should focus on:

- additional modal workflows
- more explicit validation/failure instrumentation for form-heavy flows
- broader empty-state and abandonment tracking
- audit-intelligence-specific surface instrumentation once that UI expands
