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
- Operational logs must be structured, request-correlated, and PHI/PII-safe.
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

## Operational Logging Standard

Required API logging behavior:

- Emit structured JSON lines for startup, request failures, request warnings, and audit-write failures.
- Include stable operational context: `timestamp`, `level`, `event`, `requestId`, normalized `route`, HTTP `method`, `statusCode`, `durationMs`, tenant context, and actor role when available.
- Return or generate a request correlation ID on every API response and reuse it across request and audit logs.
- Use normalized route templates rather than raw request paths when logging API traffic.

Disallowed log content:

- Request or response bodies.
- Raw SQL statements or unbounded DB payload dumps.
- Names, emails, phone numbers, addresses, notes, messages, document text, or other free-text content.
- Authorization headers, cookies, session secrets, bearer tokens, or password material.

Usability requirements:

- Server failures must produce a dedicated structured error line in addition to the HTTP response.
- Client errors and slow requests must emit structured warning lines rather than disappearing silently.
- Audit console output must use the same structured logger rather than ad hoc string prefixes.

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

## v5.6.0 API Security And Compliance Engineering Standard

**Status:** Active baseline extension
**Effective:** April 1, 2026

### Baseline Purpose

This section defines the API-specific secure-engineering and privacy-engineering baseline for all new and modified endpoints, workers, integrations, and related data flows.

This baseline is designed for high-trust environments where PHI, PII, confidential business data, and payment-related records may exist now or in the future.

### Security And Compliance Posture

All API work must maintain or improve controls aligned with:

- HIPAA-oriented technical safeguards
- GDPR-aligned privacy engineering
- SOC 2-oriented control evidence and repeatability
- PCI-conscious data minimization and payment isolation

No implementation may claim legal certification by default. Engineering must provide technical safeguards and operational traceability that support formal compliance programs.

### Core Engineering Principles

- secure-by-design and privacy-by-design
- deny-by-default authorization behavior
- least privilege for users, services, and background jobs
- data minimization at collection, storage, and response boundaries
- explicit, auditable, maintainable implementation over implicit behavior

### API Control Requirements

#### Authentication

- Require strong authentication for all non-public endpoints.
- Never trust client-provided identity context without server-side verification.
- Keep credentials and sessions out of logs, telemetry, and client-visible errors.

#### Authorization

- Enforce object-level and tenant-level authorization on every sensitive operation.
- Prevent cross-tenant and cross-user access by default.
- Treat missing authorization checks as defects.

#### Input Validation

- Validate body, params, query, headers, and upload payloads as untrusted input.
- Prefer explicit allowlists and schema-based validation.
- Reject malformed, oversized, or unexpected payloads.

#### Output Protection

- Return only required response fields.
- Avoid raw model/entity passthrough in client responses.
- Mask or omit sensitive fields by default.

#### Error Handling

- Return safe, structured errors without internal implementation details.
- Keep stack traces, SQL details, and secret-bearing context out of client responses.

#### Abuse And Reliability Controls

- Apply rate limiting and abuse protections to auth, export, search, and expensive endpoints.
- Use idempotency patterns for critical writes where duplicate side effects are high risk.

### Sensitive Data Handling Rules

Treat as sensitive by default:

- PHI/ePHI and clinical content
- PII and government identifiers
- payment-related records and payment tokens
- passwords, session IDs, API keys, and access/refresh tokens
- document contents and metadata that can reveal protected context

Required handling:

- no sensitive values in logs/telemetry traces
- no hardcoded secrets in source or docs
- minimum necessary storage and propagation
- parameterized query patterns for DB access
- tenant-bound query constraints on every data path

### Logging, Audit, And Monitoring

- Preserve structured, request-correlated operational logs with redaction.
- Preserve append-only audit semantics and canonical result taxonomy (`success`, `failure`, `denied`, `error`).
- Keep audit and telemetry separate systems.
- Do not emit raw audit rows or sensitive IDs in telemetry labels.

### Data Lifecycle And Privacy Operations

- Implement retention-aware handling and controlled deletion pathways where data class requires it.
- Preserve correction/update and export access pathways for personal data workflows where applicable.
- Avoid repurposing personal data without explicit design and review.

### Delivery Requirements For Security-Relevant Changes

For meaningful API changes, include or update tests for:

- authentication and authorization
- tenant isolation and negative access cases
- validation and malformed payload rejection
- sensitive field redaction and output restrictions
- secure error handling
- audit event emission behavior for sensitive operations

### Non-Negotiable Prohibitions

Do not:

- hardcode secrets or credentials
- bypass authorization for convenience
- log PHI/PII/payment secrets/tokens
- expose stack traces or infrastructure internals to clients
- introduce undocumented privileged behavior or backdoors

### Rollout And Maintenance

- Apply this baseline to all new API work immediately.
- Treat legacy gaps as remediation backlog and close incrementally during touchpoints.
- Record user-visible baseline updates in README and changelog entries.
