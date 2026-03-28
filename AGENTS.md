# AGENTS

This repository uses `main` as the monitoring and telemetry baseline.

For any work touching UI, telemetry, monitoring, OTEL, health, screens, tabs, workflows, dashboards, or summaries:

- Read [PLANS/FULL-SURFACE-MONITORING.md](PLANS/FULL-SURFACE-MONITORING.md) first.
- Treat that file as the source of truth.

Required repo rules:

- Every visible surface must expose monitoring signals for performance, usability, errors, and telemetry/export status.
- New or modified screens, tabs, pages, and major modal workflows must be added to the shared surface registry.
- New or modified visible surfaces must appear in the monitoring summary.
- New or modified visible surfaces must be represented on the monitoring page.
- Follow OTEL hybrid naming: use OTEL semantic conventions first and `faith.ui.*` only for app-specific gaps.
- Local monitoring must remain available even when OTEL export is not configured.
- External OTEL export must remain optional and config-driven.
- Never emit PHI, free text, names, emails, IDs, or other high-cardinality labels in telemetry.
- Placeholder but visible screens still require baseline monitoring coverage.

Documentation rules:

- If a session changes the monitoring standard, update `PLANS/FULL-SURFACE-MONITORING.md` first.
- If a session changes user-visible monitoring behavior, also update the relevant README and documentation entries.

Relationship of the two files:

- `PLANS/FULL-SURFACE-MONITORING.md` is the detailed canonical implementation spec.
- `AGENTS.md` is the durable session-level instruction layer and defers to the plan file when details are needed.
