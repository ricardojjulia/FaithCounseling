# AGENTS

You are working in the FaithCounseling repository — a faith-based Christian counseling practice platform. Follow these rules exactly before making changes.

This repository uses `main` as the monitoring and telemetry baseline.

For any work touching UI, telemetry, monitoring, OTEL, health, screens, tabs, workflows, dashboards, or summaries:

- Read [PLANS/FULL-SURFACE-MONITORING.md](PLANS/FULL-SURFACE-MONITORING.md) first.
- Treat that file as the source of truth.

For any work touching security, auditing, compliance, PHI handling, RBAC, auth/session behavior, tenant isolation, exports, retention, impersonation, background jobs, or system automation:

- Read [PLANS/FULL-SECURITY-AND-AUDITING.md](PLANS/FULL-SECURITY-AND-AUDITING.md) first.
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
- Audit ledger and telemetry must remain separate systems: never export raw audit rows via telemetry.
- Security and auditing changes must follow canonical audit result semantics (`success`, `failure`, `denied`, `error`).

Documentation rules:

- If a session changes the monitoring standard, update `PLANS/FULL-SURFACE-MONITORING.md` first.
- If a session changes the security or auditing standard, update `PLANS/FULL-SECURITY-AND-AUDITING.md` first.
- If a session changes user-visible monitoring behavior, also update the relevant README and documentation entries.
- If a session changes user-visible security or auditing behavior, also update the relevant README and documentation entries.

Relationship of the two files:

- `PLANS/FULL-SURFACE-MONITORING.md` is the detailed canonical implementation spec.
- `PLANS/FULL-SECURITY-AND-AUDITING.md` is the detailed canonical implementation spec for security and auditing.
- `AGENTS.md` is the durable session-level instruction layer and defers to the canonical plan files when details are needed.

---

## Git and collaboration rules

- Do not push directly to main.
- Always create a feature branch first.
- Open a pull request into main.
- Keep commits focused and small.
- Use signed commits.
- Never use destructive git commands unless explicitly requested by the user.

## Local workflow guardrails

A shared pre-push hook exists at `.githooks/pre-push`. Enable it in your clone:

```sh
git config core.hooksPath .githooks
```

This hook blocks direct pushes to main and master.

## Repository policy context

- Main branch protections and ruleset behavior are active.
- Signed commits are required.
- Branch + PR workflow is expected.

---

## Required execution checklist for every task

1. Read `AGENTS.md` (this file).
2. Confirm task scope — identify whether monitoring or security plans apply.
3. Make changes on a new feature branch.
4. Run relevant validation and tests.
5. Update docs when behavior or user-facing flow changes.
6. Commit with a signed commit.
7. Push branch and open a PR with a clear summary and validation notes.

## Pull request expectations

Every PR must include:

- **What changed** — describe the change.
- **Why it changed** — describe the motivation.
- **Validation performed** — tests run, manual checks done.
- **Follow-up actions** — anything maintainers need to do after merge.
