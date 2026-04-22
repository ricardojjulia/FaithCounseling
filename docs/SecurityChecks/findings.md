# Security Findings

## Review Summary
- Date: 2026-04-06 (updated 2026-04-06 — post-remediation)
- Scope reviewed: `apps/api`, `apps/web/server.js`, `apps/worker/src/index.js`, `apps/api/src/db/schema.sql`, `apps/api/src/db/migrate.js`, security-related query modules, security tests, and existing security docs under `docs/SecurityChecks/`
- Overall risk rating: Medium (reduced from High after remediation)
- PHI/PII exposure risk: Medium (reduced from High after credential-disclosure and log-leakage fixes)
- Notes: Review was code-and-config based only. No runtime validation or infrastructure-side inspection was available in this session. All findings have been remediated or mitigated in code; manual validation items remain.

## Findings Register

### F-001 - Public and admin portal flows return live credentials in API responses
- Severity: Critical
- Confidence: High
- Category: AuthN, API Security, Secrets, Privacy
- Status: Fixed
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/index.js`
- Evidence: `activatePortalSignupRequest()` returns `temporaryPassword` in its result (`apps/api/src/index.js:4815-4874`); `handlePortalPublicRequests()` returns the `activation` object on the unauthenticated public request path when `registrationMode === 'instant_activation'` (`apps/api/src/index.js:5231-5369`); `handlePortalAccounts()` also returns `temporaryPassword` in the admin API response (`apps/api/src/index.js:7689-7800`).
- Risk: Authentication secrets are exposed to browsers, client-side tooling, reverse proxies, observability layers, and any middleware that captures response bodies.
- Impact: A public account-signup request can receive a working portal password immediately, and privileged staff APIs also emit reusable credentials into normal application traffic. Either path can enable account takeover and downstream PHI exposure.
- PHI/PII relevance: Portal accounts gate access to counseling records, uploads, messages, demographics, and exportable client data.
- Remediation applied: `temporaryPassword` stripped from all API response bodies — public portal request responses (both DB and in-memory), admin portal account creation responses, staff account provisioning response, and staff password reset response. In-memory portal account `item` object no longer stores `temporaryPassword` as a field. Staff should use out-of-band delivery (direct communication or secure email) for initial credentials.
- Manual verification needed: Confirm whether any deployed tenant uses `instant_activation`, and whether any upstream logging or APM product records response bodies.

### F-002 - Password reset tokens are disclosed back to callers outside production mode
- Severity: High
- Confidence: High
- Category: AuthN, API Security, Secrets
- Status: Fixed
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/lib/auth.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/index.js`
- Evidence: `requestPortalPasswordReset()` returns `resetToken` whenever `NODE_ENV !== 'production'` (`apps/api/src/lib/auth.js:495-535`); `handlePortalPasswordResetRequest()` serializes `result.resetToken` directly in the HTTP response body (`apps/api/src/index.js:2107-2118`).
- Risk: Any shared dev, demo, or staging environment that is not explicitly marked production can expose live reset secrets to the requester.
- Impact: An attacker who can reach a non-production deployment can request a reset and immediately complete it without access to the victim's mailbox, resulting in portal account takeover.
- PHI/PII relevance: Compromised portal accounts expose client profile, messages, uploads, appointments, and export endpoints.
- Remediation applied: `requestPortalPasswordReset()` never returns the raw token in any environment. The HTTP handler no longer forwards any reset-token field. Only `expiresAt` is returned when an account was found. Reset tokens must be delivered via out-of-band channel (e.g., email).
- Manual verification needed: Verify deployed `NODE_ENV` values and whether non-production environments contain real or realistic client data.

