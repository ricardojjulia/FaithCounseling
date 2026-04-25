# Stack Migration Plan — ChurchCore Care

**Date:** April 24, 2026
**Status:** Evaluation — not committed
**Author:** Engineering

---

## Summary

This document evaluates migrating ChurchCore Care from its current stack to a modern TypeScript-first stack. The evaluation covers feasibility, risk areas ranked by severity, what changes vs. what stays, a recommended sequencing approach, and rough effort estimates.

**Decision not yet made.** This document exists to inform that decision.

---

## Current Stack

| Layer | Technology |
|---|---|
| Package manager | pnpm 10.7.0 (monorepo workspaces) |
| Frontend | React 18 + Vite SPA |
| Backend | Raw Node.js HTTP — 15,914-line monolith (`apps/api/src/index.js`) |
| Database | MySQL 8 + mysql2 — 76 tables |
| Auth | Custom argon2id session-based (HttpOnly cookies, 8h max / 30min idle) |
| Encryption | Custom AES-256-GCM PHI field encryption (`apps/api/src/lib/encrypt.js`) |
| UI | Mantine 8 (100+ components in use) |
| Types | None — plain JavaScript ES modules |
| Testing | Node.js native runner (9 `.test.mjs` files) + Playwright E2E (6 suites) |
| Query layer | 29 modular files in `apps/api/src/db/queries/` |
| Observability | OpenTelemetry (`@churchcore/telemetry`) |

**Codebase size:** ~68,000 LOC across 968 JS/JSX/MJS files.

---

## Proposed Stack

| Layer | Technology |
|---|---|
| Package manager | npm |
| Frontend + Backend | Next.js 15 App Router |
| Language | TypeScript |
| React | React 19 |
| Database | Supabase (hosted PostgreSQL) + `pg` client |
| Auth | Supabase Auth |
| UI | Tailwind CSS 4 |
| Testing | Node.js test runner + tsx |
| Linting | ESLint 9 (flat config) |

---

## Critical Risk: HIPAA Compliance with Supabase

This must be resolved before any migration work begins. It is not a technical question — it is a legal and architectural one.

**Current posture:** PHI lives in a self-hosted MySQL instance. Application-level AES-256-GCM field encryption means specific columns (clinical notes, SSN, diagnoses, etc.) are encrypted before they reach the database. Your encryption keys never leave your infrastructure.

**Supabase posture:** Supabase is a managed cloud service (hosted on AWS). They offer a **HIPAA add-on** (paid tier) that covers:
- Encryption at rest for the Postgres instance
- Encryption in transit
- Audit logging
- A signed BAA

**The gap:** Supabase's HIPAA add-on provides encryption at the storage layer, not at the field level. This means Supabase (as your infrastructure provider) can, in principle, read column values. This is different from your current model where only your application can decrypt PHI.

**Options to close the gap:**
1. Accept Supabase's encryption at rest as sufficient (requires legal review of your HIPAA posture)
2. Maintain application-level field encryption on top of Supabase (`encrypt.js` is already DB-agnostic — it works with any data store)
3. Use Supabase for non-PHI data only; keep PHI in a self-hosted Postgres instance

**Do not proceed with migration until this is resolved in writing.**

---

## The Five Hardest Migration Problems

### 1. API Monolith → Next.js Route Handlers

**Effort: 6–10 weeks**

`apps/api/src/index.js` is 15,914 lines containing a single `resolveRoute()` dispatcher that covers 70+ route groups. In Next.js App Router, each route becomes a separate `app/api/[path]/route.ts` file.

The 29 query modules in `src/db/queries/` are well-separated and portable — the data layer moves cleanly. The hard part is the middleware layer: auth verification, rate limiting, RBAC enforcement, tenant isolation, CORS, and CSRF are currently applied inline throughout the monolith. In Next.js these move to `middleware.ts` (edge) or route-level wrappers.

Key work items:
- Extract middleware logic (`auth.js`, `security.js`, `http.js`) into Next.js middleware and shared route helpers
- Decompose the dispatcher into ~70 `route.ts` files, one per route group
- Re-thread the per-tenant pool/connection resolution (already required for the GCP deployment, see `cloud-implementation.md`)
- Validate that all RBAC rules and audit logging survive the decomposition

### 2. MySQL 76-Table Schema → PostgreSQL

**Effort: 3–4 weeks**

MySQL and PostgreSQL are not syntax-compatible. Every DDL statement needs review and likely modification.

