# FULL-SECURITY-AND-AUDITING

**Status:** Canonical baseline
**Prepared:** March 28, 2026
**Initiative:** AegisTrail Security & Audit Fabric
**Stack:** Node.js API, React/standalone web, MySQL, OpenTelemetry

## Purpose

This document is the canonical security and auditing implementation standard for FaithCounseling.

It defines:

- Security controls and enforcement boundaries.
- Audit event semantics and taxonomy.
- Audit ledger requirements.
- Audit intelligence query and UI requirements.
- Privacy and compliance constraints.

This plan is the source of truth for all future security and audit changes.

## Scope

Included:

- Authentication, session lifecycle, RBAC, tenant isolation, privileged operations.
- User and system-generated audit events.
- Audit read/query APIs for privileged investigation workflows.
- Audit intelligence UI behavior and role gates.
- Privacy-safe security telemetry (aggregate only).

Excluded from initial implementation slices:

- Unbounded topology rendering of entire tenant event graphs.
- AI anomaly detection and speculative causality inference.
- Export of raw audit rows through telemetry pipelines.

## Non-Negotiable Rules

- Every user move and every system-generated security-relevant event is auditable unless explicitly exempted in this plan.
- Audit ledger writes are append-only. No updates or deletes of audit rows.
- Audit and telemetry are separate systems. Do not treat telemetry as a compliance ledger.
- Never emit PHI, free text, names, emails, or high-cardinality IDs into telemetry labels.
- Audit metadata must be strict, bounded, and allowlisted.
- Audit access is privileged and role-gated.

## Canonical Audit Event Contract

Required fields:

- `id`
- `tenantId`
- `occurredAt`
- `action`
- `targetType`
- `targetId`
- `actorId`
- `actorRole`
- `actorType`
- `result`
- `reasonCode`
- `requestId`
- `sourceSurface`
- `sourceWorkflow`
- `systemComponent`

Required result semantics:

- `success`
- `failure`
- `denied`
- `error`

Reason code requirements:

- Short, bounded enum-style strings only.
- No free text.
- Examples: `validation_failed`, `rbac_denied`, `tenant_scope_denied`, `dependency_timeout`.

Actor type requirements:

- `user`
- `system`
- `service`
- `anonymous`

## Taxonomy Standard

Action names must follow:

- `domain.resource.operation`
- Optional: `domain.resource.operation.subresource`

Examples:

- `client.record.read`
- `client.record.update`
- `auth.session.login`
- `security.rbac.denied`
- `platform.export.create`
- `system.worker.reminder.sent`

Coverage requirement:

- Reads of sensitive resources.
- Mutations.
- Denials.
- Failures.
- Authentication/session lifecycle.
- Impersonation lifecycle.
- Exports and retention changes.
- Worker and startup/shutdown system events.

## Ledger Requirements

- Primary store: append-only `audit_events` ledger in DB mode.
- In-memory mode: rolling runtime buffer for local investigation only.
- Retention: configurable policy with legal hold support.
- Tamper-evidence: introduce hash-chain sealing fields in future schema phase.

## Query And Intelligence Requirements

Required privileged audit APIs:

- Summary by result, action, actor role, and target type.
- Time-window filters (default narrow windows).
- Recent event list with pagination/limit.

Query constraints:

- Tenant-scoped by default.
- Cross-tenant access only for platform admin workflows.
- Sensitive query paths must be auditable themselves.

## Security Telemetry Split

Allowed telemetry:

- Aggregated counters and timings, such as denied count, failure count, audit query latency.

Disallowed telemetry:

- Raw audit event rows.
- Actor IDs, target IDs, request IDs.
- Free-form payload values.

## Audit Intelligence UI Requirements

The default experience must be investigation-first:

- Bounded time windows.
- Filter-first event table.
- Actor and resource summary cards.
- Drill-down panel for selected event details.

Graph/topology visualizations are optional and secondary:

- Must be bounded by active filters.
- Must never default to whole-tenant unbounded rendering.

## Role And Access Requirements

Minimum policy:

- View summaries/events: practice admin, practice owner, platform admin.
- Export or high-risk audit operations: role gate plus re-auth confirmation path.
- Client role must never access audit intelligence routes.

## Validation Requirements

- Verify coverage matrix for all major domains and system workflows.
- Verify denied/failure paths are auditable.
- Verify role-gated access for audit query endpoints.
- Verify no PHI or high-cardinality leakage in telemetry.
- Verify monitoring includes the audit intelligence surface and workflows.

## Documentation And Change Control

- Update this file first for changes to security/audit standards.
- Then update `PLANS/FULL-SURFACE-MONITORING.md` for visible-surface monitoring implications.
- Then update `AGENTS.md` enforcement rules.
- Update README and release notes when user-visible behavior changes.
