# Contributing to Faith Counseling

> *"Whatever you do, work at it with all your heart, as working for the Lord."* — Colossians 3:23

Thank you for your interest in contributing. Faith Counseling is a practice management platform built specifically for Christian counseling organizations — and every line of code, every workflow, and every design decision should reflect that focus. We want this platform to feel like it was made for the people using it on a Monday morning in a real ministry, not adapted from a generic SaaS template.

This document covers everything you need to contribute effectively — from your first local setup to the expectations behind every pull request.

---

## Table of Contents

- [The Mission](#the-mission)
- [Who This Project Is For](#who-this-project-is-for)
- [Before You Start](#before-you-start)
- [Setting Up Your Local Environment](#setting-up-your-local-environment)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Commit Conventions](#commit-conventions)
- [What Every Commit Must Include](#what-every-commit-must-include)
- [Pull Request Expectations](#pull-request-expectations)
- [Code Standards](#code-standards)
- [Security and PHI Requirements](#security-and-phi-requirements)
- [Testing](#testing)
- [API and Documentation](#api-and-documentation)
- [Monitoring and Telemetry](#monitoring-and-telemetry)
- [Getting Help](#getting-help)

---

## The Mission

Faith Counseling exists to give Christian counseling practices the operational foundation they deserve — one built on their values, not adapted from someone else's. Contributing here means you're helping ministries serve clients better, helping counselors focus on care instead of paperwork, and building something that carries the weight of real responsibility.

That context matters. This platform handles Protected Health Information (PHI), manages clinical records, and supports workflows that affect real people in vulnerable moments. We hold ourselves to a high standard — not because we have to, but because the people this platform serves deserve it.

---

## Who This Project Is For

Faith Counseling is designed for:

- Christian counseling practices (solo, group, and multi-location)
- Counselors, schedulers, billers, and practice administrators
- Client-facing portal users managing their own care journey

If your contribution improves one of these people's day, it belongs here. If it makes the platform feel more like a generic enterprise tool, it probably doesn't.

---

## Before You Start

Before writing any code, please:

1. **Read this document fully.** The commit and PR requirements are non-negotiable — understanding them before you start will save you time.
2. **Check open issues and pull requests.** Your idea may already be in progress.
3. **For large changes, open an issue first.** Describe what you want to build and why. This avoids wasted effort and keeps changes aligned with the platform's direction.
4. **Read the relevant plan documents** before touching security, auditing, monitoring, or telemetry:
   - `PLANS/FULL-SECURITY-AND-AUDITING.md` — canonical standard for all security, auth, PHI, RBAC, audit, and compliance work
   - `PLANS/FULL-SURFACE-MONITORING.md` — canonical standard for monitoring, telemetry, OTEL, and surface observability

These plan documents are the source of truth. When in doubt, they win.

---

## Setting Up Your Local Environment

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10
- **Docker Desktop** — required for the local MySQL container
- **Git**

### First-time setup

```bash
# Clone the repository
git clone https://github.com/your-org/faith-counseling.git
cd faith-counseling

# Install dependencies
pnpm install

# Copy the environment template
cp .env.example .env
```

Edit `.env` for your local environment. The defaults work for most local setups. Key values:

| Variable | Purpose |
| --- | --- |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | MySQL connection (matches the local Docker container) |
| `DB_ENCRYPTION_KEY` | 64-char hex key for PHI encryption at rest |
| `SESSION_SECRET` | Session signing secret |
| `ANTHROPIC_API_KEY` | Optional — enables AI observations in Audit Intelligence |
| `GOOGLE_TRANSLATE_API_KEY` | Optional — enables auto-translation |

### Enable the pre-push hook

This hook prevents accidental direct pushes to `main` or `master`:

```bash
git config core.hooksPath .githooks
```

### Start the full stack

```bash
pnpm start
```

`pnpm start` is the **only supported local startup command**. Do not use `node start-servers.js` for development. The start script handles:

- Loading `.env`
- Ensuring Docker is running and the `faith-mysql` container is up
- Waiting for MySQL readiness
- Running database migrations
- Starting the API, web, and worker services

Default local endpoints after startup:

| Service | URL |
| --- | --- |
| Web app | `http://127.0.0.1:3002/index.html` |
| API | `http://127.0.0.1:3001` |
| API docs (Swagger UI) | `http://127.0.0.1:3002/api/docs` |
| Worker metrics | `http://127.0.0.1:9465/metrics` |

### Optional: load the demo dataset

To work with a realistic, pre-loaded local environment:

```bash
pnpm demo:sql:generate
pnpm demo:sql:apply
```

This creates the canonical demo dataset in MySQL so local development looks and behaves like the real product.

### Optional: start the observability stack

```bash
docker compose --profile observability up -d
```

Starts Jaeger (traces at `http://localhost:16686`) and Prometheus (metrics at `http://localhost:9090`).

---

## Project Structure

```
faith-counseling/
├── apps/
│   ├── api/          Node.js ESM REST API (MySQL, auth, RBAC, audit)
│   ├── web/          React 18 + Mantine frontend (Vite build, Node BFF)
│   └── worker/       Background job processing
├── packages/
│   ├── domain/       Shared contracts, enums, and domain types
│   ├── i18n/         Localization — locale catalogs and runtime utilities
│   └── telemetry/    OpenTelemetry signals, Prometheus metrics, monitoring
├── docs/             Documentation, change log, API spec, release summaries
├── ops/              Local tooling — demo dataset, security scans, startup scripts
├── PLANS/            Canonical implementation standards (monitoring, security)
├── tests/            Playwright E2E tests and UI error scan
└── AGENTS.md         Session-level rules for AI agents working in this repo
```

---

## Development Workflow

### Branch from `main`

All work starts from a fresh feature branch:

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```

Use a descriptive branch name that reflects the change:

- `feat/recurring-series-builder`
- `fix/session-idle-timeout`
- `docs/api-openapi-spec`
- `chore/bump-mantine-version`

### Keep commits focused

One logical change per commit. Avoid combining unrelated fixes or features in a single commit. This makes review easier and makes the git history meaningful.

### Never push directly to `main`

The pre-push hook enforces this. All changes go through pull requests. This applies to everyone — including maintainers.

### Run checks before pushing

```bash
pnpm lint
pnpm test
```

For security-adjacent changes:

```bash
pnpm test:security
```

For a full browser sweep:

```bash
node tests/e2e/ui-error-scan.mjs
```

---

## Commit Conventions

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

<optional body>
```

**Types:**

| Type | When to use |
| --- | --- |
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructuring without behavior change |
| `chore` | Tooling, dependencies, config |
| `test` | Tests only |
| `perf` | Performance improvement |
| `security` | Security hardening |

**Examples:**

```
feat(scheduling): add guided recurring-series builder
fix(auth): clear idle timer on explicit sign-out
docs(api): regenerate OpenAPI spec to full implementation coverage
security(session): tighten IDLE_TIMEOUT_MS to 3 minutes for all roles
```

Keep the subject line under 72 characters. Use the body to explain *why*, not *what* — the diff already shows what changed.

---

## What Every Commit Must Include

This is non-negotiable. Every commit that changes behavior, adds a feature, or fixes a bug must also update:

### 1. `README.md`

Update any sections affected by your change: feature lists, setup steps, command references, screenshots, known issues. The README is the product's front door — keep it accurate.

### 2. `docs/change-log.md`

Add an entry at the top of the file. Format depends on the type of change:

**Bug fix:**
```markdown
## April 7, 2026 — Short title

### fix: short description

**Date:** April 7, 2026
**Affected area:** `path/to/file.js`, `path/to/other.js`

What was broken and what you fixed. Include validation steps.
```

**Feature:**
```markdown
### feat: short description

**Date:** April 7, 2026
**Affected area:** `...`

What was added and why. Include any setup or configuration requirements.
```

**Major version / release:**
```markdown
## April 7, 2026 — v6.0.0: Release Title

### release: v6.0.0 — Release Title

**Date:** April 7, 2026

Summary of all changes in this release.
```

Also create a release summary file at `docs/vX.Y.Z-RELEASE-SUMMARY.md` for any major version bump. See existing files in `docs/` for the format.

### Why this matters

The change log and README are how the rest of the team — and the people using this platform — understand what changed and why. Deferring these to a follow-up commit is not acceptable. Documentation is part of the work, not a follow-up to it.

---

## Pull Request Expectations

Every pull request must include all four of these sections in the description:

### What changed

A clear, specific description of the change. Not "updated the UI" — describe what screen, what behavior, what file.

### Why it changed

The motivation. What problem does this solve? What user or operational need drove it? If it references an issue, link it.

### Validation performed

List what you tested and how:

- Tests run: `pnpm test`, `pnpm test:security`, specific test file
- Manual steps: what you clicked, what you observed
- Browser sweep result if UI changed: `publicErrors: 0, adminErrors: 0, clientErrors: 0`

### Follow-up actions

Anything a maintainer or other contributor needs to do after merge: run migrations, set an environment variable, rebuild assets, update configuration.

---

## Code Standards

### General

- Write code that reads clearly. The next person reading it might be a counselor's IT volunteer, not a senior engineer.
- Do not add features, abstractions, or error handling beyond what the task requires. Three similar lines of code is better than a premature abstraction.
- Do not add docstrings, comments, or type annotations to code you didn't touch.
- Only add comments where the logic is genuinely non-obvious.
- Trust internal code and framework guarantees. Only validate at system boundaries.

### JavaScript / Node.js

- All API code uses ES Modules (`import`/`export`). No CommonJS in `apps/api/`.
- Use `const` and `let`. Never `var`.
- Async/await over raw Promise chains.
- Error objects passed to `writeJson` must use the `{ error: string }` shape — never expose stack traces or internal state to clients.

### React

- Functional components only.
- Keep component files focused. If a component grows beyond one clear responsibility, split it.
- Use Mantine components for UI. Do not introduce new UI libraries without discussion.
- All user-facing strings must go through the i18n system — do not hardcode display text.

### CSS / Styling

- Use Mantine's style system and `sx` props. Avoid raw CSS files for component-level styles.
- Follow the existing color variable conventions (`--ops-brand`, `--ops-ink-soft`, etc.) in standalone public pages.

### API design

- Every successful response follows the `{ item: {...} }` (single) or `{ items: [...] }` (list) envelope.
- Errors follow `{ error: string }` with an appropriate HTTP status code.
- Every mutation must call `emitAudit(request, action, targetType, targetId, session)`.
- Route handlers must check auth before doing any work. Use `requirePracticeAdmin`, `requirePlatformAdmin`, or equivalent.
- Never expose raw database errors, stack traces, or internal IDs to the client.

---

## Security and PHI Requirements

This platform handles Protected Health Information. These rules apply to every change, without exception.

### PHI handling

- Client names, emails, phone numbers, addresses, and clinical content are encrypted at rest. Never write these fields to the database as plaintext.
- Never log PHI, PII, or free-text clinical content — in the API, the worker, or telemetry.
- Never include PHI in audit event fields (`targetId`, `actorId`, `sourceWorkflow`). Use opaque IDs only.
- Never include PHI in OTEL spans, metrics labels, or Prometheus label cardinality.

### Authentication and authorization

- All protected endpoints must validate the session before doing any work.
- Counselors are scoped to their assigned clients. Do not return cross-tenant or cross-counselor data.
- Never trust client-supplied `tenantId`, `staffId`, or role values. Always derive these from the validated session.
- CSRF protection is required on all state-mutating endpoints. Use `csrfHeaders()` on the frontend; validate `x-csrf-token` on the backend.

### Secrets

- Never hardcode secrets, API keys, or credentials in source code.
- Never commit `.env` or any file containing real credentials.
- Use `process.env.*` for all sensitive configuration.

### Audit trail

- Every operation that reads, creates, modifies, or deletes clinical or user data must emit an audit event.
- Audit events are append-only. Never update or delete rows from the `audit_events` table.
- Use the canonical result vocabulary: `success`, `denied`, `error`.

### Before merging security-adjacent changes

Read `PLANS/FULL-SECURITY-AND-AUDITING.md`. Your change must conform to the standards in that document. If your change updates the security standard itself, update that document first — the plan file is the source of truth, and `AGENTS.md` defers to it.

---

## Testing

### Unit and integration tests

```bash
pnpm test
```

Runs the test suite across all packages. New logic should have corresponding tests.

### Security regression tests

```bash
pnpm test:security
```

Runs the security regression suite. Required for any change touching auth, sessions, RBAC, or audit behavior.

### End-to-end tests

```bash
pnpm test:e2e
```

Playwright-based journey tests. Run these for changes to major user-facing workflows.

### Browser error sweep

```bash
node tests/e2e/ui-error-scan.mjs
```

Walks public, admin, and client surfaces and reports console errors, page errors, and unexpected network failures. The target is always `0` errors across all surfaces. Do not merge UI changes that introduce new browser errors.

### Launch readiness

```bash
pnpm test:launch-readiness
```

Validates that the full stack can start, authenticate, and serve core surfaces without errors.

---

## API and Documentation

### OpenAPI specification

The API is documented as an OpenAPI 3.1 spec at `docs/api/openapi.yaml`. The Swagger UI is served at `/api/docs`.

If you add or change an API endpoint, update the spec in the same commit. The spec is version-controlled and should always reflect the actual implementation. Do not let them drift.

To verify your endpoint works as documented, use the Swagger UI at `http://localhost:3002/api/docs` to test it interactively.

### Authentication in the spec

The API uses HttpOnly session cookies — not Bearer tokens. Sign in via `POST /v1/auth/login` and the `session` cookie is set automatically. All subsequent browser requests include it automatically. Test with `credentials: 'include'` in fetch, or use the Swagger UI which handles this automatically.

---

## Monitoring and Telemetry

Every new or modified user-facing surface must include monitoring coverage. This is a hard requirement, not optional polish.

Read `PLANS/FULL-SURFACE-MONITORING.md` before touching any surface. The rules include:

- New screens, tabs, pages, and major modal workflows must be added to the shared surface registry
- New surfaces must appear in the monitoring summary and on the monitoring page
- Use OTEL semantic conventions first; use `faith.ui.*` namespacing only for app-specific gaps
- Local monitoring must remain available even when OTEL export is not configured
- External OTEL export must remain optional and config-driven

### What not to do

- Never emit PHI or high-cardinality labels in telemetry or metrics
- Never mix the audit ledger with telemetry — they are separate systems
- Never make the observability stack a hard dependency for startup

---

## Getting Help

- **Issues:** Open a GitHub issue for bugs, feature requests, or questions. Be specific — include steps to reproduce bugs and screenshots where relevant.
- **Security vulnerabilities:** Do not open public issues for security vulnerabilities. Contact the maintainers privately. Include a description, reproduction steps, and the potential impact.
- **Questions about the platform:** Open a discussion or issue tagged `question`. We're happy to help orient new contributors.

---

Thank you for contributing. This project is built for people doing important work, and the people who build it matter too. We're glad you're here.
