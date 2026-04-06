# Faith Counseling

> *"Whatever you do, work at it with all your heart, as working for the Lord."* — Colossians 3:23

Welcome to **Faith Counseling** — a practice management platform built from the ground up for Christian counseling organizations. Whether you run a solo ministry practice, a group clinic, or a multi-location operation, Faith Counseling is designed to feel like a tool made specifically for you.

From the moment a new client submits a care request to the session note signed after their last appointment, every workflow in this platform carries your practice's values forward — with structured clinical support, faith-integrated care tools, and an operational foundation ready for Monday morning.

📖 **New to the platform?** Start with the [User Manual →](docs/User%20Manual/README.md)

Want a fully loaded local tour instead of a blank shell? The repo now includes a SQL-backed demo dataset workflow, so the product you start locally can feel much closer to the product shown below.

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

- **Faithful Workflows:** counselor-facing recommendation workspace powered by 27 deterministic clinical rules across 8 care categories, with explainable rationale, trend analysis, three interchangeable canvas views (Classic List, Radial Hub, Priority Matrix), and shared operational urgency cues that keep banner counts and visible client severity aligned
- **Clinical Chart:** session notes, internal notes, treatment plans, progress tracking, and homework
- **Operations Dashboard:** live daily operations summary with counselor workload, note-gap compliance watch, portal request tracking, configurable operational alerts, and 7-day trend context
- **Workspace Studio:** full-featured practice administration hub with tabs for Practice profile, Locations CRUD, Staff roster, Lifecycle caseload board, Appointments (service codes), Documents, Offerings, and Portal workflows
- **Scheduling and operations workflows:** appointments, waitlists, reminders, utilization visibility, and a guided recurring-series builder so staff can create repeat schedules without typing raw RRULE syntax
- **Client portal workflows:** onboarding, forms, documents, and client self-service surfaces
- **Monitoring and telemetry:** local monitoring + optional OpenTelemetry export
- **Security and audit foundations:** role-aware access controls and structured audit event patterns

## LATEST LOOK

The latest look feels less like a generic admin console and more like a living counseling workspace. The home experience opens with calm, high-signal surfaces: a dashboard that tells staff what needs attention now, a Faithful Workflows space that turns raw status into visible care priorities, and scheduling screens that feel built for real week-to-week ministry instead of back-office data entry.

![Latest look screenshot 1](./ScreenShots/Screenshot%202026-04-05%20at%208.42.26%E2%80%AFPM.png)
![Latest look screenshot 2](./ScreenShots/Screenshot%202026-04-05%20at%208.42.36%E2%80%AFPM.png)
![Latest look screenshot 3](./ScreenShots/Screenshot%202026-04-05%20at%208.42.46%E2%80%AFPM.png)
![Latest look screenshot 4](./ScreenShots/Screenshot%202026-04-05%20at%208.42.51%E2%80%AFPM.png)

Client and counselor records now read like story-rich working spaces rather than flat database rows. Detail views surface clinical context, faith-aware care details, diagnoses, legal and insurance context, employment and credentialing data, and practical next actions without making the user dig through disconnected tabs. The result is a product that feels organized, confident, and deeply operational at the same time.

![Latest look screenshot 5](./ScreenShots/Screenshot%202026-04-05%20at%208.43.01%E2%80%AFPM.png)
![Latest look screenshot 6](./ScreenShots/Screenshot%202026-04-05%20at%208.43.10%E2%80%AFPM.png)
![Latest look screenshot 7](./ScreenShots/Screenshot%202026-04-05%20at%208.43.14%E2%80%AFPM.png)
![Latest look screenshot 8](./ScreenShots/Screenshot%202026-04-05%20at%208.43.17%E2%80%AFPM.png)

Workspace Studio gives the platform its control-room energy. Practice settings, locations, staff, lifecycle management, documents, offerings, appointments, and portal administration all sit inside a single administration hub that feels intentional instead of crowded. It looks like the kind of system that can run an actual counseling practice on Monday morning, not just survive a demo.

![Latest look screenshot 9](./ScreenShots/Screenshot%202026-04-05%20at%208.43.27%E2%80%AFPM.png)
![Latest look screenshot 10](./ScreenShots/Screenshot%202026-04-05%20at%208.43.39%E2%80%AFPM.png)
![Latest look screenshot 11](./ScreenShots/Screenshot%202026-04-05%20at%208.43.43%E2%80%AFPM.png)
![Latest look screenshot 12](./ScreenShots/Screenshot%202026-04-05%20at%208.43.51%E2%80%AFPM.png)