### F-003 - MFA flags exist in storage and APIs, but the login flow does not enforce a second factor
- Severity: Medium
- Confidence: High
- Category: AuthN, Compliance Risk
- Status: Mitigated (partial — full TOTP/WebAuthn implementation deferred)
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/lib/auth.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/db/queries/portal.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/db/schema.sql`
- Evidence: Staff and portal account records persist `mfa_enabled` (`apps/api/src/db/schema.sql:84`, `apps/api/src/db/queries/portal.js:21-31`), and portal account APIs allow toggling `mfaEnabled` (`apps/api/src/index.js:7729-7793`), but `login()` creates staff or portal sessions immediately after password verification with no OTP/WebAuthn/TOTP challenge branch (`apps/api/src/lib/auth.js:171-325`).
- Risk: Operators can believe MFA is active when the codebase still authenticates with passwords alone.
- Impact: Password compromise, credential stuffing, or reused credentials remain sufficient to reach PHI-bearing sessions even when `mfa_enabled` is true.
- PHI/PII relevance: Staff and client sessions unlock sensitive clinical, legal, billing, and portal data.
- Remediation applied: (1) Portal login now gates on `mfa_enabled`: if set, session creation is blocked with a 403 after successful password verification — the flag is no longer silently bypassed. (2) Setting `mfaEnabled: true` via the portal accounts API (POST and PATCH, both DB and in-memory paths) now returns HTTP 400 with a clear message that MFA is not yet available. Full TOTP/WebAuthn implementation is a separate planned feature.
- Manual verification needed: Confirm whether a second-factor enforcement layer exists outside this repository. Staff account MFA was not flagged in the original evidence but the portal login gate is now active for portal accounts.

### F-004 - Worker logs raw reminder identifiers and raw audit events outside the redacted logger
- Severity: Medium
- Confidence: High
- Category: Logging, Privacy, Compliance Risk
- Status: Fixed
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/worker/src/index.js`
- Evidence: The worker prints reminder processing messages containing `appointment_id` and `client_id` (`apps/worker/src/index.js:73-109`) and emits raw JSON audit events with `tenantId`, `action`, and `targetId` via `console.log(JSON.stringify(...))` (`apps/worker/src/index.js:28-39`, `apps/worker/src/index.js:102-109`).
- Risk: User-linked identifiers and raw audit payloads can leak into centralized log systems, shell history, or third-party log processors without the redaction controls used by `apps/api/src/lib/log.js`.
- Impact: Log readers can correlate reminder activity to specific tenants and client records, and audit/event separation requirements from the security baseline are weakened.
- PHI/PII relevance: Even without names, client-linked identifiers and appointment relationships are sensitive operational metadata in a counseling system.
- Remediation applied: `createAuditEvent` import removed. Startup and per-reminder raw audit JSON dumps removed. `appointment_id` and `client_id` removed from all reminder processing log messages. Reminder skip log no longer includes reminder ID. Telemetry (`telemetry.recordMutation`) remains for operational observability.
- Manual verification needed: Review actual log shipping destinations and retention for worker stdout.

### F-005 - Portal uploads accept arbitrary file content with no type allowlist or malware control
- Severity: Medium
- Confidence: Medium
- Category: API Security, File Upload, Privacy
- Status: Mitigated (type allowlist and magic-byte validation added; malware scanning not yet implemented)
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/index.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/db/queries/portal.js`
- Evidence: `handlePortalUploads()` only checks base64 validity, non-empty content, and a 2 MB limit while trusting caller-supplied `mimeType` (`apps/api/src/index.js:8381-8471`); `createPortalUpload()` stores the file body as encrypted base64 with no signature sniffing, extension policy, or quarantine stage (`apps/api/src/db/queries/portal.js:476-507`); the client export bundle includes uploads with `includeContent: true` (`apps/api/src/index.js:8201-8245`).
- Risk: The platform can persist and later redistribute arbitrary active content or malicious documents under attacker-chosen MIME labels.
- Impact: Staff or client devices may receive unsafe files, and harmful content can travel through exports even though the application never validated it.
- PHI/PII relevance: Portal uploads are likely to contain intake and identity documents tied to a client record.
- Remediation applied: File extension allowlist (`UPLOAD_ALLOWED_EXTENSIONS`), MIME-type allowlist (`UPLOAD_ALLOWED_MIME_TYPES`), and magic-bytes signature verification (`UPLOAD_FILE_SIGNATURES` / `detectUploadFileSignature()`) added in `handlePortalUploads()`. Uploads are rejected if extension or MIME type is not on the allowlist, or if detected file signature contradicts the declared MIME type. Accepted formats: PDF, JPEG, PNG, GIF, TIFF, DOCX, DOC, TXT. Active-content formats (HTML, SVG, script files, executables) are blocked. Malware scanning/quarantine remains a future infrastructure concern.
- Manual verification needed: Verify whether upload scanning or download sanitization happens in infrastructure or an external service.

### F-006 - Lookup hashes reuse the encryption key, while security docs imply separate secrets that the code does not use
- Severity: Low
- Confidence: High
- Category: Crypto, Secrets, Configuration
- Status: Fixed
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/lib/encrypt.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/README.md`
- Evidence: `deriveLookupHash()` uses the same `key()` loaded from `DB_ENCRYPTION_KEY` that also backs AES-256-GCM encryption (`apps/api/src/lib/encrypt.js:21-39`, `apps/api/src/lib/encrypt.js:113-121`); `apps/api/README.md` documents `DB_ENCRYPTION_HMAC_KEY` and `SESSION_SECRET` as required inputs even though the inspected auth and crypto code paths do not consume them (`apps/api/README.md:16-30`).
- Risk: Key-separation assumptions are weaker than documentation suggests, and operators may believe extra secrets are active controls when they are not.
- Impact: Secret rotation and blast-radius planning become harder, and configuration reviews can miss the fact that one key currently serves both confidentiality and deterministic lookup purposes.
- PHI/PII relevance: The shared key protects encrypted PHI and also enables sensitive identifier lookup hashing.
- Remediation applied: `encrypt.js` now loads `DB_ENCRYPTION_HMAC_KEY` separately via `loadHmacKey()` / `hmacKey()`. When set, `deriveLookupHash()` uses it exclusively; when absent, it falls back to the main key for backward compatibility. Changing the HMAC key invalidates all existing lookup hashes — a rehash migration is required before switching keys in production. README already documented the variable correctly.
- Manual verification needed: Confirm whether deployment tooling injects additional unused secrets or relies on the README contract.

