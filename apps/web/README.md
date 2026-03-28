# Web App

Lightweight modern UI shell for Faith Counseling operations.

## Goals

- modern, clean visual hierarchy
- powerful at-a-glance operations dashboard
- light runtime footprint without framework overhead
- responsive behavior across desktop and mobile

## Run Locally

From the repository root:

- `pnpm start:web`

Or from this folder:

- `node server.js`

Default URL: `http://localhost:3000`

## Current UI Scope

- sidebar navigation shell
- global search across today's schedule
- redesigned `Practice Operations Center` header with an animated counseling mark and stronger operational hierarchy
- key metric cards for today's sessions, future appointments, audit-event visibility, and current session identity/state
- operations panels for schedule, priority queue, and compliance watch
- care flow progress indicators
- same-origin `/api/*` proxy for live dashboard hydration from the API service
- monitoring surfaces for API liveness, readiness, and telemetry summary data
- OTEL status UI that reflects shared OTLP, traces-only, or metrics-only endpoint configuration
- interactive API docs served through the same-origin proxy at `/api/docs`
- branded static About page at `/about` with product-overview content and operational linkouts

## Monitoring Notes

- Monitoring and operations pages consume `/api/v1/telemetry/summary` for runtime telemetry
- Frontend surfaces emit structured telemetry to `/api/v1/telemetry/events`
- Health probes are available through `/api/health`, `/api/health/live`, and `/api/health/ready`
- Dashboard metric cards consume `/api/v1/appointments` for session and future-appointment counts
- Dashboard audit visibility consumes `/api/v1/audit/intelligence?days=7&limit=1` for admin-capable roles and degrades to an explicit admin-visibility message for other roles
- The active session identity is intentionally rendered in the metric band, not in the top bar, so the header stays focused on navigation and workspace context
- `/api/docs` uses a docs-specific CSP/COEP profile so proxied Swagger UI can load its required assets without weakening the rest of the application
- The monitoring OTEL status banner follows the API `exportedViaOtel` flag, which now treats `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` as a valid OTEL export configuration
- React app views, detail tabs, scheduling subviews, Workspace Studio tabs, and standalone pages now participate in the shared surface-monitoring baseline
- The monitoring page now renders overall UI summary cards, top failing surfaces/workflows, health probes, and a per-surface breakdown from the shared telemetry summary

## Next UI Implementation Slices

- authenticated route shell and session handling
- role-aware navigation and feature visibility
- live API-backed dashboards and queue widgets
- accessibility pass for keyboard and screen reader flows
