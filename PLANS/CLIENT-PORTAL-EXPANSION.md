# CLIENT PORTAL EXPANSION PLAN

<!-- markdownlint-disable MD029 MD032 -->

Status: In progress
Prepared: March 29, 2026
Owners: Portal, Identity, Scheduling, Billing, Compliance

## Goal

Expand the current portal from a public intake page plus staff-side invite management into a full tenant-configurable client portal with:

- self-service account creation and onboarding
- practice-customizable public portal branding and messaging
- configurable intake and default signup forms
- client self-service scheduling and profile updates
- client financial visibility, including standard billing or voluntary offering mode
- counselor directory and assigned-counselor visibility
- published client resources and mental health library content
- explicit PHI/PII, database, audit, and GDPR-style data-rights protections

This plan extends the implemented baseline in `PLANS/WORKSPACE-STUDIO-FORMS-PORTAL-WORKFLOW.md`.

## Implementation Progress

Completed in repo as of March 29, 2026:

- Phase 1 foundation:
  - tenant-configurable `portal_settings`
  - public `/portal` branding and messaging driven by tenant settings
  - `GET /v1/portal/public-config`
  - `GET/PATCH /v1/portal/settings`
  - Workspace Studio Portal settings editor
  - create-account, care-request, and scheduling-request public entry points
  - configurable `defaultSignupFormKeys` support for signup form defaults

- Phase 2 partial delivery:
  - richer public request intake capture for:
    - request type
    - preferred contact method
    - preferred contact window
  - staff review queue for public portal requests in Workspace Studio
  - request lifecycle management for:
    - `requested`
    - `reviewing`
    - `approved`
    - `declined`

- Phase 3 partial delivery:
  - authenticated portal shell on the main app `portal` surface
  - real portal-client sign-in via `/v1/auth/login` with dedicated `portal_session` handling
  - client portal dashboard with:
    - next appointment summary
    - pending forms/documents summary
    - balance or offering summary
    - assigned counselor card
    - published resource preview
  - encrypted `portal_client_profiles` storage for:
    - preferred name
    - contact email
    - contact phone
    - contact preferences
    - demographics
    - education
    - affiliations
  - `GET/PATCH /v1/portal/profile`
  - DB-backed `GET /v1/portal/overview` enrichment for:
    - upcoming appointments
    - assigned forms
    - resources
    - balances
    - assigned counselor
    - tenant portal financial mode
  - client portal appointment request composer and list
  - DB-backed `GET/POST/PATCH /v1/portal/appointment-requests`
  - Playwright admin-preview regression coverage for the authenticated portal shell
  - Playwright regression coverage for a real seeded portal-client login and self-service flow
  - portal account password hashing, lockout tracking, and dedicated portal session persistence
  - Workspace Studio portal-account creation now returns a one-time temporary password for secure invitation handoff
  - authenticated portal `Documents` tab with:
    - assigned form visibility
    - intake packet completion status
    - portal document read/sign-complete actions
    - secure client upload history and submission
  - authenticated portal `Data Rights` tab with:
    - self-service JSON export
    - policy-aware deletion requests
    - retention and legal-hold visibility
    - request history
  - dedicated portal credential management with:
    - authenticated client password change
    - public portal password-reset request
    - one-time reset-code completion
    - session revocation after password changes or resets
  - authenticated portal `Counselor` tab with:
    - assigned counselor card
    - optional counselor directory when enabled by practice settings
  - authenticated portal `Financials` tab with:
    - invoice or offering summary
    - invoice list
    - payment or offering history
  - authenticated portal `Resources` tab with:
    - client-facing resource library fed by portal-published content
  - Workspace Studio portal data-rights review queue with:
    - tenant-scoped deletion request visibility
    - fulfill, restrict, and deny actions
    - policy-aware portal-scope erasure with portal-access revocation

Still pending:

- onboarding wizard with account activation flow
- uploads and published document workflows beyond current dashboard/resource visibility
- richer counselor directory and counselor detail surfaces
- dedicated financial portal page beyond current invoice/payment summary implementation
- final agent-driven validation sequence from Phase 6

## Canonical Constraints

This work must follow:

- `PLANS/FULL-SURFACE-MONITORING.md`
- `PLANS/FULL-SECURITY-AND-AUDITING.md`

Non-negotiable constraints:

- portal users must remain isolated from internal chart and audit surfaces
- audit and telemetry remain separate systems
- no PHI, PII, names, emails, IDs, or free text in telemetry labels
- all portal actions must be tenant-scoped and ownership-validated
- client authentication must use hashed passwords, session revocation, lockout protection, and tenant-scoped portal sessions
- export and deletion workflows must be privileged, auditable, and policy-aware
- password reset and password change flows must revoke active portal sessions on success

## Product Experience Model

Treat the portal as three linked experiences.

