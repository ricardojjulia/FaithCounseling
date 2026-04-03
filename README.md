# Faith Counseling

Faith Counseling is a web-first, faith-based Christian counseling practice management platform for solo counselors, group practices, and multi-location clinics.

It is built specifically for Christian counseling practices and supports daily end-to-end workflows including client management, scheduling, clinical charting, forms, portal interactions, offerings tracking, compliance-focused operations, and observability.

## Faith-Based Christian Practice Focus

- designed for faith-based Christian counseling organizations and ministries
- supports optional faith-integrated care planning and counseling workflows
- preserves counselor clinical judgment while enabling Christian care context
- includes safeguards so spiritual content remains intentional, contextual, and optional where appropriate

## What This Project Is For

- running faith-based Christian counseling operations in one platform across staff and client-facing workflows
- improving counselor decision support with structured, explainable workflow guidance
- enforcing strong tenant scoping, auditability, and security boundaries
- supporting incremental product evolution with a modular monolith architecture

## Core Capabilities

- **Faithful Workflows:** counselor-facing recommendation workspace powered by 27 deterministic clinical rules across 8 care categories, with explainable rationale, trend analysis, and three interchangeable canvas views (Classic List, Radial Hub, Priority Matrix)
- **Clinical Chart:** session notes, internal notes, treatment plans, progress tracking, and homework
- **Operations Dashboard:** live daily operations summary with counselor workload, note-gap compliance watch, portal request tracking, configurable operational alerts, and 7-day trend context
- **Scheduling and operations workflows:** appointments, waitlists, reminders, and utilization visibility
- **Client portal workflows:** onboarding, forms, documents, and client self-service surfaces
- **Monitoring and telemetry:** local monitoring + optional OpenTelemetry export
- **Security and audit foundations:** role-aware access controls and structured audit event patterns

## API Security And Compliance Baseline (v5.6.0)

This repository now includes a versioned API security and compliance engineering baseline for high-trust environments where sensitive data may exist.

The baseline requires secure-by-design and privacy-by-design implementation patterns across all API work, including:

- strong authentication and deny-by-default authorization
- tenant-safe object-level access controls
- strict input validation and minimal output exposure
- structured safe error handling and secrets-safe logging
- PHI/PII/payment-aware data minimization and redaction
- auditable, append-only security and data-event traceability

Canonical reference:

- `PLANS/FULL-SECURITY-AND-AUDITING.md` (includes the `v5.6.0 API Security And Compliance Engineering Standard` section)

This baseline supports HIPAA-oriented safeguards, GDPR-aligned privacy principles, SOC 2 control expectations, and PCI-conscious engineering practices.

## Date Picker Behavior

All `DateInput` components (Mantine v8) across the application accept dates in `MM/DD/YYYY` format for manual entry and display. The calendar popover closes automatically when a day is selected. Date values are stored internally as `YYYY-MM-DD` strings. Affected forms: intake/form runner, client demographics, legal/admin, insurance, diagnoses, employment, certifications, and licenses.

## Architecture At A Glance

- `apps/web`: React + Mantine web UI, served by a lightweight Node server
- `apps/api`: Node.js API with MySQL persistence and migration flow
- `apps/worker`: background process surface for asynchronous work
- `packages/domain`: shared domain contracts and enums
- `packages/i18n`: localization utilities and message catalogs
- `packages/telemetry`: shared telemetry and monitoring utilities

## Architecture Diagram

```mermaid
flowchart LR
   U[Staff and Clients] --> WEB[apps/web\nReact + Mantine + Node server]
   WEB --> API[apps/api\nNode.js API]
   API --> DB[(MySQL)]
   API --> WRK[apps/worker\nBackground processing]

   WEB -. uses .-> I18N[packages/i18n]
   WEB -. uses .-> TEL[packages/telemetry]
   API -. uses .-> TEL
   API -. uses .-> DOM[packages/domain]
   WRK -. uses .-> TEL
```

## Tech Stack

- Runtime: Node.js 20+
- Package manager: pnpm 10
- Frontend: React 18, Mantine, Vite
- Backend: Node.js (ESM), MySQL, mysql2
- E2E testing: Playwright
- Optional agent tooling: Translation Guardian via Docker Compose

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm start
```

`pnpm start` is the canonical local startup command. It now performs environment and database preflight automatically:

- loads `.env` via `node --env-file=.env`
- ensures Docker is running (launches Docker Desktop when needed)
- ensures `faith-mysql` is running
- waits for MySQL readiness
- runs API migration when DB is configured
- starts API and web services
- restarts existing repo-managed API and web processes on ports `3001` and `3002` so local changes are not served from stale long-running processes

Avoid starting the app with `node start-servers.js` for normal development, because it does not apply the full startup preflight.

## Faithful Workflows Demo Mode

Faithful Workflows now defaults to real client data only. Demo/mock workflow clients are disabled unless you explicitly turn them on.

- enable at build/start time with `VITE_ENABLE_FAITH_WORKFLOWS_DEMO=true`
- or enable in the browser with `localStorage.setItem('faith_workflows.demo_mode', 'true')` and refresh
- disable again with `localStorage.setItem('faith_workflows.demo_mode', 'false')` or by removing the key and leaving the env var unset

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- Docker Desktop (required for local MySQL preflight)
- Git

## Local Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Update `.env` values as needed for your local environment.

### 3. Start the full app stack

```bash
pnpm start
```

Default local endpoints:

- web: `http://127.0.0.1:3002/index.html`
- api: `http://127.0.0.1:3001`