### F-007 - Tenant host isolation requires strict tenant-host mode for non-local SaaS routing
- Severity: Medium
- Confidence: Medium
- Category: AuthZ, Tenant Isolation, Configuration
- Status: Mitigated (stronger runtime guard added)
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/db/pools.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/db/pool.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/middleware/tenant.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/index.js`
- Evidence: Request handling resolves tenant context from host and runs inside tenant-scoped DB context (`apps/api/src/index.js` server wrapper and `runWithTenantContext`). Known tenant slugs are now loaded from `tenant_provisioning` with env fallback (`apps/api/src/db/pools.js`). Unknown tenant rejection is enforced against that canonical set when `TENANT_STRICT_HOST_ROUTING=true` (`apps/api/src/middleware/tenant.js`). Startup now fails fast in non-local runtime when `ENABLE_TENANT_HOST_ROUTING=true` without strict mode (`apps/api/src/index.js`).
- Risk: If teams route real SaaS host traffic without enabling tenant-host mode and strict mode as intended, tenant host isolation guarantees can still be weakened by configuration drift.
- Impact: Weak host-routing configuration can undermine expected tenant boundary guarantees in production SaaS mode.
- PHI/PII relevance: Tenant isolation failures can expose cross-practice metadata or records.
- Remediation applied: Added DB-backed canonical tenant slug source, strict-mode unknown-tenant 404 enforcement against canonical slugs, and non-local startup guard requiring strict mode when tenant-host routing is enabled.
- Manual verification needed: Confirm staging/production explicitly set `ENABLE_TENANT_HOST_ROUTING=true` with `TENANT_STRICT_HOST_ROUTING=true`, and verify provisioning statuses correctly represent active tenants.

### F-008 - Tenant provisioning status updates needed explicit lifecycle transition controls
- Severity: Medium
- Confidence: High
- Category: Tenant Isolation, Change Control, API Integrity
- Status: Fixed
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/lib/tenant-provisioning.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/index.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/db/queries/platform.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/db/pools.js`
- Evidence: Platform tenant provisioning previously accepted create-time statuses only and lacked a guarded update path for lifecycle progression. This slice introduces canonical status normalization plus transition validation and adds a `PATCH` update path that rejects invalid jumps (`409`) and audit-logs updates.
- Risk: Without transition control, manual or script-driven status mutations can incorrectly mark tenant provisioning states and affect host-routing activation decisions.
- Impact: Incorrect tenant activation posture can weaken isolation controls and operational safety during provisioning.
- PHI/PII relevance: Provisioning state drives tenant-level access boundaries, which protect practice-isolated data.
- Remediation applied: Added canonical status lifecycle helper (`queued`, `in_progress`, `completed`, `failed`), enforced transition rules in `PATCH /v1/platform/tenant-provisioning`, added request-by-id lookup for transition validation, and aligned provisioned tenant detection to canonical `completed` status.
- Manual verification needed: Validate provisioning orchestration jobs and admin tooling follow the new transition path and status model in staging/production.

## Sensitive Data Inventory
- PHI: client demographics, DOB, SSN fragments, treatment plans, progress notes, diagnoses, medications, allergies, clinical history, legal/guardianship data, portal messages, uploads, intake answers — primarily in `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/db/schema.sql` and related query modules; several flows correctly encrypt these fields. The credential-disclosure and log-leakage paths from the original review have been remediated.
- PII: names, emails, phone numbers, addresses, contact details, employment/licensure identifiers, portal registration details — found across `clients`, `staff_members`, `portal_*`, `client_*`, and `tenant_provisioning` tables plus route handlers in `apps/api/src/index.js`.
- Secrets: session cookies, password reset tokens, temporary passwords, DB credentials, encryption key material — managed in `apps/api/src/lib/auth.js`, `apps/api/src/lib/encrypt.js`, `apps/api/src/db/pool.js`, `apps/web/server.js`, and `apps/api/README.md`; no secrets are returned in API responses after this remediation pass.
- Sensitive operational metadata: tenant IDs, client IDs, appointment IDs, audit target IDs, export job IDs — previously leaked via worker logs; worker now logs only operational summaries without user-linked identifiers.

## Areas Requiring Manual Validation
- Out-of-band credential delivery: initial portal passwords and staff resets are no longer returned in API responses; a secure delivery mechanism (email, secure invite link) must be implemented before onboarding new clients
- Production portal registration mode and whether any tenant enables `instant_activation`
- Deployed `NODE_ENV` values for all environments that contain real or realistic client data
- Reverse proxy, CDN, APM, and log pipelines for response-body capture and worker stdout collection
- Database transport security posture (`DB_SSL=true` or equivalent) in real deployments
- Full MFA implementation (TOTP/WebAuthn) for accounts marked `mfa_enabled`
- Malware scanning / quarantine for portal uploads
- Rehash migration if `DB_ENCRYPTION_HMAC_KEY` is introduced in an existing deployment