1. Public practice portal
- practice-branded landing page
- sign in
- create account
- request care
- request scheduling
- view limited public counselor directory if enabled

2. New client onboarding
- account registration or invitation acceptance
- contact preferences and profile setup
- default intake forms and consents
- care request details and scheduling preferences

3. Authenticated client portal
- dashboard
- appointments and schedule requests
- forms, uploads, and document completion
- profile and preferences
- assigned counselor and optional directory
- financials or offerings
- resources and support library
- data-rights actions

## Business Requirements

### Public portal and account creation

1. The portal login surface must offer:
- sign in
- create account
- request care
- request scheduling

2. Practices must be able to choose one of these self-registration modes:
- invite only
- self-register with staff review
- self-register with immediate activation for approved workflows

3. Self-registration must allow the practice to configure:
- required fields
- optional fields
- default signup forms
- whether faith-integrated care questions appear
- whether counselor directory is visible before registration

### Practice customization

Practices must be able to configure:

- logo
- brand colors within accessible bounds
- public welcome message
- portal intro copy
- contact/help copy
- allowed self-service behaviors
- contact preference options clients may manage
- portal financial presentation mode
- visible resource categories
- visible counselor directory scope

### Client self-service

Authenticated clients must be able to:

- view upcoming and past appointments as permitted
- request appointment changes or new appointments
- upload intake/supporting documents
- complete assigned forms and consents
- update demographics, affiliations, education, and contact preferences
- see assigned counselor information
- browse published resources
- review balances, payments, due items, or voluntary offerings depending on tenant settings
- request a copy of their data
- request deletion or account closure
- change their portal password while authenticated
- request a one-time portal password reset from the sign-in surface

## Functional Modules

### Module 1: Public portal landing

Features:

- public branded landing page
- entry points for sign in, create account, request care, and request scheduling
- public counselor directory if enabled
- accessibility-first mobile and desktop layout

### Module 2: Registration and onboarding

Features:

- create portal account flow
- email verification and invitation acceptance path
- optional staff review queue
- onboarding wizard
- default form packet assignment
- default consent assignment
- contact preferences capture
- demographics, education, affiliations, and optional faith background fields

### Module 3: Client dashboard

Features:

- next appointment summary
- pending forms/documents
- outstanding tasks
- new messages
- balance or offering summary
- quick links to data-rights actions

### Module 3b: Portal credentials

Features:

- authenticated password change
- public reset-code request
- one-time reset-code completion
- session revocation after credential changes
- audit coverage for request, completion, and password-change actions

### Module 4: Scheduling

Features:

- appointment list/calendar
- request appointment changes
- request cancellation
- request new appointment
- limited self-scheduling where tenant enables it
- notification preferences for scheduling communication

### Module 5: Forms and uploads

Features:

- assigned forms list
- completion status
- upload supporting files
- append-only submitted form history
- explicit published-to-portal document visibility only

### Module 6: Profile and preferences

Features:

- demographic profile
- contact preferences
- affiliations
- education
- portal credentials/security settings
- communication consent and notification settings

### Module 7: Counselor and resources

Features:

- assigned counselor profile
- optional counselor directory
- counselor specialties, faith integration language, and availability summary
- portal resource library
- mental health education links
- practice-published devotional or faith resources when enabled

### Module 8: Financials or offerings

Features:

- standard billing mode:
  - balances
  - invoices
  - payments
  - due items
- voluntary offering mode:
  - contribution history
  - suggested offering language
  - no hard due-state language when disabled by practice

Financial mode must be tenant-configurable and presentation-safe without forking the underlying accounting model.

### Module 9: Data rights

Features:

- `Export My Data` action
- `Request Deletion` action
- request status tracking
- policy-aware responses when deletion cannot be fully executed because of legal hold, retention, fraud prevention, accounting, or clinical record obligations
- staff review queue for deletion requests
- fulfill, restrict, and deny actions with auditable reason codes
- portal-scope erasure/anonymization when deletion is approved

## Data Model Additions

### New or expanded entities

1. `portal_settings`
- one row per tenant
- branding, welcome copy, registration mode, feature flags, financial mode, visible directory/resource settings

2. `portal_contact_preferences`
- client-owned communication preferences
- email, sms, phone, portal-message preferences
- allowed contact windows and consent timestamps

3. `portal_signup_policies`
- normalized tenant policy for self-register, approval, required fields, and default workflows

4. `portal_default_form_rules`
- tenant-managed mapping of registration/onboarding events to forms and consents

5. `portal_profile_sections`
- structured extension storage for affiliations, education, demographics, and optional faith profile fields

6. `portal_data_rights_requests`
- export or deletion request type
- status
- requester identity
- legal-hold or retention resolution outcome
- completion metadata

7. Expand `portal_accounts`
- support statuses: `pending`, `invited`, `active`, `locked`, `closed`
- verification and acceptance metadata