Common incompatibilities in this codebase:
- `AUTO_INCREMENT` → `SERIAL` or `GENERATED ALWAYS AS IDENTITY`
- `TINYINT(1)` booleans → `BOOLEAN`
- `DATETIME` columns → `TIMESTAMPTZ` (critical for multi-timezone scheduling — semantics differ)
- MySQL-style `ON UPDATE CURRENT_TIMESTAMP` triggers → Postgres equivalents
- Full-text search syntax differences
- JSON column behavior differences (`JSON_EXTRACT` vs `->>` operator)
- Character set / collation semantics

Each of the 29 query modules uses MySQL-specific syntax (`?` placeholders, `LIMIT ?, ?` for pagination, `INSERT IGNORE`, etc.). Every query file needs to be ported to `pg`-style (`$1`, `$2` placeholders, `ON CONFLICT DO NOTHING`, etc.).

This work is systematic but requires domain knowledge to validate correctness, especially in the clinical, billing, and scheduling modules.

### 3. Custom Auth → Supabase Auth

**Effort: 3–4 weeks + user communication**

The current auth system uses argon2id password hashes stored in MySQL and HttpOnly session cookies with idle-timeout enforcement.

Supabase Auth uses JWTs. Migration consequences:
- **Existing password hashes cannot be migrated.** argon2id hashes are one-way. Every existing user must reset their password, or you run argon2id as a custom auth flow against Supabase (which Supabase supports but requires a custom hook).
- **Session semantics change.** JWT TTL replaces idle-timeout. Replicating the current 30-minute idle timeout requires token refresh logic.
- **RBAC role model.** Current roles (`admin`, `counselor`, `supervisor`, `billing_admin`) are stored in `staff_members.role`. These need to map to Supabase custom JWT claims or `user_metadata`.
- **Multi-tenancy in auth.** The tenant → practice → staff relationship needs to be expressed in RLS policies or JWT custom claims, not just foreign keys.

Plan for a user-facing password reset communication and a transition window.

### 4. Mantine → Tailwind CSS 4

**Effort: 8–12 weeks**

Mantine provides a complete component library: modals, forms with validation, data tables, date pickers, notifications, drawers, tabs, comboboxes, and more. All 28+ component files use Mantine components directly.

Tailwind CSS is utility classes only. Moving to Tailwind requires choosing a headless component library to replace Mantine's interactive components:

| Mantine component type | Replacement candidates |
|---|---|
| Form + validation | React Hook Form + Zod |
| Modal, Drawer, Dialog | Radix UI Primitives or Headless UI |
| Combobox, Select, MultiSelect | Radix UI or cmdk |
| DataTable, Pagination | TanStack Table |
| DatePicker, Calendar | react-day-picker |
| Notifications | sonner or react-hot-toast |
| Tabs, Accordion | Radix UI Primitives |

Clinical workflow views, the faith workflow engine (`FaithWorkflows/engine/rules/`), document management, and the client portal all have dense UI that will require careful, view-by-view replacement.

**Accessibility risk:** Mantine handles ARIA roles, keyboard navigation, and focus management for every component. Tailwind does not. Custom component replacements must be audited for accessibility before any clinical workflow view is considered complete.

### 5. No TypeScript → TypeScript Across 68K LOC

**Effort: 2–3 weeks (critical path); ongoing incrementally**

TypeScript adoption in a large JS codebase is almost always done incrementally:

1. Enable `"allowJs": true` and `"strict": false` initially — existing JS files compile without changes
2. Add types to the domain layer first (`@churchcore/domain` enums, factories)
3. Add DB schema types (one interface per table; can be generated from Postgres schema)
4. Type the auth and security layer
5. Progressively convert `.js` → `.ts` file by file

The biggest leverage is in the query layer and the domain package. Once those have types, the rest of the codebase gets meaningful type inference without being fully converted.

---

## What Is Straightforward

These changes carry low risk and are largely mechanical:

| Change | Notes |
|---|---|
| pnpm → npm | npm workspaces are less ergonomic than pnpm for monorepos — worth reconsidering this change specifically |
| React 18 → React 19 | Most React 18 code works in 19; breaking changes are narrow (stricter hydration, `use()` hook, concurrent mode edge cases) |
| Node.js test runner | Already in use; adding `tsx` for TypeScript support is a one-line config change |
| ESLint 9 | Flat config format changes from v8 — existing config needs rewrite, but it's a one-time cost |
| `@churchcore/worker` | Minimal code; ports easily to any environment |
| OpenTelemetry | Framework-agnostic; `@churchcore/telemetry` package stays unchanged |

---

## What Stays Entirely Unchanged

Regardless of migration path, these components are portable as-is:

