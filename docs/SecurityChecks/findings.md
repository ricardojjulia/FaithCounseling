# Security Findings

## Review Summary
- Date: 2026-04-06
- Scope reviewed: `apps/api`, `apps/web/server.js`, `apps/worker/src/index.js`, `apps/api/src/db/schema.sql`, `apps/api/src/db/migrate.js`, security-related query modules, security tests, and existing security docs under `docs/SecurityChecks/`
- Overall risk rating: High
- PHI/PII exposure risk: High
- Notes: Review was code-and-config based only. No runtime validation or infrastructure-side inspection was available in this session.

## Findings Register

### F-001 - Public and admin portal flows return live credentials in API responses
- Severity: Critical
- Confidence: High
- Category: AuthN, API Security, Secrets, Privacy
- Status: Open
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/index.js`
- Evidence: `activatePortalSignupRequest()` returns `temporaryPassword` in its result (`apps/api/src/index.js:4815-4874`); `handlePortalPublicRequests()` returns the `activation` object on the unauthenticated public request path when `registrationMode === 'instant_activation'` (`apps/api/src/index.js:5231-5369`); `handlePortalAccounts()` also returns `temporaryPassword` in the admin API response (`apps/api/src/index.js:7689-7800`).
- Risk: Authentication secrets are exposed to browsers, client-side tooling, reverse proxies, observability layers, and any middleware that captures response bodies.
- Impact: A public account-signup request can receive a working portal password immediately, and privileged staff APIs also emit reusable credentials into normal application traffic. Either path can enable account takeover and downstream PHI exposure.
- PHI/PII relevance: Portal accounts gate access to counseling records, uploads, messages, demographics, and exportable client data.
- Manual verification needed: Confirm whether any deployed tenant uses `instant_activation`, and whether any upstream logging or APM product records response bodies.

### F-002 - Password reset tokens are disclosed back to callers outside production mode
- Severity: High
- Confidence: High
- Category: AuthN, API Security, Secrets
- Status: Open
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/lib/auth.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/index.js`
- Evidence: `requestPortalPasswordReset()` returns `resetToken` whenever `NODE_ENV !== 'production'` (`apps/api/src/lib/auth.js:495-535`); `handlePortalPasswordResetRequest()` serializes `result.resetToken` directly in the HTTP response body (`apps/api/src/index.js:2107-2118`).
- Risk: Any shared dev, demo, or staging environment that is not explicitly marked production can expose live reset secrets to the requester.
- Impact: An attacker who can reach a non-production deployment can request a reset and immediately complete it without access to the victim's mailbox, resulting in portal account takeover.
- PHI/PII relevance: Compromised portal accounts expose client profile, messages, uploads, appointments, and export endpoints.
- Manual verification needed: Verify deployed `NODE_ENV` values and whether non-production environments contain real or realistic client data.

### F-003 - MFA flags exist in storage and APIs, but the login flow does not enforce a second factor
- Severity: Medium
- Confidence: High
- Category: AuthN, Compliance Risk
- Status: Open
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/lib/auth.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/db/queries/portal.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/db/schema.sql`
- Evidence: Staff and portal account records persist `mfa_enabled` (`apps/api/src/db/schema.sql:84`, `apps/api/src/db/queries/portal.js:21-31`), and portal account APIs allow toggling `mfaEnabled` (`apps/api/src/index.js:7729-7793`), but `login()` creates staff or portal sessions immediately after password verification with no OTP/WebAuthn/TOTP challenge branch (`apps/api/src/lib/auth.js:171-325`).
- Risk: Operators can believe MFA is active when the codebase still authenticates with passwords alone.
- Impact: Password compromise, credential stuffing, or reused credentials remain sufficient to reach PHI-bearing sessions even when `mfa_enabled` is true.
- PHI/PII relevance: Staff and client sessions unlock sensitive clinical, legal, billing, and portal data.
- Manual verification needed: Confirm whether a second-factor enforcement layer exists outside this repository.

### F-004 - Worker logs raw reminder identifiers and raw audit events outside the redacted logger
- Severity: Medium
- Confidence: High
- Category: Logging, Privacy, Compliance Risk
- Status: Open
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/worker/src/index.js`
- Evidence: The worker prints reminder processing messages containing `appointment_id` and `client_id` (`apps/worker/src/index.js:73-109`) and emits raw JSON audit events with `tenantId`, `action`, and `targetId` via `console.log(JSON.stringify(...))` (`apps/worker/src/index.js:28-39`, `apps/worker/src/index.js:102-109`).
- Risk: User-linked identifiers and raw audit payloads can leak into centralized log systems, shell history, or third-party log processors without the redaction controls used by `apps/api/src/lib/log.js`.
- Impact: Log readers can correlate reminder activity to specific tenants and client records, and audit/event separation requirements from the security baseline are weakened.
- PHI/PII relevance: Even without names, client-linked identifiers and appointment relationships are sensitive operational metadata in a counseling system.
- Manual verification needed: Review actual log shipping destinations and retention for worker stdout.