8. Expand `portal_appointment_requests`
- add request subtype, requested change reason code, preferred windows, and reviewed-by metadata

9. Expand `portal_resources`
- explicit publication state
- audience scope
- category
- published-by metadata

### Schema rules

- every tenant-owned row includes `tenant_id`
- every client-owned portal row includes `client_id`
- sensitive text fields are encrypted at rest
- lookup fields use deterministic hashes where equality lookup is needed
- free-text retention must be minimized and policy-bound

## API Additions

### Public and onboarding

- `GET /v1/portal/public-config`
- `POST /v1/portal/register`
- `POST /v1/portal/request-care`
- `POST /v1/portal/request-scheduling`
- `POST /v1/portal/verify-email`
- `GET /v1/portal/public-counselors`

### Authenticated client portal

- `GET /v1/portal/dashboard`
- `GET /v1/portal/profile`
- `PATCH /v1/portal/profile`
- `GET /v1/portal/contact-preferences`
- `PATCH /v1/portal/contact-preferences`
- `GET /v1/portal/appointments`
- `POST /v1/portal/appointments/requests`
- `GET /v1/portal/forms`
- `POST /v1/portal/uploads`
- `GET /v1/portal/financials`
- `GET /v1/portal/counselor-directory`
- `GET /v1/portal/resources`

### Data rights

- `POST /v1/portal/data-rights/export`
- `POST /v1/portal/data-rights/delete`
- `GET /v1/portal/data-rights/requests`

### Practice administration

- `GET /v1/portal/settings`
- `PATCH /v1/portal/settings`
- `GET /v1/portal/signup-policies`
- `PATCH /v1/portal/signup-policies`
- `GET /v1/portal/default-form-rules`
- `PATCH /v1/portal/default-form-rules`

## UI Additions

### Public surfaces

- `/portal` public landing page
- create account flow
- request care flow
- request scheduling flow
- public counselor directory if enabled

### Authenticated portal surfaces

- portal dashboard
- schedule page
- forms/documents page
- uploads page
- profile/preferences page
- counselor page
- resources page
- financials page
- data-rights page

### Staff administration surfaces

Add Workspace Studio portal settings controls for:

- branding
- registration mode
- default forms
- contact preference rules
- counselor directory visibility
- financial mode
- resource publishing
- data-rights operational queue

## PHI / PII Safeguards

### Data minimization

- only collect public and onboarding data required for intake, communication, scheduling, compliance, or explicitly enabled faith-integrated workflows
- make optional profile sections tenant-configurable
- avoid duplicating client identity data into multiple portal tables

### Encryption and storage protection

- encrypt PHI/PII at rest for portal profile fields, messages, uploads metadata, contact channels, and sensitive request details
- use deterministic lookup hashes only when indexed equality lookup is necessary
- keep document/blob paths free of names, emails, and PHI
- protect downloads with short-lived authorization and ownership validation

### Logging, telemetry, and audit

- no PHI/PII in logs, telemetry, metrics labels, or error payloads
- audit all portal registration, login, profile changes, upload events, appointment requests, export requests, and deletion requests
- keep audit metadata bounded and enum-based

### Access controls

- portal clients can access only their own portal-scoped data
- staff access to portal records remains role-gated and tenant-scoped
- no client access to internal chart notes, audit, or staff-only documents
- explicit publish-to-portal flag required for any document or resource to appear in client view

## Database Security Requirements

1. Tenant and ownership enforcement
- every portal query must enforce both `tenant_id` and `client_id` ownership where applicable
- no route may trust caller-supplied tenant context without server validation
- cross-tenant reads and writes must be structurally impossible in query helpers

2. Sensitive-field handling
- maintain encrypted columns for sensitive portal account and profile fields
- add field-classification comments or schema docs for PHI, PII, operational, and public fields
- separate public directory fields from private counselor/staff records

3. Key management and rotation
- all encrypted portal fields must be compatible with existing key rotation guidance
- no plaintext sensitive fallback fields should remain after migration windows close

4. Deletion and retention posture
- deletion must be policy-driven, auditable, and idempotent
- when hard delete is not permitted, support privacy-preserving closure or anonymization where legally appropriate
- accounting, legal hold, and clinical retention exceptions must be recorded on the request

5. Query safety
- parameterized queries only
- bounded pagination and export windows
- no unbounded bulk export endpoints for clients
- uploads and downloads must use explicit ownership and status checks

## GDPR-Style Data Rights Workflow

This implementation must provide a visible client-facing control for data rights without violating HIPAA, accounting, or retention obligations.

### Client-facing controls

Add a `My Data` or `Privacy & Data Rights` section in the authenticated portal with:

- `Export My Data`
- `Request Deletion`
- status history for submitted requests

### Export behavior