| Component | Reason |
|---|---|
| `apps/api/src/lib/encrypt.js` | AES-256-GCM encryption is DB-agnostic — works identically against Postgres |
| `apps/api/src/db/schema.sql` (logic) | All table relationships and business rules stay; only syntax changes for Postgres |
| `@churchcore/domain` | Enums and factories are pure logic with no runtime dependency |
| `@churchcore/i18n` | Pure data and utility functions |
| Playwright E2E suites | Framework-agnostic; tests exercise HTTP endpoints and the browser |
| Business logic in query modules | The SQL changes but the logic (what data is fetched, what constraints apply) stays identical |

---

## Recommended Approach: Incremental, Not Big Bang

A full simultaneous migration of all five layers carries unacceptable risk for a HIPAA-aligned, multi-tenant clinical SaaS. Any regression in tenant isolation, PHI encryption, or RBAC enforcement is a compliance event, not just a bug.

**Recommended sequence:**

**Phase 0 — Prerequisites (2–4 weeks)**
- Resolve the Supabase HIPAA BAA and field-encryption question in writing
- Decide whether to maintain application-level field encryption on top of Supabase
- Stand up a Postgres instance (can be Supabase) and run the schema conversion in isolation
- Validate all 29 query modules against Postgres before touching the application layer

**Phase 1 — TypeScript foundation (2–3 weeks, can overlap with Phase 0)**
- Enable `allowJs`, `strict: false`
- Add types to `@churchcore/domain` and DB schema (`types/db.ts` — one interface per table)
- Type the auth and security modules
- Add ESLint 9 flat config

**Phase 2 — Next.js as a frontend-first move (4–6 weeks)**
- Migrate `apps/web` from Vite SPA to Next.js App Router
- Keep `apps/api` as raw Node.js — frontend calls existing API
- Begin Tailwind CSS adoption on new screens only; do not replace existing Mantine components yet
- This validates the Next.js deployment and build pipeline with zero API risk

**Phase 3 — API decomposition (6–10 weeks)**
- Decompose `apps/api/src/index.js` into Next.js Route Handlers, one route group at a time
- Migrate route groups in order of lowest risk first: reporting → scheduling → billing → clinical
- Run the old and new API in parallel behind a feature flag until each route group is validated
- Auth, RBAC, and tenant isolation are the last to migrate — they touch every route

**Phase 4 — Auth migration (3–4 weeks)**
- Migrate to Supabase Auth after the API is decomposed and stable
- Plan and execute user password reset flow
- Migrate RBAC role model to JWT custom claims
- Implement RLS policies for tenant isolation

**Phase 5 — UI replacement (ongoing, 8–12 weeks)**
- Replace Mantine components with Tailwind + headless components incrementally
- Prioritize new feature screens; replace existing screens during natural feature work cycles
- Audit every replaced component for ARIA and keyboard accessibility

---

## Effort Summary

| Phase | Work | Estimated duration |
|---|---|---|
| 0 — Prerequisites | HIPAA decision, schema conversion | 2–4 weeks |
| 1 — TypeScript foundation | Types for domain, DB, auth | 2–3 weeks |
| 2 — Next.js frontend | Vite → App Router, Tailwind on new screens | 4–6 weeks |
| 3 — API decomposition | Monolith → Route Handlers | 6–10 weeks |
| 4 — Auth migration | Supabase Auth, RLS, password reset | 3–4 weeks |
| 5 — UI replacement | Mantine → Tailwind + headless | 8–12 weeks |
| **Total** | | **~25–39 weeks** |

For a solo engineer or part-time engagement, add 50–100%.

---

## The Case Against (Right Now)

The application is working, HIPAA-aligned, and deployed. The current bottleneck is the monolithic API — which could be modularized without a full stack change.

A targeted decomposition of `index.js` into feature modules (not Next.js, just breaking the file into separate module files) plus TypeScript adoption would give 80% of the maintainability benefit at roughly 20% of the cost and risk.

That path:
1. Add TypeScript incrementally (`allowJs: true`)
2. Extract route groups from `index.js` into `src/routes/[domain].js` files, keeping the same dispatcher
3. Deploy to GCP Cloud Run as-is (see `docs/cloud-implementation.md`)
4. Evaluate full stack migration in 6–12 months when the platform has revenue and user feedback

---

## References

- `docs/cloud-implementation.md` — GCP deployment architecture (current stack, no refactor)
- `docs/SAAS-DEPLOYMENT-SPEC.md` — deployment options comparison (AWS vs GCP, current stack)
- `apps/api/src/index.js` — monolithic route dispatcher (15,914 lines)
- `apps/api/src/db/queries/` — 29 query modules (MySQL, to be ported to pg)
- `apps/api/src/lib/encrypt.js` — AES-256-GCM PHI encryption (portable as-is)
- `apps/api/src/lib/auth.js` — current session auth (argon2id)
- `apps/api/src/lib/security.js` — RBAC enforcement
- `apps/web/src/components/` — 28+ React/Mantine components
