# Product Plans Overview

**Prepared:** March 30, 2026
**Maintained by:** Engineering sessions
**Plans directory:** [`PLANS/`](../PLANS/)

This document summarises every planning file in the `PLANS/` directory — what each plan covers, its current status, its relationship to the shipping codebase, and where it fits in the overall product roadmap. All plans live in `PLANS/` and are the source of truth for their respective feature areas. This document is the map to those sources.

---

## Quick Reference

| Plan file | Category | Status | Area |
|-----------|----------|--------|------|
| [CALENDAR.md](#calendar--scheduling-module) | Feature | In progress | Scheduling |
| [CLIENT-PORTAL-EXPANSION.md](#client-portal-expansion) | Feature | In progress | Portal |
| [ClientData.md](#client-data--enterprise-records) | Feature | Active planning | Client records |
| [CounselorProfiling.md](#counselor-profiling-system) | Feature | Delivered | Staff / HR |
| [FORM-LIBRARY-EXPANSION.md](#form-library-expansion) | Feature | Implemented | Documents |
| [FULL-SECURITY-AND-AUDITING.md](#security-and-auditing-canonical-standard) | Governance | Canonical baseline | Security |
| [FULL-SURFACE-MONITORING.md](#surface-monitoring-canonical-standard) | Governance | Canonical baseline | Monitoring |
| [MantineMigration.md](#mantine-ui-migration) | Infrastructure | Delivered | UI system |
| [OPERATIONS-DASHBOARD-UPGRADE.md](#operations-dashboard-upgrade) | Feature | Implemented | Dashboard |
| [ScheduleOps.md](#schedule-ops--operational-scheduling-layer) | Feature | In progress | Scheduling |
| [USER and USER MAINTENANCE.md](#user-and-user-maintenance) | Feature | Delivered | Auth / Staff |
| [WORKSPACE-STUDIO-FORMS-PORTAL-WORKFLOW.md](#workspace-studio-forms--portal-workflow) | Feature | Implemented | Studio / Docs |

---

## Feature Plans

### Calendar — Scheduling Module

**File:** [PLANS/CALENDAR.md](../PLANS/CALENDAR.md)
**Status:** In progress
**Prepared:** March 27, 2026

Defines the full implementation path for the counseling practice calendar. The API foundation (appointment CRUD, daily calendar, portal appointment requests, counselor availability templates) already ships. This plan specifies the product surface: dedicated Scheduling page, role-aware calendar views (general, per-counselor, practice-operations), appointment creation and rescheduling flows, client-aware scheduling with preselected-client support, and portal-request-to-appointment conversion.

Key scope decisions:
- general calendar for whole-practice visibility
- per-counselor calendar scoped to own appointments
- practice-manager operations view for cross-counselor scheduling
- availability-aware conflict handling
- no direct client self-booking without staff confirmation in the first cut
- no embedded telehealth session launch

RBAC is fully defined: practice owners, admins, and schedulers get full access; counselors see their own calendars only; clients never access the scheduling surface directly.

---

### Client Portal Expansion

**File:** [PLANS/CLIENT-PORTAL-EXPANSION.md](../PLANS/CLIENT-PORTAL-EXPANSION.md)
**Status:** In progress — phases 1 and 2 delivered, phase 3 partially delivered
**Prepared:** March 29, 2026

Expands the portal from a public intake page into a full tenant-configurable client self-service experience. This plan extends the foundation in [`WORKSPACE-STUDIO-FORMS-PORTAL-WORKFLOW.md`](#workspace-studio-forms--portal-workflow).

Delivered as of v4.5.0 / v5.x:
- tenant-configurable `portal_settings` with branding and messaging
- public create-account, care-request, and scheduling-request entry points
- configurable default signup form keys
- staff review queue for portal requests
- authenticated portal shell with Home, Documents, Appointments, My Info, Resources, Counselor, and Giving tabs
- encrypted `portal_client_profiles` storage

Remaining scope:
- client self-service scheduling from the portal
- counselor directory with full profile visibility
- published resource and mental health library content
- GDPR-style data-rights export and account deletion
- configurable portal branding with logo and colour overrides

---

### Client Data — Enterprise Records

**File:** [PLANS/ClientData.md](../PLANS/ClientData.md)
**Status:** Active planning
**Prepared:** March 24, 2026

Specifies the medical-practice-grade expansion of client records. The current `clients` table holds identity and status only. This plan adds comprehensive demographics, contacts, employment, insurance (legacy fields preserved in schema), diagnoses, faith background, legal/guardian, and emergency-contact tables — all following the existing thin-anchor-table pattern with AES-256-GCM encryption on every PHI field.

Key additions:
- extended `clients` core demographics (DOB, SSN last 4, gender identity, pronouns, preferred name, marital status, employment)
- normalised `client_contacts` table replacing the JSON blob in `client_lifecycles`
- `client_insurance` table (schema-level; UI deprecated in v5.2.0 in favour of the Offerings model)
- `client_diagnoses` table with ICD-10 support
- `client_legal` table for guardian/legal representative records
- full multi-tab `ClientDetailPage` with Demographics, Contacts, Clinical, Diagnoses, Faith, and Legal tabs

---

### Counselor Profiling System

**File:** [PLANS/CounselorProfiling.md](../PLANS/CounselorProfiling.md)
**Status:** Delivered (without MFA; see [USER and USER MAINTENANCE.md](#user-and-user-maintenance) for MFA scope)
**Prepared:** March 2026

Defines the comprehensive counselor record system beyond basic staff accounts. Delivered features include:

- multiple state licenses per counselor with encrypted license numbers
- certifications and CEU tracking
- clinical specialties, therapeutic modalities, and age groups served
- faith integration profile with ordination, professional memberships, and integration preferences
- employment and HR record with NPI, malpractice insurance, and employment status
- read-only availability view using the scheduling data
- `CounselorDetailPage` with seven tabs mirroring the `ClientDetailPage` pattern
- RBAC: counselors edit their own specialty and faith profiles; admins control licenses, certifications, and employment

Deferred: availability editing UI, supervision relationship management, credentialing expiry notifications, CEU reporting, counselor-facing portal.

---

### Form Library Expansion

**File:** [PLANS/FORM-LIBRARY-EXPANSION.md](../PLANS/FORM-LIBRARY-EXPANSION.md)
**Status:** Implemented — shipped in v4.7.0
**Prepared:** March 29, 2026

Specifies the rollout of 20 new form definitions that expand the Documents library from a screening-heavy catalog into a full counseling toolkit. All new forms use the existing `FormRunner` schema and remain visible in the shared Documents surface.

New form categories delivered:
- **Administrative & consent:** Informed Consent, Telehealth Consent, Release of Information
- **Clinical assessment:** Biopsychosocial Assessment, Mental Status Exam, Mood Disorder Questionnaire, Eating Disorder Screening, Anger Assessment
- **Safety:** Safety Plan Template
- **Treatment planning:** Individual Treatment Plan, SMART Goals Worksheet, Relapse Prevention Plan
- **Therapeutic worksheets:** CBT Thought Record, Cognitive Distortions Worksheet, Behavioral Activation Schedule, Coping Skills Plan, Grounding Techniques Worksheet, Mindfulness Practice Log
- **Faith-integrated:** Faith History Questionnaire, Values and Biblical Identity Worksheet

The library now ships with 39 total forms.

---

### Schedule Ops — Operational Scheduling Layer

**File:** [PLANS/ScheduleOps.md](../PLANS/ScheduleOps.md)
**Status:** In progress
**Prepared:** March 2026
**Supersedes:** CALENDAR.md Phase 4 scope

Defines the operational layer on top of the core Calendar module. Where Calendar delivers the booking surface, ScheduleOps delivers the controls that make a counseling practice run at scale.

Scope:
- **Availability overrides** — block time or open one-off slots per counselor (PTO, holidays, closures, special openings)
- **Recurring appointment series** — weekly / bi-weekly / monthly patterns with individual-exception support
- **Reminder lifecycle management** — full state machine (pending → sent / cancelled) with retry logic and delivery timestamps
- **Utilization reporting** — counselor load, location occupancy, and appointment volume exposed as a summary endpoint and dashboard widget

All new records are tenant-scoped, PHI-safe, and emit audit events. Automated waitlist promotion, client self-booking, and embedded telehealth remain explicitly deferred.

---

### User and User Maintenance

**File:** [PLANS/USER and USER MAINTENANCE.md](../PLANS/USER%20and%20USER%20MAINTENANCE.md)
**Status:** Delivered (without MFA)
**Prepared:** March 2026

Defines the staff authentication and user-maintenance module. Delivered features:

- professional login screen with account-lockout-aware UX and generic credential error messaging
- server-managed sessions in HttpOnly cookies; no tokens in localStorage
- `GET /v1/auth/me` session restore on reload
- Argon2id password hashing; no reversible password storage
- full user maintenance screen for administrators: create, edit, role change, password reset, account unlock, deactivation
- role-gated navigation enforced for `platform_admin`, `practice_owner`, and `practice_admin`
- audit events for all privileged account operations

Explicitly deferred: MFA enrollment, MFA challenge, WebAuthn, TOTP, step-up authentication, and full audit-log viewer UI.

---

### Workspace Studio Forms + Portal Workflow

**File:** [PLANS/WORKSPACE-STUDIO-FORMS-PORTAL-WORKFLOW.md](../PLANS/WORKSPACE-STUDIO-FORMS-PORTAL-WORKFLOW.md)
**Status:** Implemented — initial delivery
**Prepared:** March 28, 2026

Defines the end-to-end workflow for counselors assigning forms to clients and clients completing them through the portal. This plan is the foundation that `CLIENT-PORTAL-EXPANSION.md` extends.

Canonical data model delivered:
- `form_catalog` — one row per form template, including `is_standard_on_signup` flag
- `form_assignments` — scheduling mode, due/session timestamp, recurrence rule, status, counselor metadata
- `form_submissions` — append-only per completion with encrypted answers payload and score summary
- `portal_registration_requests` — public possible-client metadata

Workspace Studio integration:
- Documents & Inventories tab: select client, assign forms, view completion history
- Portal tab: account management, standard onboarding forms via `defaultSignupFormKeys`, portal request review queue

---

## Governance Plans

Governance plans define the permanent engineering standards that all feature work must conform to. They are not feature backlogs — they are binding contracts for implementation quality.

---

### Security and Auditing Canonical Standard

**File:** [PLANS/FULL-SECURITY-AND-AUDITING.md](../PLANS/FULL-SECURITY-AND-AUDITING.md)
**Status:** Canonical baseline — treat as source of truth for all security and auditing changes
**Prepared:** March 28, 2026
**Initiative:** AegisTrail Security & Audit Fabric

This is the canonical security and auditing implementation standard for FaithCounseling. All sessions touching security, auditing, PHI handling, RBAC, auth/session behavior, tenant isolation, exports, retention, impersonation, background jobs, or system automation must read this file first.

Defines:
- security controls and enforcement boundaries (OWASP Top 10 baseline, SQL injection prevention, CSRF, cookie security, Argon2id, AES-256-GCM)
- audit event semantics and taxonomy (canonical result values: `success`, `failure`, `denied`, `error`)
- audit ledger requirements (append-only, tamper-evident, tenant-scoped)
- audit intelligence query and UI surface requirements
- privacy and compliance constraints (no PHI in logs, telemetry, or error payloads)

The audit ledger and telemetry are separate systems. Raw audit rows are never exported via telemetry.

**AGENTS.md rule:** Any change touching the areas above must read this file before proceeding. The `AGENTS.md` at the repo root enforces this.

---

### Surface Monitoring Canonical Standard

**File:** [PLANS/FULL-SURFACE-MONITORING.md](../PLANS/FULL-SURFACE-MONITORING.md)
**Status:** Canonical baseline — treat as source of truth for all monitoring changes
**Prepared:** March 28, 2026

This is the canonical monitoring standard for FaithCounseling. All sessions touching UI, telemetry, monitoring, OTEL, health, screens, tabs, workflows, dashboards, or summaries must read this file first.

Defines:
- OTEL hybrid naming convention (`faith.ui.*` only for app-specific gaps not covered by OTEL semantic conventions)
- shared surface registry — every visible surface must have an entry; new or modified surfaces must be added
- monitoring signals required per surface: performance, usability, errors, and telemetry/export status
- local monitoring must remain available even when OTEL export is not configured
- external OTEL export is optional and config-driven
- PHI must never appear in telemetry labels (no names, emails, IDs, free text)
- placeholder but visible screens still require baseline monitoring coverage

The full surface inventory lives in this file and in `packages/telemetry/src/surfaces.js`.

**AGENTS.md rule:** Any change touching the areas above must read this file before proceeding.

---

## Infrastructure Plans

### Mantine UI Migration

**File:** [PLANS/MantineMigration.md](../PLANS/MantineMigration.md)
**Status:** Delivered — the main branch runs Mantine 8
**Prepared:** March 2026

Documents the migration from a hand-rolled CSS component system to Mantine v7/v8 — a production-grade React component library using native CSS. The plan records the component mapping, theme configuration, package selection, and migration approach.

Key packages delivered:
- `@mantine/core` — AppShell, Button, TextInput, PasswordInput, Select, Modal, Tabs, Table, Badge, Paper, Card, SimpleGrid, Group, Stack, NumberInput, ActionIcon
- `@mantine/hooks` — `useDisclosure` for modal and sidebar state
- `@mantine/form` — form state, validation, and field bindings
- `@mantine/dates` — DateInput for license, certification, and employment date fields
- `@mantine/notifications` — toast notifications replacing inline notice/error state

The theme maps the existing brand colour palette (indigo / `#4f46e5`) and Inter font to a Mantine theme object in `apps/web/src/theme.js`. All hand-rolled CSS component classes have been replaced.

---

## Operations Dashboard Upgrade

**File:** [PLANS/OPERATIONS-DASHBOARD-UPGRADE.md](../PLANS/OPERATIONS-DASHBOARD-UPGRADE.md)
**Status:** Implemented — shipped in v5.0.0
**Prepared:** March 30, 2026

Specifies the upgrade of the staff Operations Dashboard from placeholder cards to a real daily operations summary. The four cards delivered:

- **Today's Schedule** — total appointments, counselor workload rows, 1-hour gap visibility, appointment list; availability falls back to a local `09:00–12:00 / 13:00–17:00` workday when no template is declared
- **Priority Queue** — high-touchpoint clients, outstanding portal requests, next-appointment prep flags
- **Compliance Watch** — note-gap tracking (latest completed/checked-in appointment lacking a locked progress note), alert thresholds
- **Clients** — combined portal registration requests and authenticated portal appointment requests, split by status bucket

Product decisions recorded in the plan:
- first-class `high_touchpoint` flag on the `clients` table
- note-gap compliance scoped to `completed` or `checked_in` appointments without a locked progress note
- `Clients` card merges public registration and authenticated appointment-request counts

This plan extended the existing `dashboard` monitoring surface without introducing a new page or monitoring standard.

---

## Planned Extensions Not Yet Covered by a Plan File

The following areas have no dedicated plan file as of v5.2.0 but are referenced in other plans or known to be upcoming:

| Area | Context |
|------|---------|
| MFA — enrollment, challenge, recovery | Deferred in USER and USER MAINTENANCE.md |
| Automated waitlist promotion | Deferred in ScheduleOps.md and CALENDAR.md |
| Client self-booking without staff confirmation | Deferred in CLIENT-PORTAL-EXPANSION.md |
| Embedded telehealth session launch | Deferred in ScheduleOps.md |
| GDPR data-rights export and account deletion | Deferred in CLIENT-PORTAL-EXPANSION.md |
| Counselor-facing portal | Deferred in CounselorProfiling.md |
| CEU reporting and credentialing expiry notifications | Deferred in CounselorProfiling.md |
| Supervision relationship management UI | Deferred in CounselorProfiling.md |
| Full audit-log viewer UI | Deferred in USER and USER MAINTENANCE.md |
| SMS / email delivery engine for reminders | Deferred in ScheduleOps.md |
