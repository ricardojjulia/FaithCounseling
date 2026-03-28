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
- sidebar heading now uses an animated counseling icon with a simplified `Options` label
- sidebar identity block now carries both the signed-in user pill and the live API connection status
- the hamburger menu now collapses and restores the sidebar on both desktop and mobile
- scheduling appointment creation and counselor-calendar filtering now use stable counselor IDs instead of counselor display names
- key metric cards for today's sessions, future appointments, audit-event visibility, and current session identity/state
- operations panels for schedule, priority queue, and compliance watch
- care flow progress indicators
- same-origin `/api/*` proxy for live dashboard hydration from the API service
- monitoring surfaces for API liveness, readiness, and telemetry summary data
- branded monitoring page at `/monitor.html` aligned to the same indigo/light workspace palette as the main app
- branded Operations Studio page at `/operations.html` aligned to the same indigo/light workspace palette as the main app
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
- The live API connection status is intentionally rendered in the sidebar identity area, directly below the user pill, instead of in the top bar
- Scheduling views now submit and filter by `counselorId`, while the API resolves current counselor/client display names from the linked records so workload surfaces stay accurate after profile renames
- `/api/docs` uses a docs-specific CSP/COEP profile so proxied Swagger UI can load its required assets without weakening the rest of the application
- The monitoring OTEL status banner follows the API `exportedViaOtel` flag, which now treats `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` as a valid OTEL export configuration
- React app views, detail tabs, scheduling subviews, Workspace Studio tabs, and standalone pages now participate in the shared surface-monitoring baseline
- The monitoring page now renders overall UI summary cards, top failing surfaces/workflows, health probes, and a per-surface breakdown from the shared telemetry summary in the same light indigo brand palette as the main app
- The standalone Operations Studio page now uses the same light indigo brand system as the main app while keeping its reporting, platform, language, data, and audit workflows intact
- Production web bundles now use versioned asset filenames so UI refreshes pick up the latest JS/CSS without depending on a stale fixed `/assets/app.js` URL
- This current release line is tracked in the root README as `UI enhancements` because the work spans the main shell, monitor surface, operations surface, and frontend delivery behavior

## Next UI Implementation Slices

- authenticated route shell and session handling
- role-aware navigation and feature visibility
- live API-backed dashboards and queue widgets
- accessibility pass for keyboard and screen reader flows