- export only the requesting client’s permitted portal and client-facing data
- generate a bounded machine-readable export package plus a human-readable summary where feasible
- require recent authentication or step-up confirmation before export generation
- record export request, approval path, generation, and delivery in audit

### Deletion behavior

- deletion is a request workflow, not an immediate blind purge
- the system must evaluate:
  - legal hold
  - record retention rules
  - accounting obligations
  - clinical record obligations
  - security/fraud investigation holds
- if full deletion is permitted, execute tenant- and client-scoped deletion/anonymization plan and audit the outcome
- if deletion is denied or only partially allowed, return a clear status and bounded reason code such as `legal_hold`, `retention_required`, or `billing_record_retained`

### Operational handling

- practice admins and platform workflows must have a review queue for data-rights requests
- cross-functional decisions must remain auditable
- client UI must never expose internal legal commentary or free-form staff notes

## Monitoring Requirements

Add these surface IDs to the shared surface registry and monitoring summary:

- `portal.public_landing`
- `portal.signup`
- `portal.onboarding`
- `portal.dashboard`
- `portal.schedule`
- `portal.forms`
- `portal.uploads`
- `portal.profile`
- `portal.counselor`
- `portal.resources`
- `portal.financials`
- `portal.data_rights`

Minimum metrics per visible portal surface:

- surface view
- load duration
- interaction duration
- action success/failure
- fetch error count
- empty-state exposure
- local telemetry availability
- OTEL export availability when configured

## Security Validation Requirements

Must validate:

- portal account creation respects tenant registration policy
- client cannot access another client’s records
- public counselor directory exposes only explicitly published fields
- no PHI/PII leakage in telemetry, logs, URLs, or browser storage
- data-rights export returns only authorized data
- deletion workflow respects retention and legal holds
- upload and download paths are ownership-validated
- all denied access paths emit canonical audit result values

## Delivery Phases

### Phase 1: Public portal and tenant configuration

- `portal_settings`
- branded public portal
- create account option
- request care and request scheduling flows
- Workspace Studio portal settings UI

### Phase 2: Registration, onboarding, and default forms

- self-register or invite acceptance
- onboarding wizard
- default signup forms and consents
- contact preferences and profile bootstrap

### Phase 3: Authenticated client portal core

- dashboard
- appointment self-service request flow
- profile and preferences
- assigned counselor summary card
- admin preview path using selected client context
- targeted Playwright coverage

Remaining in this phase:

- client-auth sign-in path for actual seeded portal users
- uploads and document-completion UI
- dedicated forms workspace beyond dashboard summaries

### Phase 4: Financials, counselor directory, and resources

- financial mode support
- optional directory
- resource library
- richer counselor presentation

### Phase 5: Data rights, compliance hardening, and regression coverage

- export and deletion request workflows
- retention-aware deletion handling
- audit completion
- monitoring completion
- security and E2E regression suites

### Phase 6: Agent-driven final validation

- run `security-compliance-guardian.agent.md` against the completed portal scope
- run `manager-counselor-client-triage.agent.md` to validate the real multi-role daily workflows
- run `web-repair-engineer.agent.md` as the final stability and repair sweep
- document findings, fixes, residual risks, and rerun status before release signoff

## Acceptance Criteria

1. Public portal allows sign in, create account, request care, and request scheduling.
2. Practice can customize portal branding, welcome copy, self-service rules, and default signup forms.
3. New clients can complete onboarding and receive configured default forms.
4. Authenticated clients can view appointments, request changes, upload information, and manage profile data.
5. Authenticated clients can view assigned counselor details and published resources.
6. Financial view supports either standard billing presentation or voluntary offering presentation per tenant setting.
7. Portal surfaces are fully monitored under the canonical monitoring baseline.
8. Portal actions are fully tenant-scoped, auditable, and PHI/PII-safe.
9. Client-facing `Export My Data` and `Request Deletion` controls exist and are policy-aware.
10. Export and deletion workflows honor retention, legal hold, accounting, and clinical record constraints with auditable outcomes.
11. Final validation has been completed by the security agent, the manager/counselor/client triage agent, and the engineering repair agent, with documented outcomes.

## Recommended Next Implementation Tickets

1. Create `portal_settings` schema and query layer.
2. Build `/v1/portal/public-config` and branded `/portal` rendering path.
3. Add `create account` and onboarding wizard flow.
4. Add Workspace Studio portal settings editor.
5. Build authenticated client portal shell and route structure.
6. Implement client profile, preferences, and uploads.
7. Implement financial mode abstraction for billing vs voluntary offerings.
8. Implement `portal_data_rights_requests` and review queue.
9. Add portal surface telemetry and monitoring summary coverage.
10. Add AppSec and E2E regression coverage for portal isolation, export, and deletion workflows.
11. Run the final agent validation sequence and capture release-readiness notes.