## Alternative Local Run Commands

```bash
pnpm start:web
pnpm start:api
pnpm start:worker
```

Standalone API mode:

```bash
pnpm start:api:standalone
```

## Cloud Setup Guidance

This repository is deployment-ready, but it does not currently include opinionated production IaC templates (`infra/` is a placeholder). Use the checklist below for your target cloud environment.

### Production checklist

1. Provision managed MySQL and set production DB credentials in environment variables.
2. Set `DB_SSL=true` for encrypted database transport.
3. Provide strong secrets for:
   - `DB_ENCRYPTION_KEY`
   - `SESSION_SECRET`
4. Configure strict allowed origins in `ALLOWED_ORIGINS`.
5. Set `NODE_ENV=production`.
6. Place web/API behind TLS termination (HTTPS only).
7. Configure an optional OTEL endpoint if centralized observability is required.
8. Run migrations before app startup in each environment.

### Service start commands (container or VM)

- API service: `pnpm --filter @faith/api start`
- Web service: `pnpm --filter @faith/web start`
- Worker service: `pnpm --filter @faith/worker start`

## Technology How-Tos

### Database migration

```bash
node --env-file=.env apps/api/src/db/migrate.js
```

### Run lint and tests

```bash
pnpm lint
pnpm test
pnpm test:security
pnpm test:e2e
pnpm test:launch-readiness
```

### Demo dataset workflows

```bash
pnpm demo:verify
pnpm demo:finalize
```

### Translation Guardian agent

```bash
pnpm agent:translation:build
pnpm agent:translation:run
```

### Optional telemetry export (OpenTelemetry)

Set:

- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_SERVICE_NAME`

If `OTEL_EXPORTER_OTLP_ENDPOINT` is unset, telemetry remains local/console-only.

## Recent Updates

Only the latest two entries are listed here. Full release history is in `docs/change-log.md`.

### v5.6.0 (April 3, 2026)

Portal client conversion flow: approved `account_signup` portal requests still auto-create and link a client on activation, and approved `care_request` items in Workspace Studio Portal now show **"Create Client"** so staff can generate the client record on demand and then open it from **"View Client"**.

### v5.5.2 (April 1, 2026)

Faithful Workflows visual upgrade: adds two new parallel canvas views (Radial Hub and Priority Matrix) alongside the original Classic List view. A floating cycle button in the page header switches between all three. Zero functional or engine changes; all 51 engine tests pass.

- Full summary: `docs/v5.5.2-RELEASE-SUMMARY.md`

## Change Log

For the full release and maintenance history, see `docs/change-log.md`.

The change log summarizes completed work across releases and documents the details behind updates, including new features, fixes, hardening work, and documentation-level changes where relevant.

## Documentation Index

- Product and planning overview: `docs/PRODUCT-PLANS-OVERVIEW.md`
- Domain model: `docs/domain-model.md`
- Faithful Workflows visual upgrade (v5.5.2): `docs/v5.5.2-RELEASE-SUMMARY.md`
- Faithful Workflows full feature release (v5.5.0): `docs/v5.5.0-RELEASE-SUMMARY.md`
- Operations Dashboard upgrade summary: `docs/OPERATIONS-DASHBOARD-UPGRADE-SUMMARY.md`
- Monitoring baseline: `PLANS/FULL-SURFACE-MONITORING.md`
- Security and auditing baseline: `PLANS/FULL-SECURITY-AND-AUDITING.md`
- Database implementation details: `docs/DATABASE-IMPLEMENTATION.md`
- Change log: `docs/change-log.md`

## Contributing

- Create a feature branch from `main`.
- Keep changes focused and include relevant tests or validation commands.
- Enable shared repository hooks (recommended):

```bash
git config core.hooksPath .githooks
```

- Run local checks before opening a PR:

```bash
pnpm lint
pnpm test
```

- Update docs when user-visible behavior changes.
- Open a pull request with a clear summary and validation notes.

## Open Source License

This project is licensed under the MIT License.

See `LICENSE` for the full text.
