# Security Recommendations

## Priority Summary
- Immediate: Remove credential/reset secret disclosure from HTTP responses; stop worker raw-ID/raw-audit logging
- Near-term: Enforce real MFA semantics; harden portal upload controls
- Planned: Separate cryptographic keys and align security documentation with runtime behavior

## Remediation Plan

### R-001 - Eliminate authentication secret disclosure in portal APIs
- Related findings: F-001, F-002
- Priority: Immediate
- Effort: M
- Suggested owner: Backend
- Recommendation: Stop returning temporary passwords, reset tokens, or equivalent authentication material in normal API responses. Replace these flows with one-time delivery through approved out-of-band channels or controlled operator-only tooling that is not exposed over standard HTTP endpoints.
- Implementation notes: Remove `temporaryPassword` and `resetToken` from public and admin JSON responses; require explicit invitation/reset completion flows that do not leak reusable secrets into browsers, logs, or proxies; disable or tightly gate `instant_activation` until a safe credential-delivery path exists.
- Definition of done: No portal signup, account-creation, or password-reset API response contains reusable credentials or reset secrets in any environment.

### R-002 - Either enforce MFA end-to-end or remove the misleading toggle
- Related findings: F-003
- Priority: Near-term
- Effort: L
- Suggested owner: Backend, Security
- Recommendation: Implement a real second-factor challenge for accounts marked `mfa_enabled`, or remove/hide the flag until the full control exists.
- Implementation notes: The login flow should branch on the stored MFA setting, require a second factor before session issuance, and record audit outcomes for MFA success, failure, and bypass attempts.
- Definition of done: Accounts with MFA enabled cannot receive a session cookie without a validated second factor, and the UI/API no longer presents MFA as active unless enforcement is live.

### R-003 - Move worker output to the same redacted structured logging standard as the API
- Related findings: F-004
- Priority: Immediate
- Effort: S
- Suggested owner: App, Backend
- Recommendation: Replace ad hoc `console.log` and raw `JSON.stringify(auditEvent)` calls in the worker with structured, redacted logging and minimal operational fields.
- Implementation notes: Do not print raw audit rows or user-linked IDs to stdout; if identifiers are operationally required, use bounded internal references and the same redaction policy already defined in `apps/api/src/lib/log.js`.
- Definition of done: Worker logs exclude client/appointment identifiers and no worker path prints raw audit event payloads directly.

### R-004 - Harden the portal upload pipeline before treating uploads as trusted content
- Related findings: F-005
- Priority: Near-term
- Effort: M
- Suggested owner: App, Security
- Recommendation: Add a strict upload allowlist, server-side file signature validation, quarantine/scanning, and safe download/export handling for uploaded documents.
- Implementation notes: Validate extensions and magic bytes, reject active content that should never be stored, add malware scanning or quarantine review, and ensure exported/downloaded files carry safe metadata and naming.
- Definition of done: Uploads are restricted to approved document classes, untrusted content is scanned or quarantined before reuse, and unsafe file types are blocked.

### R-005 - Introduce key separation and fix security configuration drift
- Related findings: F-006
- Priority: Planned
- Effort: S
- Suggested owner: Backend, DevOps
- Recommendation: Use separate secrets for encryption and deterministic lookup hashing, and update all docs/config references so they match runtime behavior.
- Implementation notes: Load a dedicated HMAC key for lookup hashing, retain the encryption key for AES-GCM only, and remove or wire up any documented but unused secrets such as `SESSION_SECRET`.
- Definition of done: Runtime uses distinct keys for encryption and lookup hashing, and repository docs describe only the secrets the code actually consumes.

### R-006 - Enforce strict host-based tenant isolation before SaaS rollout
- Related findings: F-007
- Priority: Near-term
- Effort: S
- Suggested owner: Backend, DevOps
- Recommendation: Require strict unknown-tenant rejection and explicit tenant allowlisting in every non-local environment that uses host-based tenant routing.
- Implementation notes: Runtime now fails fast when `ENABLE_TENANT_HOST_ROUTING=true` in non-local runtime without strict mode. Complete rollout by enforcing deployment policy that always enables tenant-host mode and strict mode together for SaaS traffic, and validate provisioning-driven slug sets match active tenants.
- Definition of done: Unknown tenant hosts always return 404 in staging/production, startup guard is active in deployment policy checks, and active tenant slugs are sourced from provisioning data.

### R-007 - Enforce canonical tenant provisioning lifecycle transitions across all tooling
- Related findings: F-008
- Priority: Near-term
- Effort: S
- Suggested owner: Backend, Platform
- Recommendation: Require all tenant provisioning updates to follow the canonical status lifecycle (`queued` -> `in_progress` -> `completed` or `failed`) via guarded API transitions.
- Implementation notes: Use `PATCH /v1/platform/tenant-provisioning` for status updates, reject invalid transitions, ensure automation scripts do not bypass lifecycle checks with direct DB writes, and keep endpoint-level transition tests in CI coverage.
- Definition of done: All provisioning transitions are API-driven, invalid jumps are blocked with 409, `completed` is the only status used for active tenant host activation, and regression/smoke scripts follow the same transition flow.

## Quick Wins
- Remove `temporaryPassword` from public and admin portal API responses.
- Remove `resetToken` from password-reset HTTP responses in every environment.
- Stop logging raw audit objects and client-linked reminder identifiers from the worker.
- Add a deployment review item to verify `instant_activation` is disabled until credential delivery is safe.
- Add deployment checks to require strict tenant host routing (`TENANT_STRICT_HOST_ROUTING=true`) and explicit tenant slug allowlists.
- Update provisioning automation to use canonical lifecycle transitions and avoid direct status writes.

## Longer-Term Hardening
- Add end-to-end MFA coverage and negative tests for MFA-required accounts.
- Add automated AppSec checks for “credential in response body” patterns.
- Add upload malware scanning/quarantine and explicit safe-download headers.
- Review production transport encryption, response-body logging, and export-access step-up authentication as part of a broader privacy architecture pass.
