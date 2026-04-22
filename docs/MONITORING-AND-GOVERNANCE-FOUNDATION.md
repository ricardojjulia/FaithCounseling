# Monitoring And Governance Foundation

**Last updated:** April 21, 2026  
**Scope:** local monitoring, runtime health, monitoring governance, and audit-boundary rules

---

## Summary

Faith Counseling now treats monitoring as a local, application-owned concern. The current foundation is centered on:

- API liveness and readiness health endpoints
- database monitoring for authorized admin users
- monitoring and operations pages that read local application state
- privacy-safe monitoring boundaries that stay separate from the audit ledger

OpenTelemetry / OTEL instrumentation, OTLP export, Jaeger tracing, Prometheus scraping, and browser telemetry beacons are not part of the current implementation standard.

Historical release notes and archived plans may still reference earlier observability work. Treat those references as historical context only, not as current runtime behavior.

---

## Canonical Sources

- `AGENTS.md`
- `PLANS/FULL-SURFACE-MONITORING.md`
- `PLANS/FULL-SECURITY-AND-AUDITING.md`

The monitoring plan is the implementation source of truth. The security and auditing plan remains the source of truth for audit semantics, PHI boundaries, and privileged access behavior.

---

## Current Monitoring Surface

### Health endpoints

- `GET /health`
- `GET /health/live`
- `GET /health/ready`

### Admin monitoring endpoint

- `GET /v1/monitoring/db`

### Product surfaces

- `/monitor.html`
- `/operations.html`

These surfaces are intended to expose local runtime health and operational visibility without requiring external collectors or exporters.

---

## Privacy And Audit Boundary

- Monitoring and auditing remain separate systems.
- Monitoring data must stay aggregate and privacy-safe.
- Never emit PHI, free text, names, emails, or high-cardinality identifiers in monitoring labels or payloads.
- Never export raw audit rows through monitoring flows.

---

## Removal Notes

As of April 21, 2026:

- OTEL / OTLP configuration was removed from the current environment example.
- Browser-side telemetry helpers were removed from the web application and public pages.
- The repo no longer treats Jaeger, Prometheus, or OTLP export as current supported infrastructure.

If external observability is reintroduced later, the monitoring plan and contributor documentation must be updated first.