### F-005 - Portal uploads accept arbitrary file content with no type allowlist or malware control
- Severity: Medium
- Confidence: Medium
- Category: API Security, File Upload, Privacy
- Status: Open
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/index.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/db/queries/portal.js`
- Evidence: `handlePortalUploads()` only checks base64 validity, non-empty content, and a 2 MB limit while trusting caller-supplied `mimeType` (`apps/api/src/index.js:8381-8471`); `createPortalUpload()` stores the file body as encrypted base64 with no signature sniffing, extension policy, or quarantine stage (`apps/api/src/db/queries/portal.js:476-507`); the client export bundle includes uploads with `includeContent: true` (`apps/api/src/index.js:8201-8245`).
- Risk: The platform can persist and later redistribute arbitrary active content or malicious documents under attacker-chosen MIME labels.
- Impact: Staff or client devices may receive unsafe files, and harmful content can travel through exports even though the application never validated it.
- PHI/PII relevance: Portal uploads are likely to contain intake and identity documents tied to a client record.
- Manual verification needed: Verify whether upload scanning or download sanitization happens in infrastructure or an external service.

### F-006 - Lookup hashes reuse the encryption key, while security docs imply separate secrets that the code does not use
- Severity: Low
- Confidence: High
- Category: Crypto, Secrets, Configuration
- Status: Open
- Affected files: `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/lib/encrypt.js`, `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/README.md`
- Evidence: `deriveLookupHash()` uses the same `key()` loaded from `DB_ENCRYPTION_KEY` that also backs AES-256-GCM encryption (`apps/api/src/lib/encrypt.js:21-39`, `apps/api/src/lib/encrypt.js:113-121`); `apps/api/README.md` documents `DB_ENCRYPTION_HMAC_KEY` and `SESSION_SECRET` as required inputs even though the inspected auth and crypto code paths do not consume them (`apps/api/README.md:16-30`).
- Risk: Key-separation assumptions are weaker than documentation suggests, and operators may believe extra secrets are active controls when they are not.
- Impact: Secret rotation and blast-radius planning become harder, and configuration reviews can miss the fact that one key currently serves both confidentiality and deterministic lookup purposes.
- PHI/PII relevance: The shared key protects encrypted PHI and also enables sensitive identifier lookup hashing.
- Manual verification needed: Confirm whether deployment tooling injects additional unused secrets or relies on the README contract.

## Sensitive Data Inventory
- PHI: client demographics, DOB, SSN fragments, treatment plans, progress notes, diagnoses, medications, allergies, clinical history, legal/guardianship data, portal messages, uploads, intake answers — primarily in `/home/runner/work/FaithCounseling/FaithCounseling/apps/api/src/db/schema.sql` and related query modules; several flows correctly encrypt these fields, but portal/auth responses and worker logs still create secondary exposure paths.
- PII: names, emails, phone numbers, addresses, contact details, employment/licensure identifiers, portal registration details — found across `clients`, `staff_members`, `portal_*`, `client_*`, and `tenant_provisioning` tables plus route handlers in `apps/api/src/index.js`; response shaping is uneven and some credentials/secrets are returned directly.
- Secrets: session cookies, password reset tokens, temporary passwords, DB credentials, encryption key material — managed in `apps/api/src/lib/auth.js`, `apps/api/src/lib/encrypt.js`, `apps/api/src/db/pool.js`, `apps/web/server.js`, and `apps/api/README.md`; credential disclosure findings show some secrets are still exposed over application responses.
- Sensitive operational metadata: tenant IDs, client IDs, appointment IDs, audit target IDs, export job IDs — found in API/worker audit and logging paths; these values are less sensitive than raw PHI but still enable user and record correlation.

## Areas Requiring Manual Validation
- Production portal registration mode and whether any tenant enables `instant_activation`
- Deployed `NODE_ENV` values for all environments that contain real or realistic client data
- Reverse proxy, CDN, APM, and log pipelines for response-body capture and worker stdout collection
- Database transport security posture (`DB_SSL=true` or equivalent) in real deployments
- Any out-of-repo MFA, malware scanning, or secure file delivery controls