The portal, charting, and monitoring views complete the picture. The client-facing side feels warm and guided, the charting side feels focused and usable, and the monitoring surfaces make the whole platform feel observable and production-minded. Put together, the current product has range: part ministry operations center, part clinical workspace, part modern practice platform, and much closer to something people would want to use every day.

Behind that presentation, the recent work has made the platform easier to trust and easier to demo. Scheduling now uses a guided recurring-series builder instead of making staff type raw recurrence syntax, dashboard and workflow counts stay visually aligned, runtime labels match the current product language, and authenticated reads stay stable even when older encrypted rows come back from MySQL in less convenient formats.

## Freshly Shipped

The platform has moved quickly over the last few iterations, and the most recent work is aimed at making Faith Counseling easier to explore, easier to operate, and easier to present with confidence.

- **A full User Manual is now live:** `docs/User Manual/README.md` walks every major role and product surface, from onboarding and scheduling to charting, monitoring, and security.
- **Demo data is now reproducible in SQL:** `pnpm demo:sql:generate`, `pnpm demo:sql:apply`, and `pnpm demo:sql:refresh` create and load the canonical dataset under `ops/demo-dataset/generated/`, which makes local demos and reset workflows much more predictable.
- **The README now shows the real product shape:** the new `LATEST LOOK` section and embedded screenshot grids turn the repository front door into an actual product tour instead of a bare technical landing page.
- **Scheduling feels more human:** recurring appointment series can now be built with readable cadence options, weekday selection, and a live preview, while raw RRULE entry remains available only as an advanced fallback.
- **Faithful Workflows stays in sync with operations:** dashboard drill-down and workflow urgency surfaces now share the same canonical counts so staff see one story, not competing numbers.

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

## Workspace Studio

Workspace Studio is the practice administration hub, accessible from the main navigation. It provides a tabbed interface covering all practice management surfaces:

- **Practice** — edit the practice profile: name, type (solo/group/multi-location), timezone, faith tradition, and contact information.
- **Locations** — add, edit, and delete scheduling locations. Each location tracks name, address, capacity, and telehealth/remote-enabled flag.
- **Staff** — read-only staff roster showing counselor cards (role, license type/number, supervision status, bio) and admin accounts. Links to the full Staff Management page for account creation and password resets.
- **Lifecycle** — caseload management board. Clickable status summary cards (Active, Waitlist, Inactive, Discharged) filter the client list. Referral source breakdown. Per-client status transitions with a discharge modal capturing reason and notes.
- **Appointments** — service code configuration (CPT/billing codes). Manage codes with category, default session duration, and active/inactive status.
- **Documents** — assign forms to clients and review submission history. Supports direct navigation from a client record with the client pre-selected.
- **Offerings** — track client service offerings and financial arrangements.
- **Portal** — manage portal settings, review public registration requests, approve/convert care requests into client records, and manage authenticated portal accounts.

## Client Detail Documents Shortcut

Client Detail now includes a direct header action to open documents for the active client. The action routes staff into the Client Portal Documents tab with that client preselected, so records can be viewed and document tasks can be assigned without manually switching surfaces or reselecting the client.
The checked-in public web bundle includes this shortcut so environments serving `apps/web/public` render the button without requiring local source recompilation.

## Public Web Build Artifacts

The `apps/web/public/assets` bundle files may be refreshed and committed when shipping UI workflow updates so the checked-in public web surface stays aligned with the latest source behavior.

## Standalone Product Pages

The static public surfaces are meant to reflect the current product posture, not an older generic admin-console identity. The checked-in About page at `/about` now presents Faith Counseling as a counselor-first, faith-aware practice platform with a stronger product narrative and the same light indigo visual language used across the rest of the app, while still linking back to live monitoring and API documentation.

## Architecture At A Glance

- `apps/web`: React + Mantine web UI, served by a lightweight Node server
- `apps/api`: Node.js API with MySQL persistence and migration flow
- `apps/worker`: background process surface for asynchronous work
- `packages/domain`: shared domain contracts and enums
- `packages/i18n`: localization utilities and message catalogs
- `packages/telemetry`: shared telemetry and monitoring utilities
- `ops/demo-dataset`: reproducible SQL demo-data generation, apply, and verification workflow
- `pnpm start`: canonical local launcher with env loading, DB preflight, migrations, and coordinated app startup

## Architecture Diagram

```mermaid
flowchart TB
    subgraph users[" 👤  Who Uses It "]
        STAFF["🏥 Staff\nCounselors · Admins · Schedulers · Billers"]
        CLIENT["🙋 Clients\nSelf-Service Portal Users"]
    end

    subgraph frontend[" 🌐  Frontend — apps/web "]
        WEB["React 18 + Mantine + Vite\nNode.js BFF · CSRF Protection · Session Proxy\nI18N Runtime · Surface Telemetry"]
    end

    subgraph backend[" 🔌  Backend — apps/api "]
        API["Node.js ESM REST API\nAuth · RBAC · Tenant Isolation\nAudit Ledger · Encrypted PHI"]
    end

    subgraph worker[" ⚡  Background — apps/worker "]
        WRK["Async Job Processing\nBackground Tasks"]
    end

    subgraph packages[" 📦  Shared Packages "]
        DOM["@faith/domain\nContracts · Enums · Types"]
        I18N["@faith/i18n\nLocale Catalogs · Runtime Translations"]
        TEL["@faith/telemetry\nOTEL Signals · Local Monitoring"]
    end

    subgraph ops[" 🚀  Local Startup & Demo Ops "]
        START["▶️ pnpm start\nEnv Load · Docker/MySQL Preflight · Migrations"]
        DEMO["🧪 Demo Dataset SQL\nGenerate · Apply · Verify"]
    end

    subgraph infra[" 🗄️  Data & Observability "]
        DB[("MySQL\nEncrypted at Rest · Migrations")]
        OTEL["🔭 OTEL Collector\n— optional export —"]
        AGENT["🤖 Translation Guardian\nPython Agent · Docker"]
    end

    STAFF --> WEB
    CLIENT --> WEB
    WEB --> API
    API --> DB
    API --> WRK
    WRK --> DB

    WEB -. uses .-> I18N
    WEB -. uses .-> TEL
    WEB -. uses .-> DOM
    API -. uses .-> TEL
    API -. uses .-> DOM
    WRK -. uses .-> TEL
    START --> WEB
    START --> API
    START --> DB
    DEMO --> DB

    TEL -.->|"export\n(optional)"| OTEL
    AGENT -.->|"reviews"| I18N
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

Set `SEED_DEV_PORTAL_DATA=false` when you want a staff-only local database and do not want startup migration to recreate the seeded portal client/resource.

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
pnpm demo:sql:generate
pnpm demo:sql:apply
pnpm demo:sql:refresh
pnpm demo:verify
pnpm demo:finalize
```

Generated SQL artifacts are written to `ops/demo-dataset/generated/`:

- `demo-dataset.reset.sql`
- `demo-dataset.seed.sql`
- `demo-dataset.apply.sql`
- `demo-dataset.meta.json`

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

Only the latest entries are listed here. Full release history is in `docs/change-log.md`.

### User Manual (April 5, 2026)

A full 13-section end-user practice manual is now live under `docs/User Manual/`. It covers every platform surface and is organized by role — counselor, admin, scheduler, and client. Includes Getting Started, Dashboard, Client Management, Scheduling, Clinical Chart, Faithful Workflows, Workspace Studio, Client Portal, Forms, Offerings, Monitoring, Security, and Troubleshooting.

- Full manual: `docs/User Manual/README.md`

### Demo Dataset SQL Workflow (April 5, 2026)

The canonical demo dataset can now be generated as concrete SQL artifacts and loaded directly into MySQL. This gives the repo a fast, repeatable way to reset into a polished demo state with predictable records and validation.

- Commands: `pnpm demo:sql:generate`, `pnpm demo:sql:apply`, `pnpm demo:sql:refresh`
- Artifacts: `ops/demo-dataset/generated/`

### README Latest Look Refresh (April 5, 2026)

The README now includes a narrative `LATEST LOOK` section with embedded screenshot grids so new visitors see the real product surfaces immediately: dashboard, Faithful Workflows, scheduling, records, Workspace Studio, portal, charting, and monitoring.

### Guided Recurring Series Builder (April 4, 2026)

Recurring scheduling no longer starts with raw RRULE syntax. Staff now get readable cadence choices, weekday selection, and a live preview first, with advanced rule text kept available only when needed.

## Change Log

For the full release and maintenance history, see `docs/change-log.md`.

The change log summarizes completed work across releases and documents the details behind updates, including new features, fixes, hardening work, and documentation-level changes where relevant.

## Documentation Index

- **User Manual:** `docs/User Manual/README.md` — full end-user guide covering all roles and platform surfaces
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
