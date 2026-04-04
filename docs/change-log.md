# Change Log

<!-- markdownlint-disable MD024 -->

## April 4, 2026 — Encrypted Buffer Read Fix

### fix(api): accept Buffer-backed ciphertext during decrypt

**Date:** April 4, 2026
**Affected area:** `apps/api/src/lib/encrypt.js`

Recurring series creation could appear to fail even after the insert succeeded. The actual crash happened on the refresh read immediately afterward: older `appointment_series` rows were returning encrypted name fields from MySQL as `Buffer` objects, but the shared `decrypt()` helper only handled strings and crashed on `stored.split(...)`.

The shared decrypt helper now normalizes `Buffer` values to UTF-8 strings before parsing the encrypted payload format. This fixes recurring-series refresh reads and hardens any other API read path that encounters buffer-backed encrypted columns.

---

## April 4, 2026 — Dashboard Faithful Workflows Navigation

### fix(dashboard): make the Faithful Workflows metric card open the workflow workspace

**Date:** April 4, 2026
**Affected area:** `apps/web/src/components/Metrics.jsx`, `apps/web/src/App.jsx`

The dashboard already let staff drill from the session and appointment metric cards into deeper workflow views, but the `Faithful Workflows` panel was still a static summary tile. That made the panel look interactive without actually helping the user move into the workflow.

The Faithful Workflows metric card now uses the same clickable metric treatment as the other dashboard cards and routes directly into the Faithful Workflows page through the existing `faith` workspace view.

---

## April 4, 2026 — Runtime Label Catalog Sync

### fix(i18n): align English runtime labels with current workspace names

**Date:** April 4, 2026
**Affected area:** `apps/api/data/i18n/en.json`

The shared frontend label catalog had already been updated to use `Dashboard`, `Client Scheduling`, `Documents`, and `Client Portal`, but the API-backed English locale file was still overriding some of those values with older strings like `Operations Dashboard` and `Portal`.

The English runtime catalog now matches the active workspace naming so the side menu and top bar render the same labels whether they come from base frontend messages or the API locale payload.

---

## April 4, 2026 — Navigation Label Cleanup

### fix(nav): simplify top-level workspace labels

**Date:** April 4, 2026
**Affected area:** `packages/i18n/src/index.js`

Staff-facing workspace names were still carrying heavier operational wording than necessary in the main navigation and top bar. The underlying surfaces were correct, but labels like `Operations Dashboard`, `Scheduling Workspace`, and `Documents Workspace` made the shell feel more technical than it needed to.

The shared label catalog now uses:

- `Dashboard` instead of `Operations Dashboard`
- `Client Scheduling` instead of `Scheduling Workspace`
- `Documents` instead of `Documents Workspace`
- `Client Portal` in the side navigation instead of `Portal`

This change only updates user-facing copy. Surface IDs, routes, telemetry, and monitoring mappings remain unchanged.

---

## April 4, 2026 — Clinical Chart Experience Refresh

### feat(chart): add summary visuals and functional graphics to Clinical Chart

**Date:** April 4, 2026
**Affected area:** `apps/web/src/components/ClinicalChart/*`

The Clinical Chart surface was structurally complete but visually flat. It opened as a title, client picker, and raw tab stack, which made the page feel colder and less informative than the rest of the application.

The chart now opens with a richer summary layer and functional visual cues:

- new chart summary header with session rhythm, note readiness, treatment-plan health, and latest assessment signal
- session-status timeline in Session Notes so counselors can see draft, signed, due, cancelled, and upcoming sessions at a glance
- mini trend graphics and delta indicators in Progress for scored assessments
- treatment-plan overview cards for plan status, goal coverage, and review rhythm
- stronger tab-shell treatment so the page feels like a distinct clinical workspace rather than a plain form stack

The change keeps the existing chart surfaces and telemetry IDs intact, so no surface-registry update was required. Documentation was updated in `README.md` and `apps/web/README.md`.

## April 4, 2026 — Faithful Workflow Count Sync

### fix(workflows): keep Faithful Workflows banner counts aligned with dashboard metrics

**Date:** April 4, 2026
**Affected area:** `apps/web/src/App.jsx`, `apps/web/src/components/FaithWorkflows/FaithWorkflowsPage.jsx`

The dashboard and Faithful Workflows page had drifted apart again. The dashboard was rendering the canonical `faithfulWorkflowCounts` values from the operations summary, while the Faithful Workflows banner was recomputing its own counts from local rank entries. That could produce conflicting totals for the same counselor session.

Faithful Workflows now consumes the same shared operations-summary count object that the dashboard uses. The page keeps its local urgency rollup only as a fallback when the shared summary is unavailable, so both surfaces now report the same critical, moderate, and routine totals under normal operation.

The left-panel client roster now also applies the same operational urgency signals used by the shared summary. Clients with critical note gaps or high-touchpoint-without-follow-up conditions are visibly elevated in the list, so a banner showing a critical client now corresponds to an actual critical row in the page.

Documentation was updated in `README.md` and `apps/web/README.md` to record the shared-count and shared-urgency behavior.

---

## April 4, 2026 — About Page Refresh

### feat(about): reposition the About page with stronger product impact

**Date:** April 4, 2026
**Affected area:** `apps/web/public/about.html`

The standalone About page was visually polished but still read like an older operations-console brochure. It leaned on soft indigo styling, generic platform copy, and a product posture that undersold the counselor-first direction of the application.

The page now uses a warmer, more deliberate visual system and reframes the product around the actual work of counseling:

- stronger hero hierarchy with a clearer product point of view
- counselor-first messaging instead of generic admin-console language
- sharper articulation of the platform's purpose, workflow spine, and trust posture
- platform-depth section that keeps monitoring and API documentation links visible without letting them dominate the page
- preserved standalone telemetry coverage for the existing `about` surface

Documentation was also updated in the root `README.md` and `apps/web/README.md` so the checked-in public surface is described consistently with the current product direction.

### fix(about): align refreshed About page with shared app palette

**Date:** April 4, 2026
**Affected area:** `apps/web/public/about.html`

The first refresh improved the page structure and message, but its warmer standalone palette drifted from the light indigo visual system used across the main workspace, monitoring, and operations pages.

The About page now keeps the stronger content and hierarchy while realigning its background, accents, cards, CTAs, and highlight treatments to the shared app palette so it feels like the same product family rather than a separate microsite.

---

## April 4, 2026 — Telemetry Fix

### fix(telemetry): correct emptyState signal for implemented Workspace Studio tabs

**Date:** April 4, 2026
**Affected area:** `apps/web/src/components/WorkspaceStudio/WorkspaceStudioPage.jsx`

`useSurfaceTelemetry` was reporting `emptyState: 'placeholder'` for all non-portal Workspace Studio tabs. Now that Practice, Locations, Staff, Lifecycle, Appointments, Documents, and Offerings are fully implemented, only the two remaining placeholder tabs (Chart, Clients) report `emptyState: 'placeholder'`. All implemented tabs report `emptyState: null`, correctly signalling active surfaces to the monitoring layer.

The five new studio surface IDs (`studio.practice`, `studio.locations`, `studio.staff`, `studio.lifecycle`, `studio.appointments`) were already registered in `packages/telemetry/src/surfaces.js`; no registry change was needed.

---

## v5.7.0 — April 4, 2026 — Workspace Studio Full-Tab Activation

### feat: activate all Workspace Studio placeholder tabs

**Date:** April 4, 2026
**Affected area:** Workspace Studio — Practice, Locations, Staff, Lifecycle, Appointments tabs; `App.jsx`; `ClientPortalPage.jsx`

All five previously-placeholder Workspace Studio tabs are now fully functional:

- **Practice tab** — edit the practice profile (name, type, timezone, faith tradition, contact email/phone) with live dirty-state tracking and PATCH save via `/api/v1/practices/:id`.
- **Locations tab** — full CRUD for scheduling locations: add via modal, inline edit, delete via icon action. Fields: name (required), address, capacity, telehealth/remote-enabled flag (rendered as Telehealth badge). Uses `/api/v1/locations`.
- **Staff tab** — read-only staff roster loaded from `/api/v1/staff`. Counselors shown in 2-column card grid with avatar, role badge, license type/number, supervision status, and bio. Admins shown in flat list with last-login timestamp and account-locked flag. "Manage Staff Accounts →" button navigates to the Staff Management page.
- **Lifecycle tab** — caseload management board. Status summary cards (Active, Waitlist, Inactive, Discharged) are clickable filters with count and progress bar. Referral sources bar chart (top 8). Per-client rows allow status transitions via dropdown; discharge triggers a modal capturing reason (6 options) and free-text notes. Uses `PATCH /api/v1/clients/:id/lifecycle`.
- **Appointments tab** — service code configuration (CPT/billing codes). List with active/inactive filter pills. Add via modal, inline edit, activate/deactivate toggle. Fields: code, name, category (6 types), default duration (15–240 min). Uses `/api/v1/billing/service-codes`.

Additional wiring in the same commit:

- **Assign Forms button** — ClientPortalPage "Assigned Forms and Intake Packets" section now has an "+ Assign Forms" button that navigates directly to Workspace Studio Documents tab with the client pre-selected.
- **View Client on approved requests** — approved portal requests with a linked client now show a "View Client" button in the Workspace Studio Portal tab.
- `onOpenCounselorMaintenance` prop threaded from `App.jsx` through `WorkspaceStudioPage` to `StaffTab`.

**Files added:**

- `apps/web/src/components/WorkspaceStudio/tabs/PracticeTab.jsx`
- `apps/web/src/components/WorkspaceStudio/tabs/LocationsTab.jsx`
- `apps/web/src/components/WorkspaceStudio/tabs/StaffTab.jsx`
- `apps/web/src/components/WorkspaceStudio/tabs/LifecycleTab.jsx`
- `apps/web/src/components/WorkspaceStudio/tabs/AppointmentsTab.jsx`

**Files modified:**

- `apps/web/src/components/WorkspaceStudio/WorkspaceStudioPage.jsx` — imports and wires all 5 new tabs; adds `onOpenCounselorMaintenance` prop
- `apps/web/src/components/Portal/ClientPortalPage.jsx` — adds `onAssignForms` prop and "+ Assign Forms" button
- `apps/web/src/components/WorkspaceStudio/tabs/DocumentsStudioTab.jsx` — accepts `initialClientId` prop with effect-based handoff
- `apps/web/src/App.jsx` — `handleOpenAssignForms` callback, `workspaceStudioDocumentsClientId` state, `onOpenCounselorMaintenance` wired

---

### feat: auto-assign default signup forms when creating client from portal request

**Date:** April 4, 2026
**Affected area:** `apps/api/src/index.js` — `handlePortalPublicRequestConversion`

When a practice admin presses "Create Client" on an approved portal care request, the platform now automatically assigns any forms configured in the practice's Default Signup Forms settings to the newly created client. Assignment uses `assignmentType: 'account_signup'` consistent with other portal signup flows. Already-converted requests (status `already_converted`) are skipped to avoid duplicate assignments.

### fix: portal navigation not switching when client detail is open

**Date:** April 3, 2026
**Affected area:** `apps/web/src/App.jsx`, portal navigation

Fixed: clicking "View / Assign Documents" from Client Detail had no visible effect. Root cause — `handleOpenPortal` set `currentView = 'portal'` but did not clear `selectedClientRequest`, so the render chain kept showing `ClientDetailPage` (which takes priority) instead of switching to the portal. Added `setSelectedClientRequest(null)` to `handleOpenPortal`. Rebuilt public bundle.

### fix: refresh public web bundle so client detail documents action is visible

**Date:** April 3, 2026
**Affected area:** `apps/web/public/index.html`, `apps/web/public/assets/*`

Rebuilt and refreshed checked-in public web artifacts so the Client Detail header action "View / Assign Documents" appears in environments serving the static public bundle.

### chore: include full pending web public assets bundle

**Date:** April 3, 2026
**Affected area:** `apps/web/public/index.html`, `apps/web/public/assets/*`

Included all currently pending generated web public bundle artifacts so checked-in deployable/public assets remain in sync with recently shipped UI workflow updates.

### feat: client detail direct documents action

**Date:** April 3, 2026
**Affected area:** Client Detail navigation, Portal Documents workflow

Added a new Client Detail header action: "View / Assign Documents". Selecting this action opens the Client Portal surface directly on the Documents tab and preselects the current client.

**What changed:**

- `apps/web/src/components/ClientDetail/ClientDetailHeader.jsx` — added the new header button.
- `apps/web/src/components/ClientDetail/ClientDetailPage.jsx` — forwards a client-scoped documents action callback.
- `apps/web/src/App.jsx` — introduced portal handoff state and `handleOpenPortal` to open a specific portal tab with a selected client.
- `apps/web/src/components/Portal/ClientPortalPage.jsx` — added `initialClientId` and `initialTab` props with effect-based handoff handling.

### fix: date pickers calendar close and manual entry across all forms

**Date:** April 3, 2026
**Affected area:** All forms with `DateInput` — FormRunner, DiagnosesTab, DemographicsTab, LegalAdminTab, InsuranceTab, EmploymentTab, CertificationsTab, LicensesTab

Clicking a day in a date picker calendar did not close the popover and did not save the value on several forms. Manual entry of dates in any format other than strict ISO (`YYYY-MM-DD`) did not work on any form.

**Root cause (calendar won't close):** Mantine v8 `DateInput` passes a `YYYY-MM-DD` string (not a `Date` object) to `onChange`. Multiple forms called `d.toISOString()` on that string, throwing `TypeError: d.toISOString is not a function`. This exception propagated before `setDropdownOpened(false)` could execute, so the calendar stayed open and the value was never stored.

**Root cause (manual entry):** All `DateInput` components used `valueFormat="YYYY-MM-DD"`, requiring strict ISO input. Users could not type natural dates like `01/15/2000`.

**Fix:** Updated all `dateToStr` helpers to safely handle both strings and Date objects. Removed all `strToDate()` wrappers from state initialization and `value=` props — Mantine v8 `DateInput` accepts `YYYY-MM-DD` strings natively. Removed `dateToStr()` wrappers from `onChange` handlers where Mantine already provides the string. Changed `valueFormat` to `"MM/DD/YYYY"` and added matching `placeholder="MM/DD/YYYY"` on all eight files: `FormRunner.jsx`, `DiagnosesTab.jsx`, `DemographicsTab.jsx`, `LegalAdminTab.jsx`, `InsuranceTab.jsx`, `EmploymentTab.jsx`, `CertificationsTab.jsx`, `LicensesTab.jsx`.

## v5.6.0 — April 3, 2026 — Portal Client Conversion and Plan Hygiene

### fix: counselor high-touchpoint toggle returning 403

**Date:** April 3, 2026
**Affected area:** Client access control, high-touchpoint flag toggle

Counselors received a 403 "Access to this resource is not permitted" when attempting to toggle the high-touchpoint flag on any client, even clients assigned to them. The UI displayed "Failed to update high-touchpoint flag. Please try again."

**Root cause:** `enforceAssignedClientAccess` blocked counselors whenever `client.primaryCounselorId` was `null`. All seed clients in the DB had `primary_counselor_id = NULL` because the migration INSERT did not include that column. As a result, every counselor was denied on every client.

**What changed:**

- `apps/api/src/index.js` — `enforceAssignedClientAccess` now allows counselor access when: (a) the client has no assigned primary counselor (unassigned clients are accessible to any counselor in the practice), or (b) the counselor is the assigned primary counselor for that client. Previously it only allowed case (b) and only when the scope ID resolved.
- `apps/api/src/db/migrate.js` — seed INSERT for `c-001` (Sarah Kim) now includes `primary_counselor_id = 'staff-counselor-mercy'`. The `ensureDevPortalClient` idempotent path also sets `primary_counselor_id` via `COALESCE` so it only backfills when the column is null.

### fix: high-touchpoint PATCH returning 415 Unsupported Media Type for browser requests

**Date:** April 3, 2026
**Affected area:** Web proxy body forwarding, high-touchpoint flag toggle

Admin users and any user whose toggle attempt went through the browser received "Failed to update high-touchpoint flag. Please try again." The API logged HTTP 415 "Unsupported media type. Use application/json." for every browser-originated PATCH.

**Root cause:** `readRequestBody` in `apps/web/server.js` accumulated the request body into a JavaScript `string`. When the proxy's `fetch` call forwarded that string to the upstream API with `body: <string>`, Node.js's native `fetch` (undici) set the internal `Content-Type` to `text/plain;charset=UTF-8` — overriding the explicitly forwarded `content-type: application/json` header. The API's `readJsonBody` detected the non-JSON content-type and rejected with 415.

**What changed:**

- `apps/web/server.js` — `readRequestBody` now collects raw `Buffer` chunks and returns `Buffer.concat(chunks)`. A `Buffer` / `Uint8Array` body passed to `fetch` carries no implicit Content-Type, so the explicitly forwarded `content-type: application/json` header is preserved end-to-end.

### fix: duplicate Content-Type header causing 415 for all browser POST/PATCH mutations

**Date:** April 3, 2026
**Affected area:** Frontend headers, all browser-initiated POST/PATCH mutations

Every browser-originated mutation (high-touchpoint toggle, session notes, internal notes, offerings) returned HTTP 415, while the same requests via curl succeeded. The UI showed "Failed to update high-touchpoint flag. Please try again." and similar errors on clinical chart saves.

**Root cause:** `csrfHeaders()` (in `apps/web/src/lib/csrf.js`) already returns `'content-type': 'application/json'` (lowercase). Nine callsites across five components also added `'Content-Type': 'application/json'` (mixed case) to the same headers object. JavaScript object keys are case-sensitive, so both keys coexisted in the plain object. When passed to the browser's native `fetch`, the `Headers` constructor normalizes both to lowercase `content-type` and joins the values with a comma: `"application/json, application/json"`. The proxy forwarded this verbatim. The API's `isJsonMediaType` split only on `;`, leaving the full string `"application/json, application/json"` which is not equal to `"application/json"` → 415.

**What changed:**

- `apps/web/src/components/ClientsPage.jsx` — removed redundant `'Content-Type': 'application/json'` from `handleToggleHighTouchpoint`.
- `apps/web/src/components/WorkspaceStudio/tabs/OfferingsTab.jsx` — same fix.
- `apps/web/src/components/Offerings/OfferingsPage.jsx` — same fix.
- `apps/web/src/components/ClinicalChart/tabs/TreatmentPlanTab.jsx` — same fix.
- `apps/web/src/components/ClinicalChart/tabs/SessionNotesTab.jsx` — same fix (3 callsites).
- `apps/web/src/components/ClinicalChart/tabs/InternalNotesTab.jsx` — same fix (2 callsites).
- `apps/api/src/lib/http.js` — `isJsonMediaType` now splits the content-type on `,` before `;` to evaluate only the first value, making the API resilient to browser duplicate-header joining.

### fix: restart stale local services and normalize portal conversion routes

Fixes a local startup failure mode where `pnpm start` could keep reusing an older repo-managed API or web process and continue serving stale behavior after code changes. This showed up in Workspace Studio Portal as approved care requests displaying **"Create Client"** while the click hit an older API process and returned a generic `Not found`.

**What changed:**

- `ops/start-all.mjs`
  - now detects repo-managed listeners already running on ports `3001` and `3002`
  - terminates those repo-owned API/web processes before starting fresh ones
  - preserves the old reuse behavior only for non-repo external listeners
- `apps/api/src/index.js`
  - added normalized route templates for `/v1/portal/public-requests` and `/v1/portal/public-requests/convert`
  - keeps route telemetry, RBAC handling, and request classification aligned with the actual mounted portal handlers
- `README.md`
  - documents that `pnpm start` now refreshes repo-managed local services instead of silently reusing stale ones

### fix: approved care requests can create client records from Workspace Studio

Closes the remaining approval dead-end for non-signup portal requests. Approved `care_request` items in Workspace Studio Portal now expose a direct `Create Client` action instead of stopping at an approved status with no conversion path.

**What changed:**

- new admin-only `POST /v1/portal/public-requests/convert` action converts approved `care_request` items into client records
- conversion creates the client record, writes `converted_client_id` back to the portal request, creates a lifecycle record for care intake tracking, and seeds the portal contact profile from submitted request details
- Workspace Studio Portal now shows **"Create Client"** for approved care requests without a linked client and switches to **"View Client"** after conversion
- `studio.portal` action telemetry now records success/failure for care-request client conversion without sending client-identifying data

**Files changed:**

| File | Change |
| --- | --- |
| `apps/api/src/index.js` | Added care-request conversion endpoint, shared portal-request client creation helper, lifecycle/profile linking, and audited mutation path |
| `apps/api/test/portal-public-request-conversion.test.mjs` | Added route coverage for approve → convert flow, invalid-state rejection, and admin gating |
| `apps/web/src/components/WorkspaceStudio/tabs/PortalTab.jsx` | Added `Create Client` action and `studio.portal` conversion telemetry |
| `apps/web/README.md` | Documented approved care-request conversion behavior |
| `README.md` | Updated recent release summary for the expanded portal conversion flow |

### release: portal request → client conversion flow (v5.6.0)

Closes the approval dead-end in the public portal request workflow. Previously, approving an `account_signup` request created a client and portal account but provided no way to navigate back to that client. The approved request was a dead end.

**What changed:**

- `portal_registration_requests` now stores `converted_client_id` (new column, added via zero-downtime column migration)
- `activatePortalSignupRequest` writes the new client ID back to the registration request on activation
- Public requests list now returns `convertedClientId` in every API response
- **"View Client" button** appears on every approved `account_signup` request that has a linked client — navigates directly to the client record in the Clients workspace
- Prop threading: `onViewClient` → `PortalTab` → `WorkspaceStudioPage` → `App.jsx`

**Files changed:**

| File | Change |
| --- | --- |
| `apps/api/src/db/migrate.js` | Column migration: `portal_registration_requests.converted_client_id VARCHAR(64) NULL` |
| `apps/api/src/db/queries/formWorkflows.js` | `rowToPortalRegistrationRequest` maps new column; `updatePortalRegistrationRequest` accepts `convertedClientId` |
| `apps/api/src/index.js` | `activatePortalSignupRequest` writes `convertedClientId` on activation |
| `apps/web/src/components/WorkspaceStudio/tabs/PortalTab.jsx` | `PublicRequestsSection` + `PortalTab` accept `onViewClient`; "View Client" button wired |
| `apps/web/src/components/WorkspaceStudio/WorkspaceStudioPage.jsx` | `onViewClient` prop threaded through to `PortalTab` |
| `apps/web/src/App.jsx` | `onViewClient={handleOpenClient}` passed to `WorkspaceStudioPage` |

### chore: plan evaluation pass and PLAN-TRACKER

- Evaluated all 20 plans in `PLANS/` against shipped code
- Marked 17 plans ✅ COMPLETE with verification evidence and dates
- Added `PLANS/PLAN-TRACKER.md` as a single-view index of plan status
- Executed remaining `PROJECT-CLEANUP` items: removed `__pycache__`, stale `.github/agents/translation_guardian/` copy, and `test-results/` artifacts

### chore: database reset and backup tooling

- Full DB backup workflow validated: `docker exec faith-mysql mysqldump` → `backups/`
- Database wiped to clean state: all client, clinical, portal, financial, and session data removed; staff accounts and form catalog preserved

### fix: disable Faithful Workflows demo fallback by default

Faithful Workflows no longer injects hardcoded mock clients after a real database reset. The page now defaults to real client data only, while keeping an explicit opt-in demo switch for later use.

- `apps/web/src/components/FaithWorkflows/FaithWorkflowsPage.jsx`
  - demo/mock clients now load only when `VITE_ENABLE_FAITH_WORKFLOWS_DEMO=true` or `localStorage['faith_workflows.demo_mode']='true'`
  - mock-client preload cache now runs only in explicit demo mode
  - mock-client API fallback is disabled when demo mode is off
- `README.md`, `apps/web/README.md`, `.env.example`
  - documented the new default-off behavior and the supported re-enable options

---

## April 2, 2026

### fix: intake preview form key mismatch causing "Preview not currently active" for all real clients

The `INTAKE_FORM_KEYS` constant in `buildIntakePreview` used PascalCase JS export names (`'LongIntakeForm'`, `'ShortIntakeForm'`) instead of the snake_case `form_key` values actually stored in the `form_submissions` table (`'long_intake'`, `'short_intake'`). This caused `hasIntakeFormSubmission` to always evaluate to `false` for any client who submitted forms through the live UI, blocking the preview for every real client. The `submittedAt` fallback in the return object had the same wrong keys. The `packetStatus` field returned `null` (displayed as "Not on file") for clients without a formal intake packet row even when they had completed form submissions.

**Changes:**

- `INTAKE_FORM_KEYS` now includes all four variants (`'long_intake'`, `'short_intake'`, `'LongIntakeForm'`, `'ShortIntakeForm'`) to cover both real UI submissions and legacy seed data
- `submittedAt` fallback chain now tries snake_case keys first, then PascalCase, so the submission timestamp is returned correctly for all clients
- `packetStatus` now synthesizes `'submitted'` from form submissions when no formal `intake_packets` row exists, so clients who completed forms directly see the correct status

Affected files: `apps/api/src/lib/intake-preview.js`

---

### fix: remove held session constraint from intake preview eligibility

Removed the `heldSessions.length === 0` gate from `buildIntakePreview` so that clients with any prior held or started session can now receive an intake preview once their intake paperwork is on file. Also removed the now-unused `isHeldSession()` helper function and its orphaned `heldSessionCount` reference from the return object, which was causing a `ReferenceError` at runtime.

- `apps/api/src/lib/intake-preview.js` — removed `heldSessions` variable, `isHeldSession()` function, eligibility compound condition, held-session reason message, and the stale `heldSessionCount` field in the sessions return object
- `AGENTS.md` — added commit documentation requirements: every commit must update `README.md` and `docs/change-log.md`; bug fixes use `### fix:` entries; major revisions require `### release:` entries and a release summary file in `docs/`

---

## Maintenance — April 2, 2026 — Login Copy and Dashboard Bug Fixes

### fix(auth): faith-centered login welcome messaging restored

The welcome copy on the login page showed generic workspace account text because the faith-centered messaging commit existed only on a feature branch that was never merged to main.

- `packages/i18n/src/index.js` — `auth.welcomeBack` and `auth.workspaceIntro` restored to faith-centered values ("Caring for the whole person")
- `apps/api/data/i18n/en.json` — English locale catalog updated with matching values
- `apps/api/data/i18n/es.json` — Spanish locale catalog updated (`auth.welcomeBack`: "Cuidando a la persona integral")
- Web bundle rebuilt and committed

### fix(dashboard): portal request backlog count aligned with Practice Operations

The operations dashboard alerted "68 portal requests waiting in backlog" while the Practice Operations tile showed 0. Root cause: two separate counters used incompatible logic.

- The alert used `portalRequestItems.length` — all requests ever created regardless of status
- `pendingPortalRequests` filtered for `status === 'pending'`, which does not exist in the portal request status vocabulary (`requested`, `reviewing`, `approved`, `declined`, `scheduled`) — always returning 0

Fix applied to `apps/api/src/index.js`:

- `portalRequestItems` now filtered to open/actionable statuses only (`requested`, `reviewing`) before the sort
- Both `pendingPortalRequests` and `clientsBox.portalRequests.total` now derive from the same filtered set
- Alert and Practice Operations tile now report the same number and only count genuine open requests

---

## Unreleased — Operations Dashboard Upgrade

**Completed:** April 2, 2026

### Summary

Upgrades the staff-facing Operations Dashboard from placeholder cards into a live daily operations summary. All four cards are backed by a fully upgraded `GET /v1/operations/summary` endpoint with real-time counselor workload, compliance signals, portal request tracking, and configurable operational alerts with 7-day trend context.

**Full summary:** `docs/OPERATIONS-DASHBOARD-UPGRADE-SUMMARY.md`

### What changed

**Backend — `apps/api/src/index.js`**

- `todaySchedule`: total appointments, counselors with entries, 1-hour availability gaps, per-counselor workload rows
- `priorityQueue`: high-touchpoint client count with explanatory copy
- `complianceWatch`: note-gap clients at 1 day / 3 days / 1 week; outstanding document and form assignments
- `clientsBox`: total clients, clients without scheduled appointment, portal request totals with status buckets separated by request type
- Availability calculation: declared templates → same-day overrides → fallback `09:00–12:00` / `13:00–17:00` workday
- Operational alerts (env-configured thresholds): high-touchpoint clients unscheduled, note-gap threshold crossings, no remaining counselor capacity, portal request backlog
- 7-day trend payloads: counselor utilization, documentation backlog, portal request flow, unscheduled-client backlog
- `high_touchpoint` flag added to `clients` table and all create/read/update payloads

**Frontend — `apps/web/src/components/WorkspaceGrid.jsx` and `apps/web/src/App.jsx`**

- All four dashboard cards wired to live API data; loading, error, and empty states handled
- Drill-down modals for: unscheduled clients, portal request backlog, outstanding document/form assignments
- Alert strip with threshold-aware severity badges and action routing (calendar or portal queue)
- Compact 7-day trend bars (utilization, compliance, portal flow, unscheduled backlog)
- Dashboard refreshes on: staff boot, client mutations, scheduling mutations, timed interval while dashboard is visible

---

## Unreleased — Intake Preview Operational Alerts and Counselor Workspace Visibility

### Summary

Adds intake preview alerts to the operations dashboard and surfaces intake-preview clients in counselor workspaces, so counselors can identify clients who have completed intake materials but have not yet had a held session.

### What changed

- `apps/api/src/index.js`
  - `buildOperationsSummary` surfaces `intakePreviewItems` — clients who completed intake materials with no held sessions
  - Operational alert fires when `intakePreviewItems.length >= thresholds.intakePreviews`
  - Alert ID: `intake_previews_available` with severity `info`
- `apps/web/src/components/WorkspaceGrid.jsx`
  - Clients card shows intake previews total with drill-down into the specific client list
  - Counselor-scoped workspace surfaces intake-preview flag for each counselor's own clients

---

## Unreleased — Local Startup Reliability and DB Preflight

### Summary

Makes `pnpm start` the permanent and reliable local startup path by enforcing environment and database preflight before the application starts.

### Changed

- `ops/start-all.mjs`
  - added `ensureDatabase()` preflight when `DB_NAME` is configured
  - verifies Docker daemon availability and attempts to launch Docker Desktop when needed
  - ensures MySQL container is running via `docker compose up -d mysql`
  - waits for MySQL health before build, migration, and service startup
- `README.md`
  - documents `pnpm start` as the canonical startup command
  - documents that `node start-servers.js` is not the preferred path for normal development

### Operational impact

- reduces startup failures where API booted without DB env loaded
- prevents false "DB disconnected" states caused by starting with legacy commands
- gives humans and AI agents one consistent startup contract

## v5.5.2 — Faithful Workflows: Phase 6 — Visual Impact Upgrade (3 Canvas Views)

**Date:** 2026-04-01
**Type:** Minor — new UI views, no functional or data changes

### Summary

Adds two new parallel canvas views to the Faithful Workflows page (Radial Hub and Priority Matrix), selectable via a floating cycle button. The original Classic List view is fully preserved. Zero changes to the rules engine, recommendation logic, data fetching, or API.

### What changed

**New: Radial Hub view** (`WorkflowCanvasRadial.jsx`)

- Client snapshot lives inside a central hub circle (name, urgency badge, trend, pending rec count)
- Category groups are satellites connected by SVG spokes radiating outward
- Safety category always at 12-o'clock; its spoke is solid and thicker; all others are dashed
- Non-selected satellites fade to 35% opacity when one is active — draws the eye to the selection
- Clicking a satellite expands its recommendation cards below the hub (uses existing `WorkflowNode` unchanged)
- Fully keyboard accessible (`role="button"`, `aria-pressed`, Enter/Space)
- Narrow-screen notice appears at < 480px

**New: Priority Matrix view** (`WorkflowCanvasPriority.jsx`)

- 2D CSS Grid — rows = priority tier (Critical / High / Medium / Low), columns = care category
- Safety always leftmost; Spiritual rightmost with muted styling per safety invariants
- Only active tiers and categories rendered — no phantom empty rows or columns
- Empty cells shown as subtle dashed outlines
- Mini-cards: title + priority badge; tooltip shows summary; click opens the existing drawer
- Sticky row-label column; horizontal scroll for wide datasets

**New: Floating view-cycle button** (in `FaithWorkflowsPage.jsx`)

- `⊙` gray → `≡` blue → `⊞` violet → loops: Classic List → Radial Hub → Priority Matrix → Classic List
- Position: `absolute` bottom-right of canvas panel — non-intrusive, always reachable
- Choice persisted to `localStorage` (`fw_view_variant`); survives page refresh
- Tooltip shows current view name and what the next click will switch to

### What did not change

- `WorkflowCanvas.jsx` (Classic) — untouched
- `WorkflowNode.jsx`, `RecommendationDrawer.jsx`, `ClientRankList.jsx`, `SafetyBanner.jsx` — untouched
- All engine rules, scoring, and data fetch logic — untouched
- All 51 engine integration tests — still passing
- Bundle size delta: +5.7 KB gzipped (no new dependencies)

---

## v5.5.1 — Faithful Workflows: Phase 5 — Testing, Telemetry, and Bug Fixes

**Date:** 2026-04-02
**Type:** Patch — testing completeness, telemetry events, production bug fixes

### Summary

Completes Phase 5 of Faithful Workflows. Adds a 51-test integration suite for the
rules engine, wires frontend telemetry events to the workflow page, and fixes two
production bugs discovered by the new tests.

### What changed

**New: Rules engine integration tests** (`engine/runWorkflow.test.mjs`)

- 51 tests covering all 5 mock clients (Emma, Marcus, Priya, David, Sarah)
- Verifies: safety rule fires by ruleId, category ordering, no-duplicate IDs, sort correctness, safety lock invariant (priority ≥ 9 → never hidden/deferred), required Recommendation field shapes, deterministic idempotency, null/empty input safety

**Bug fix: `monitoringRules.js` — `buildOverdueRec` crash**

- `data` was referenced inside `buildOverdueRec` but not in scope (only `clientId` and `days` were params)
- Fixed: `data` added as a parameter; `ruleReassessmentOverdue` passes it through
- Impact: rule silently threw for every client with assessments > 90 days old — monitoring rec never surfaced

**Bug fix: `safetyRules.js` — `'SI'` keyword false positives**

- `containsRiskKeyword` used `String.includes('si')` which matched common English words: "assigned", "consistent", "transition", "persistent"
- Fixed: `'SI'` moved to a word-boundary regex (`/\bSI\b/i`); all other phrase keywords retain substring matching
- Impact: `rule_safety_risk_note` was firing for clinically routine clients (Marcus, David, Sarah) when their notes contained words like "No homework assigned"

**New: Frontend telemetry events in `FaithWorkflowsPage.jsx`**

- `recommendations_surfaced` — when a client's rec list first loads; carries `with_safety`/`no_safety` signal
- `client_selected` — on left-panel client click
- `recommendation_opened` — when recommendation drawer opens
- `recommendation_${status}` — on status change (complete, defer, hide)
- `action_${actionType}` — on content action button click
- Zero PHI emitted: only category names and count bands used in telemetry attributes

---

## Unreleased — DSM-5-TR Diagnosis Lookup

### Summary

Maps the repository `docs/DSM5-TR.md` reference into the client diagnosis workflow so staff can search DSM-5-TR diagnoses from within the diagnosis tab instead of manually keying code/description pairs.

### Changed

- `apps/api/src/lib/dsm5-tr-reference.js`
  - parses the DSM-5-TR alphabetical appendix from `docs/DSM5-TR.md`
  - builds a cached lookup index with bounded search results
- `apps/api/src/index.js`
  - adds authenticated `GET /v1/reference/dsm5-tr?q=&limit=` lookup endpoint
  - normalizes the new route for request telemetry
- `apps/web/src/lib/clientApi.js`
  - adds DSM-5-TR lookup client helper
- `apps/web/src/components/ClientDetail/tabs/DiagnosesTab.jsx`
  - adds DSM-5-TR search/select support in the diagnosis editor
  - fixes diagnosis field mapping to the API's camelCase contract
  - tracks lookup, add/remove, save, validation, and empty-match telemetry on `client.diagnoses`
- `apps/api/test/dsm5-tr-reference.test.mjs`
  - adds parser/search coverage for the DSM-5-TR reference index

---

## v5.6.0 — API Security and Compliance Baseline Hardening

**Date:** 2026-04-01
**Type:** Security and governance baseline release

### Summary

Introduces a versioned API security and compliance engineering baseline designed for high-trust environments where PHI, PII, confidential business data, and payment-related records may exist. This release codifies secure-by-design and privacy-by-design expectations for all new and modified API work.

### What changed

- updated canonical security standard at `PLANS/FULL-SECURITY-AND-AUDITING.md` with a new section:
  - `v5.6.0 API Security And Compliance Engineering Standard`
- added a dedicated README section:
  - `API Security And Compliance Baseline (v5.6.0)`

### Baseline coverage

- authentication and authorization hardening expectations
- tenant isolation and object-level access control requirements
- input validation and output minimization requirements
- safe error handling and secrets-safe logging requirements
- PHI/PII/payment-aware handling and redaction requirements
- auditability, traceability, and secure change-delivery expectations

### Compliance alignment intent

This engineering baseline supports:

- HIPAA-oriented safeguards
- GDPR-aligned privacy principles
- SOC 2 control expectations
- PCI-conscious engineering

No automatic legal certification claim is made by this release.

## v5.5.0 — Faithful Workflows

**Date:** 2026-03-31
**Type:** Minor release — new counselor-facing feature page

### Summary

Introduces **Faithful Workflows**, a counselor-facing three-panel workspace that reviews each client's clinical data and surfaces prioritized, explainable, actionable care recommendations using a hybrid deterministic-rules + template-rationale engine. The page is wired to real API data; the demo dataset now seeds five clients with rich clinical profiles (PHQ-9 score history, item-9 SI scores, GAD-7, PCL-5, treatment goal objects, faith profiles, no-show appointments) that drive the full urgency range end-to-end.

### New features

- **Left panel:** Ranked client list with urgency badge (critical/high/moderate/routine), recommendation count, top reason chips, diagnosis summary, last activity, and trend indicator
- **Center panel:** Vertical workflow canvas showing a client snapshot node followed by recommendation nodes grouped by category (safety → clinical → session → homework → relationship → spiritual → coordination → monitoring)
- **Right drawer:** Full recommendation detail — why surfaced, evidence snippets, clinical relevance, faith integration note, cautions, documentation considerations, and action outputs
- **Action buttons:** Session agenda, note prep, Bible verses (optional), prayer prompt (optional), CBT exercise, journaling prompt, follow-up message, reminder task, treatment plan update draft — all output AI-disclaimer watermark
- **Safety enforcement:** Safety nodes cannot be hidden or deferred when priority ≥ 9; safety banner always visible; spiritual nodes always labeled "(Optional)"
- **5 demo clients** mapped to real seeded records (Elena/Jordan/Naomi/Sofia/Isaac) covering the full urgency range — page uses real API data, mock clients serve as dev-time fallback only

### Rules engine (27 rules across 7 categories)

- Safety: PHQ-9 severe, suicidal ideation (item 9), PCL-5 crisis, consecutive no-shows, risk keywords in notes
- Clinical: PHQ-9 worsening trend, GAD-7 high, no treatment plan, stale plan, no recent note, diagnosis without goal
- Session: overdue goals, pending homework, pending assessment
- Homework: no between-session homework, journaling suggestion
- Relationship: systems goal missing, relationship concern in note
- Spiritual (all optional): biblical integration, grief support, transition prayer, faith acknowledge
- Coordination: no insurance, open referral, faith referral, closing summary
- Monitoring: reassessment overdue, discharge planning, stable progress

### Demo dataset — Faithful Workflows enrichment

Five canonical clients carry enriched clinical data seeded by `pnpm demo:finalize`:

| Client | Counselor | Urgency | Key signals |
| -------- | ----------- | ------- | ------------- |
| Elena Martinez (client-001) | Ricardo Julia | Critical | PHQ-9 14→18→22, item9=3, 2 no-shows, faith opt-in |
| Jordan Alvarez (client-002) | Ricardo Julia | High | PHQ-9 12→16→18, GAD-7=15, plan stale 110d |
| Naomi Rivera (client-003) | Ricardo Julia | Moderate | Note 36d old, last assessment 97d ago |
| Sofia Hernandez (client-005) | Ricardo Julia | Discharge | All 3 goals completed, PHQ-9=4 improving, faith opt-in |
| Isaac Romero (client-010) | Mercy Robles | Routine | Stable PHQ-9, faith opt-in, no homework in notes |

### New files

```text
apps/web/src/components/FaithWorkflows/
├── FaithWorkflowsPage.jsx
├── ClientRankList.jsx
├── WorkflowCanvas.jsx
├── WorkflowNode.jsx
├── RecommendationDrawer.jsx
├── SafetyBanner.jsx
└── engine/
    ├── types.js
    ├── mockData.js
    ├── utils.js
    ├── scoreClient.js
    ├── runWorkflow.js
    └── rules/
        ├── safetyRules.js
        ├── clinicalRules.js
        ├── sessionRules.js
        ├── homeworkRules.js
        ├── spiritualRules.js
        ├── coordinationRules.js
        └── monitoringRules.js

.claude/agents/demo-dataset-finalizer.md
```

### Modified files

- `apps/web/src/App.jsx` — `showFaith` flag + `FaithWorkflowsPage` import + render
- `apps/api/src/db/queries/clientFaithProfiles.js` — row mapper exposes `integratesFaith`, `tradition`, `notes` aliases
- `apps/api/src/db/queries/clinical.js` — treatment plan row mapper exposes `reviewedAt` / `lastReviewedAt`
- `ops/demo-dataset/manifest.mjs` — `WORKFLOW_ENRICHMENT` block; enriched assessment history, goal objects, faith integration flags, no-show appointments
- `ops/demo-dataset/common.mjs` — seeds `faith_integration_level`, goal objects, assessment history submissions; updated invariant for submission coverage
- `packages/i18n/src/index.js` — ~65 new `workflow.*` keys
- `packages/domain/src/index.js` — `workflowCategories`, `workflowActionTypes`, `workflowUrgencyLevels`, `workflowRecommendationStatuses`, `workflowTrends` enums

---

## v5.4.2 — Operations Studio AR Removal + Cache Stability ✅ Validated

**Date:** March 31, 2026
**Type:** Patch release

### Summary

Two follow-on fixes to the Operations Studio repair landed after `v5.4.1` was tagged. The Accounts Receivable section was removed — it displayed hardcoded data irrelevant to the practice's offerings-and-payment model — and a script-tag cache buster was added to prevent browsers from loading stale JavaScript that referenced the now-removed HTML elements.

### Changed

- `apps/web/public/operations.js`
  - Removed entire AR renderer block from `renderPracticeReport`: outstanding balance, aging buckets, and client count columns no longer rendered
- `apps/api/src/index.js`
  - Removed `tenantInvoices` filter, `aging` computation, and `accountsReceivable` key from `buildReportingOverview` return object
- `apps/web/public/operations.html`
  - Removed `rptArCard` div and its children (`rptArOutstanding`, `rptArAging`, `rptArClients`)
  - Script tag updated: `/operations.js` → `/operations.js?v=5.4.2` to force browser cache invalidation after element changes

### Rationale — AR section removal

The practice operates on an offerings/payment model: clients pay for counseling packages directly. There is no insurance billing, no CPT codes, and no claims-based AR aging. The `buildAgingReport` function powering the section drew from a hardcoded two-invoice in-memory array (including a `'BlueCross Placeholder'` payer) with no database backing — displaying fictitious numbers. Removing the section eliminates misleading data. The underlying `buildAgingReport` function is retained in `index.js` for the separate billing tab endpoint.

### No schema changes

All changes are frontend-only or remove a computation from a reporting helper. No database migrations required.

---

## v5.4.1 — Operations Studio Full Repair ✅ Validated

**Date:** March 31, 2026
**Type:** Patch release

### Summary

Operations Studio (`/operations.html`) was fully functional at the route and handler level but broken in every tab due to field-name mismatches accumulated between the API implementation and the frontend renderer. Additionally, the "End Session" action sent a `PATCH` with the session ID in the URL path but no matching route existed. All 12+ mismatches corrected and the missing route added.

### Changed

- `apps/web/public/operations.js`
  - `renderPracticeReport`: corrected `utilization` fields (`sessionsInWindow`, `sessionsCompleted`, `remoteRate`), referral key (`referralSource`), assessment trend fields (`inventoryName`, `completedCount`), document completion shape (`requiresSignatureCount`, `signedDocuments`, `completionRate`), AR aging buckets expanded from 4 to 5 (`days1to30`, `days31to60`, `days61to90`, `over90`), and location identifier (`locationName`)
  - `renderPlatformSummary` provisioning table: `r.tenantId` → `r.requestedTenantId`, `r.practiceName` → `r.requestedPracticeName`
  - `renderPlatformSummary` impersonation table: `r.role` → `r.targetRole`; duration falls back to `endedAt − startedAt` when `durationMinutes` is null
  - `renderPlatformSummary` exports table: `r.type` → `r.exportType`, `r.requestedBy` → `r.requestedByRole`
  - `renderPlatformSummary` retention section: completely rewritten — renders `clinicalRecordsSchedule`, `billingSchedule`, `auditLogSchedule` as labeled pills with human-readable values; shows legal hold status
  - Tenant provisioning POST body: `tenantId` / `practiceName` → `requestedTenantId` / `requestedPracticeName`
  - Retention save: HTTP method `PUT` → `POST`; field names corrected to `clinicalRecordsSchedule`, `billingSchedule`, `auditLogSchedule`
- `apps/api/src/index.js`
  - Added route: `PATCH /v1/platform/impersonation-sessions/:id` dispatches to `handleSupportImpersonationSessionById`
  - Added `handleSupportImpersonationSessionById`: extracts session ID from URL path, handles PATCH only, ends session in DB via `endImpersonationSession(sessionId)` with in-memory fallback
  - `normalizePathname`: registered `/v1/platform/impersonation-sessions/:id` for OTEL path normalization

### No schema changes

All fixes are JavaScript-only (frontend renderers, form submission payloads, API routing). No database migrations required.

---

## v5.4.0 — Client + Scheduling + Chart Integration ⚠️ UNTESTED — Under Review

### Summary

Four connected improvements across Client, Scheduling, and Clinical Chart workspaces:

1. **High-touchpoint inline toggle** — the high-touchpoint flag on each client row is now a clickable button. One click optimistically flips the flag and PATCHes the server; rolls back on failure.
2. **Sessions button per client** — each client row in the Client workspace has a new "Sessions" button that opens a modal listing all appointments for that client (newest first) with date, type, status, counselor, and duration.
3. **Client Sessions tab in Scheduling** — new "Client Sessions" tab lets counselors search for a client and see their full appointment history. Past appointments show note status badges (Notes Filed / Draft — Pending Sign-off / No Notes). Appointments with notes include a "View Chart" button that navigates directly to the Clinical Chart with the client pre-selected.
4. **ClinicalChartPage deep-link prop** — `ClinicalChartPage` now accepts an `initialClientId` prop. `App.jsx` manages `clinicalChartInitialClientId` state cleared on navigation away; `handleOpenClinicalChart(clientId)` is passed as `onViewChart` to `SchedulingPage`.

### Changed

- `apps/web/src/components/ClinicalChart/ClinicalChartPage.jsx`
  - Accepts `initialClientId` prop; initializes and syncs `selectedClientId` state from it
- `apps/web/src/App.jsx`
  - Adds `clinicalChartInitialClientId` state; clears on navigate away from `'clinical'`
  - Adds `handleOpenClinicalChart(clientId)` handler
  - Passes `onViewChart={handleOpenClinicalChart}` to `SchedulingPage`
  - Passes `initialClientId={clinicalChartInitialClientId}` to `ClinicalChartPage`
- `apps/web/src/components/ClientsPage.jsx`
  - High-touchpoint badge replaced with inline toggle button (optimistic update + rollback)
  - "Sessions" button added per client row; opens `ClientSessionsModal`
- `apps/web/src/components/ClientSessionsModal.jsx` *(new)*
  - Modal showing full appointment history for a selected client
- `apps/web/src/components/SchedulingPage.jsx`
  - New `ClientSessionsPanel` sub-component with client selector, appointment table, note status badges, and "View Chart" navigation
  - "Client Sessions" tab added to tab list
  - Accepts `onViewChart` callback prop
- `packages/i18n/src/index.js`
  - New keys: `clientsPage.sessionsButton`, `clientsPage.sessionsModalTitle`, `clientsPage.sessionsEmpty`, `clientsPage.highTouchpointToggleHint`, `clientsPage.highTouchpointUpdateFailed`, `scheduling.col.*`

### No API changes

All data is available from existing endpoints:

- `PATCH /v1/clients/:id` — high-touchpoint toggle
- `GET /v1/appointments?clientId=:id` — client appointment history
- `GET /v1/clients/:id/progress-notes` — note status per appointment

---

## Unreleased — Demo Dataset Finalizer

### Summary

Adds a deterministic post-test database finalizer for human testing. The new `ops/demo-dataset` flow wipes mutable demo data for the `system` tenant, recreates the canonical staff/client/forms/offerings dataset, clears active auth sessions, and verifies exact invariants before commit. The finalizer explicitly leaves `audit_events` untouched.

Also expands the Scheduling workspace so the day picker marks days with appointments and the workspace can switch into a month-scoped agenda that shows every session scheduled for the selected month.

### Changed

- `ops/demo-dataset/manifest.mjs`
  - defines the fixed human-testing manifest: canonical counselors, 10 clients, default forms, offerings, billing subset, credentials, and future scheduled appointments
- `ops/demo-dataset/common.mjs`
  - implements transactional apply/verify logic for the `system` tenant
  - rebuilds staff, clients, charting rows, form assignments/submissions, offerings, billing rows, portal profiles/accounts, and resets live sessions
  - verifies exact counselor names/counts, client counts, form coverage, offering/payment counts, and cleared sessions before commit
- `ops/demo-dataset/apply.mjs`
  - CLI entry point for direct apply runs
- `ops/demo-dataset/verify.mjs`
  - CLI entry point for read-only invariant verification
- `ops/demo-dataset/finalize.mjs`
  - standard post-test finalizer entry point
- `package.json`
  - adds `pnpm demo:apply`, `pnpm demo:verify`, and `pnpm demo:finalize`
- `README.md`
  - documents the finalizer workflow and default credentials
- `apps/web/src/components/SchedulingPage.jsx`
  - marks appointment days in the date picker
  - adds a month picker and month agenda view with month-level metrics
  - exposes `scheduling.month` as a monitored scheduling subview
- `packages/telemetry/src/surfaces.js`
  - registers `scheduling.month` in the shared surface registry
- `PLANS/FULL-SURFACE-MONITORING.md`
  - adds `scheduling.month` to the canonical scheduling subview inventory

---

## v5.3.2 — Clinical Chart Session Loading Fix ✅ Validated

**Date:** March 30, 2026
**Type:** Patch release

### Summary

Fixes a bug in v5.3.1 where the session appointment selector in the Clinical Chart showed "No sessions on calendar for this client" for every client. Two root causes: (1) a bare `catch {}` silently swallowed all API errors, leaving `appointments` empty with no feedback; (2) the component fetched all practice appointments and filtered client-side, making any fetch failure indistinguishable from empty data. Fixed with server-side `?clientId=` filtering and proper error state exposure in the UI.

### Changed

- `apps/api/src/db/queries/appointments.js`
  - `listAppointments(tenantId, { clientId })` — optional `clientId` parameter adds `AND a.client_id = ?` to the SQL
- `apps/api/src/index.js`
  - `GET /v1/appointments` reads `?clientId=` query param, sanitizes, and passes to `listAppointments`
  - In-memory fallback also filters by `clientId` when provided
- `apps/web/src/components/ClinicalChart/tabs/SessionNotesTab.jsx`
  - Fetches `/api/v1/appointments?clientId=<id>` instead of all appointments
  - Replaced bare `catch {}` with `catch (err)` that sets `apptLoadError` state and logs to console
  - Red Alert shown in note composer when appointments fail to load
  - Added early-return guard when `clientId` is not set
- `package.json`, `apps/api/package.json`, `apps/web/package.json`
  - bumped version from `5.3.1` to `5.3.2`

---

## v5.3.1 — Session Notes Appointment Linkage ⚠️ Untested — Under Review

**Date:** March 30, 2026
**Type:** Patch release

### Summary

Enforces that every clinical session note is attached to a calendar appointment. The note composer in the Clinical Chart requires selecting a scheduled session before saving. Notes are displayed grouped under their linked appointment. The `progress_notes` table gains `appointment_id` via a backward-compatible migration; existing unlinked notes are preserved under a legacy divider.

### Changed

- `apps/api/src/db/schema.sql`
  - added `appointment_id VARCHAR(64) NULL` and `INDEX idx_note_appointment` to `progress_notes`
- `apps/api/src/db/migrate.js`
  - added backward-compatible column and index migration for `progress_notes.appointment_id`
- `apps/api/src/db/queries/clinical.js`
  - `rowToProgressNote` returns `appointmentId`
  - `createProgressNote` accepts and stores `appointmentId`
- `apps/api/src/index.js`
  - POST `/v1/clients/:id/progress-notes` accepts `appointmentId`
  - PATCH handler row reconstruction includes `appointmentId`
- `apps/web/src/components/ClinicalChart/tabs/SessionNotesTab.jsx`
  - loads client appointments from calendar
  - requires session selection before note can be saved
  - groups notes by linked appointment in the display
  - legacy notes (no appointment link) shown under a separate divider
- workspace package manifests
  - bumped version from `5.3.0` to `5.3.1`

### Validation

> ⚠️ Not yet validated. See [v5.3.1-RELEASE-SUMMARY.md](v5.3.1-RELEASE-SUMMARY.md) for the full checklist.

```bash
node --env-file=.env apps/api/src/db/migrate.js
pnpm --filter @faith/api exec node --check src/index.js
pnpm lint
pnpm --filter @faith/web build
```

---

## v5.3.0 — Clinical Chart ⚠️ Untested — Under Review

**Date:** March 30, 2026
**Type:** Minor release

### Summary

Ships the Clinical Chart — the primary clinical documentation surface. Wires the previously-placeholder "Clinical Chart" sidebar nav item to a fully functional 5-tab page. Adds a PATCH endpoint for note updates and sign/lock. Introduces the `internal_note` type for private counselor notes that are excluded from the legal clinical record.

### Added

- `packages/domain/src/index.js`
  - added `'internal_note'` to `progressNoteTypes` enum
- `apps/api/src/index.js`
  - added `PATCH /v1/clients/:id/progress-notes/:noteId` — updates drafts, signs/locks notes, enforces 409 on locked note mutations
  - emits `chart.progress_note.update` and `chart.progress_note.sign` audit events
- `packages/i18n/src/index.js`
  - added ~45 keys for `chart.tab.*`, `chart.note.*`, `chart.plan.*`, `chart.progress.*`, `chart.homework.*`
- `apps/web/src/components/ClinicalChart/ClinicalChartPage.jsx`
  - top-level chart page with client picker and 5-tab shell
- `apps/web/src/components/ClinicalChart/tabs/SessionNotesTab.jsx`
  - create/edit/sign clinical session notes with type selector, summary, and interventions
- `apps/web/src/components/ClinicalChart/tabs/InternalNotesTab.jsx`
  - private counselor notes with tags (Risk, Spiritual concerns, etc.), never locked
- `apps/web/src/components/ClinicalChart/tabs/TreatmentPlanTab.jsx`
  - goals and interventions editor with status, review cadence, and last-reviewed date
- `apps/web/src/components/ClinicalChart/tabs/ProgressTab.jsx`
  - assessment score history grouped by instrument with severity band badges for all 10 scored tools
- `apps/web/src/components/ClinicalChart/tabs/HomeworkTab.jsx`
  - form assignment tracking: pending assignments as cards, completed as summary table

### Changed

- `apps/web/src/App.jsx`
  - added `showClinical` flag, imported and rendered `ClinicalChartPage`
  - removed `'clinical'` from telemetry placeholder list
- workspace package manifests
  - bumped version from `5.2.2` to `5.3.0`

### Validation

> ⚠️ Not yet validated. See [v5.3.0-RELEASE-SUMMARY.md](v5.3.0-RELEASE-SUMMARY.md) for the full checklist.

```bash
pnpm --filter @faith/api exec node --check src/index.js
pnpm lint
pnpm --filter @faith/web build
```

---

## v5.2.2 — Offerings Settings and Removal Fixes

**Date:** March 30, 2026
**Type:** Patch release

### Summary

Completes the first stabilization pass for the new Offerings model. This patch fixes the missing backward-compatible database migration for older `portal_settings` tables, aligns suggested-offering values between Workspace Studio and the client portal, corrects cent-based display formatting in the portal giving surface, and adds a supported remove path for incorrect offering entries.

### Changed

- `apps/api/src/db/migrate.js`
  - adds backward-compatible `portal_settings` migrations for:
    - `financial_mode`
    - `suggested_offering_cents`
    - `offering_ministry_note`
- `apps/api/src/index.js`
  - fixes offerings runtime handling for authenticated requests
  - adds `DELETE /v1/offerings/:id` for removing incorrect entries
- `apps/web/src/components/WorkspaceStudio/tabs/OfferingsTab.jsx`
  - converts saved cent values back into dollars for the Studio amount input
  - keeps the draft aligned after save to avoid repeated-value multiplication
- `apps/web/src/components/Portal/ClientPortalPage.jsx`
  - formats `suggestedOfferingCents` and offering-history amounts as cents-based currency values
- `apps/web/src/components/Offerings/OfferingsPage.jsx`
  - adds a `Remove` action for incorrect offering entries
- `packages/i18n/src/index.js`
  - adds remove/confirm/success/failure labels for the Offerings workspace
- workspace package manifests
  - bumped version from `5.2.1` to `5.2.2`

### Validation

```bash
node --env-file=.env apps/api/src/db/migrate.js
pnpm --filter @faith/api exec node --check src/index.js
pnpm lint
pnpm --filter @faith/web build
```

Additional live-stack verification:

- authenticated `PATCH /api/v1/portal/settings`
- authenticated `GET /api/v1/portal/settings`
- authenticated `POST /api/v1/offerings`
- authenticated `DELETE /api/v1/offerings/:id`

---

## v5.2.1 — Offerings UI Hotfix

**Date:** March 30, 2026
**Type:** Patch release

### Summary

Fixes the first-release regressions on the new Offerings screens. The frontend app was showing raw translation keys because the new offerings labels had only been added to the API locale JSON, while the React shell reads from `packages/i18n/src/index.js`. The new Offerings data requests were also bypassing the `/api` proxy and hitting `/v1/...` directly, causing the web server to return HTML and the UI to fail with `Unexpected token '<'`.

### Changed

- `packages/i18n/src/index.js`
  - added the missing frontend labels for `nav.offerings`, `topbar.offerings.*`, `studio.tab.offerings`, `offerings.*`, `portal.tab.giving`, and `portal.giving.*`
- `apps/web/src/components/Offerings/OfferingsPage.jsx`
  - switched offerings list and summary requests to `/api/v1/offerings` and `/api/v1/offerings/summary`
  - added removal support for incorrect offering entries from the Offerings history surface
- `apps/web/src/components/WorkspaceStudio/tabs/OfferingsTab.jsx`
  - switched portal-settings and offerings-summary requests to `/api/v1/...`
  - fixed suggested-offering settings so saved cent values load back into the dollar input correctly
- `apps/web/src/components/Portal/ClientPortalPage.jsx`
  - fixed the giving view so suggested offering and recorded offering amounts render cent-based values correctly
- `apps/api/src/index.js`
  - fixed offerings runtime handling for authenticated requests
  - added `DELETE /v1/offerings/:id` for removing incorrect entries
- `apps/api/src/db/migrate.js`
  - added backward-compatible `portal_settings` migrations for `financial_mode`, `suggested_offering_cents`, and `offering_ministry_note`
- `apps/web/public/index.html`
  - updated the built asset entry to the rebuilt hotfix bundle
- workspace package manifests
  - bumped version from `5.2.0` to `5.2.1`

### Validation

```bash
node --env-file=.env apps/api/src/db/migrate.js
pnpm --filter @faith/api exec node --check src/index.js
pnpm lint
pnpm --filter @faith/web build
npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "practice admin can remove an incorrectly recorded offering"
```

---

## v5.2.0 — Offerings Model — Voluntary Giving System

**Date:** March 30, 2026
**Type:** Feature / Model change

### Summary

Replaces the billing model with a faith-based voluntary offering system throughout the application. The Billing nav item becomes Offerings, the Financials portal tab becomes Giving, and the Insurance client tab is removed from the UI (schema data preserved). A globally configured suggested offering amount and ministry note replace invoice and balance concepts. New API routes handle recording and summarising offerings. New components provide the full Offerings workspace and a Workspace Studio Offerings tab for practice-level settings.

### Added

- `apps/web/src/components/Offerings/OfferingsPage.jsx` — full Offerings workspace with summary cards, offering history list, and Record Offering modal
- `apps/web/src/components/WorkspaceStudio/tabs/OfferingsTab.jsx` — Workspace Studio tab to set the global suggested offering amount and view aggregate summary
- `apps/api/src/index.js` — `GET/POST /v1/offerings` and `GET /v1/offerings/summary` routes
- `apps/api/src/db/schema.sql` — `offerings` table; `suggested_offering_cents` and `offering_ministry_note` columns on `portal_settings`
- `docs/v5.2.0-RELEASE-SUMMARY.md` — full release summary
- `docs/PRODUCT-PLANS-OVERVIEW.md` — new file summarising all PLANS files

### Changed

- `apps/api/data/i18n/en.json` — renamed `nav.billing` → `nav.offerings`, `studio.tab.billing` → `studio.tab.offerings`, `portal.tab.financials` → `portal.tab.giving`; replaced `portal.financials.*` block with `portal.giving.*`; removed `client.tab.insurance`; added `offerings.*` and `topbar.offerings.*` key blocks
- `packages/telemetry/src/surfaces.js` — `billing` → `offerings`, `portal.financials` → `portal.giving`, removed `client.insurance`, `studio.billing` → `studio.offerings`
- `apps/web/src/components/Sidebar.jsx` — `billing` → `offerings`
- `apps/web/src/components/TopBar.jsx` — `billing` → `offerings` in viewKeyMap
- `apps/web/src/App.jsx` — added OfferingsPage, `showOfferings` branch, updated emptyState
- `apps/web/src/components/ClientDetail/ClientDetailTabs.jsx` — removed Insurance tab (import, TABS entry, surface map, panel)
- `apps/web/src/components/WorkspaceStudio/WorkspaceStudioPage.jsx` — wired OfferingsTab, renamed `billing` → `offerings` in STUDIO_TABS
- `apps/web/src/components/WorkspaceStudio/tabs/PortalTab.jsx` — removed Financial Presentation mode Select
- `apps/web/src/components/Portal/ClientPortalPage.jsx` — renamed surface map entry, updated tab label, rewrote giving panel with ministry note + suggested amount + stat cards
- `PLANS/FULL-SURFACE-MONITORING.md` — updated surface inventory for all four renamed/removed surfaces
- `docs/domain-model.md` — Billing module → Offerings; updated entities, permissions table

### Validation

```bash
node --check apps/api/src/index.js
node --check apps/api/src/db/queries/portal.js
pnpm lint
pnpm --filter @faith/web build
```

---

## v5.1.0 — UI Baseline & Regression Verification Agent

**Date:** March 30, 2026
**Type:** Infrastructure / Tooling

### Summary

Introduces the UI Baseline & Regression Verification agent — a reusable Playwright-based traversal tool that captures a structured navigation map and per-screen metadata snapshot across all application surfaces and all personas. On first run the agent operates in baseline mode, producing `test-results/screen-baseline.json` and `test-results/ui-map.json`. Future runs operate in compare mode, diffing the live application against the accepted baseline and classifying each change as regression, expected change, new screen, or informational. Two selector defects were found and corrected during the first baseline traversal.

### Added

- `.github/agents/ui-baseline-regression.agent.md` — custom agent definition for UI baseline capture and regression verification, covering all FaithCounseling surfaces, personas, and telemetry rules
- `.github/skills/ui-baseline-regression/SKILL.md` — companion skill specifying traversal logic, per-screen metadata schema, comparison classification table, selector strategy priority, console/network monitoring, screenshot naming, and output conventions
- `docs/UI-BASELINE-AGENT-RUN-2026-03-30.md` — first run report documenting agent creation, defects found, fixes applied, validation commands, and post-fix clean run confirmation

### Changed

- `tests/e2e/ui-baseline.mjs` — `clickTabByLabel` now uses `^${escaped}$` anchored regex instead of unanchored substring match; prevents "Profile" from matching "Faith Profile" in strict mode
- `tests/e2e/ui-baseline.mjs` — corrected Workspace Studio tab label from `'Documents Studio'` (stale design name) to `'Documents & Inventories'` (actual rendered label)

### Validation

```bash
node tests/e2e/ui-baseline.mjs    # exit code 0
```

---

## v5.0.0 — Operations Dashboard + Client Workspace Separation

**Date:** March 30, 2026
**Type:** Major release

### Summary

Promotes the Operations Dashboard upgrade and the restored client-maintenance workflow into a major release boundary. The dashboard remains the operations summary surface, while the `Clients` navigation surface is once again a dedicated client-maintenance workspace. Existing-client `Edit` now opens the full detailed client record instead of the lightweight modal. The monitoring screen now separates current, recent, and historical surface issues, and the top bar titles now follow the active workspace instead of defaulting back to the dashboard label.

### Added

- `docs/v5.0.0-RELEASE-SUMMARY.md` — consolidated release summary for the dashboard/client-workspace split
- browser regression coverage for:
  - dedicated Clients workspace rendering
  - detailed client edit entry from the Clients workspace

### Changed

- `apps/web/src/App.jsx`
  - preserves the dashboard as the operations-summary surface
  - routes `clients` into a dedicated client-maintenance page
- `apps/web/src/components/ClientsPage.jsx`
  - adds the dedicated Clients workspace with:
    - search
    - status filtering
    - summary counts
    - quick edit modal
    - direct schedule handoff
  - restores existing-client `Edit` as the entry point into the detailed client record
- `apps/web/src/components/TopBar.jsx`
  - distinguishes the Clients workspace from the Operations Dashboard in the top bar title and subtitle
  - adds explicit workspace titles for users, counselors, scheduling, documents, workspace studio, portal, clinical, billing, and faith surfaces
- `apps/web/public/monitor.js`
  - changes surface failure summaries from lifetime-only totals to current / recent / total issue state
- `apps/web/public/monitor.html`
  - relabels the monitoring cards and surface table so operators see issue state instead of stale cumulative counts
- `packages/i18n/src/index.js`
  - adds workspace-specific top bar copy across the main application surfaces
- `packages/telemetry/src/node.js`
  - extends frontend surface summaries with `currentIssueCount`, `recentIssueCount`, `issueStatus`, `lastIssueAt`, and `lastSuccessAt`
- `apps/api/data/i18n/en.json`
  - adds English strings for the restored Clients workspace behavior
- `apps/api/data/i18n/es.json`
  - adds Spanish strings for the restored Clients workspace behavior
- `README.md`
  - updated top-level release references to `v5.0.0`
  - added the new major-release summary section
- `docs/OPERATIONS-DASHBOARD-IMPLEMENTATION-LOG-2026-03-30.md`
  - records the client-workspace separation regression fix and detailed edit restoration
- `docs/OPERATIONS-DASHBOARD-UPGRADE-SUMMARY.md`
  - records the restored Clients workspace, detailed edit path, and monitoring surface-issue semantics
- `PLANS/FULL-SURFACE-MONITORING.md`
  - clarifies that the monitor must distinguish current, recent, and historical surface issues

### Validation

- `pnpm lint` — passed
- `node --check packages/telemetry/src/node.js` — passed
- `node --check apps/web/public/monitor.js` — passed
- `pnpm --filter @faith/api exec node --check src/index.js` — passed
- `pnpm --filter @faith/web build` — passed
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "practice admin top bar titles track the active workspace|practice admin can open workspace studio, monitoring, and operations surfaces used in daily operations"` — passed
- `npx playwright test tests/e2e/inclusive-smoke.spec.mjs --grep "public monitoring page loads with key landmarks"` — passed
- `pnpm test:e2e` — passed (`13/13`)
- `pnpm test:launch-readiness` — passed (`3/3`)

### Version bump

Updated package versions from `4.7.0` to `5.0.0`:

- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/worker/package.json`
- `packages/domain/package.json`
- `packages/i18n/package.json`
- `packages/telemetry/package.json`

## v4.7.0 — Operations Dashboard Upgrade

**Date:** March 30, 2026
**Type:** Feature revision

### Summary

Upgrades the Operations Dashboard from placeholder cards to a real staff-facing daily summary. The dashboard now shows counselor workload, 1-hour availability gaps, high-touchpoint client counts, note-gap compliance thresholds, incomplete assigned work, and portal request status rollups.

### Added

- `PLANS/OPERATIONS-DASHBOARD-UPGRADE.md` — canonical implementation plan for the dashboard upgrade
- `docs/OPERATIONS-DASHBOARD-IMPLEMENTATION-LOG-2026-03-30.md` — dated implementation log from planning checkpoint through final validation
- `docs/OPERATIONS-DASHBOARD-UPGRADE-SUMMARY.md` — shipped feature summary and validation record
- `high_touchpoint` client flag with staff editing support
- structured `GET /v1/operations/summary` sections:
  - `todaySchedule`
  - `priorityQueue`
  - `complianceWatch`
  - `clientsBox`
- dashboard regression coverage for the upgraded operations summary payload and cards
- dashboard drill-down queues for:
  - high-touchpoint clients
  - note-gap compliance items
  - outstanding assigned work
  - unscheduled clients
  - portal request backlog
- dashboard alert thresholds for:
  - unscheduled high-touchpoint clients
  - note-gap backlog
  - same-day counselor capacity exhaustion
  - portal request backlog
- dashboard 7-day trends for:
  - counselor utilization
  - note-gap backlog
  - portal request flow
  - unscheduled clients

### Changed

- `apps/api/src/index.js`
  - replaced the old placeholder operations summary with DB-aware counselor workload, note-gap, assignment, and portal-request aggregation
  - added dashboard-safe detail arrays so the UI can open targeted drill-down queues without extra fetches
  - added backend-derived operational alerts with environment-backed thresholds
- `apps/web/src/App.jsx`
  - added staff-side operations-summary fetch and timed dashboard refresh
  - added navigation callbacks for dashboard drill-down actions into Documents and Workspace Studio Portal
  - restored the `clients` route as a dedicated client-maintenance surface instead of reusing the dashboard grid
- `apps/web/src/components/ClientsPage.jsx`
  - added a dedicated clients workspace with search, status filtering, create action, detailed edit entry, quick edit modal, and direct schedule actions
- `apps/web/src/components/WorkspaceGrid.jsx`
  - replaced placeholder cards and the dashboard client roster with metrics-focused summary cards
  - added actionable dashboard drill-down modals and row-level action buttons
  - added operational alert strip with severity badges and queue/calendar actions
  - added compact 7-day trend cards using bar-based visuals instead of a chart dependency
- `apps/web/src/components/TopBar.jsx`
  - now shows clients-specific top bar title and subtitle so the client-maintenance surface is visually distinct from the Operations Dashboard
- `apps/web/src/components/ClientDetail/*`
  - existing client detail tabs remain the full detailed edit surface reached from the restored `Edit` action on the Clients workspace
- `apps/web/src/components/SchedulingPage.jsx`
  - now notifies the dashboard summary after appointment mutations
- `apps/web/src/components/ClientForm.jsx`
  - added `High touchpoint` staff editing support
- `apps/web/src/components/WorkspaceStudio/WorkspaceStudioPage.jsx`
  - now accepts an initial tab so dashboard drill-downs can open the Portal queue directly
- `packages/i18n/src/index.js`
  - added dashboard summary labels and explanations for the new cards
  - added drill-down modal labels and action text
  - added dashboard alert titles, descriptions, severity labels, and action text
  - added trend section labels, subtitles, legends, and footers

### Validation

- `node --env-file=.env apps/api/src/db/migrate.js` — passed
- `pnpm --filter @faith/api exec node --check src/index.js` — passed
- `pnpm lint` — passed
- `pnpm --filter @faith/web build` — passed
- `pnpm test:e2e` — passed (`10/10`)
- `pnpm test:launch-readiness` — passed (`3/3`)
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "practice admin can drill into dashboard queues and open actionable client details|practice admin dashboard renders the upgraded operations summary cards and payload shape"` — passed

## v4.7.0 — Expanded Counseling Form Library

**Date:** March 29, 2026
**Type:** Feature revision

### Summary

Expands the Documents module into a fuller counseling library. The shared `FormRunner` now powers consent paperwork, deeper assessments, treatment-planning forms, therapeutic worksheets, and additional Christian counseling reflection tools without requiring a second document engine.

### Added

- `PLANS/FORM-LIBRARY-EXPANSION.md` — implementation plan and category model for the expanded form library
- 20 new form definitions across five grouped modules:
  - `AdministrativeForms.js`
  - `ClinicalFoundationForms.js`
  - `TreatmentPlanningForms.js`
  - `TherapeuticWorksheets.js`
  - `FaithCounselingForms.js`
- four new catalog categories in the shared form registry:
  - `administrative`
  - `assessment`
  - `treatment`
  - `worksheets`
- Documents-surface browser regression for opening a newly added consent form through the real UI

### Changed

- `apps/web/src/components/Documents/formRegistry.js`
  - expanded from the prior 19-form library to a 39-form library
- `apps/web/src/components/Documents/DocumentsPage.jsx`
  - updated user-facing copy to reflect intake, consent, assessment, planning, worksheet, and faith-tool coverage
- `apps/api/src/index.js`
  - expanded `DEFAULT_FORM_CATALOG` so the new forms are available to assignment and signup-default workflows
- `apps/api/data/i18n/en.json`
  - synced the English source catalog used by the locale integrity checks
- `apps/api/data/i18n/es.json`
  - completed and corrected the Spanish locale keyset
- `agents/translation_guardian/tools.py`
  - hardened locale preparation and browser challenge evaluation for existing translated locales and non-picker fallback flows

### Documentation

- `docs/TRANSLATION-GUARDIAN-ES-RUN-2026-03-30.md`
  - full Spanish Translation Guardian findings, fixes, and final pass report
- `README.md`
  - linked the current Spanish translation report from the main overview and Translation Guardian section

### Validation

- `pnpm lint` — passed
- `pnpm --filter @faith/web build` — passed
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "practice admin can access the expanded documents library and open a new consent form"` — passed

### Version bump

Updated package versions from `4.6.0` to `4.7.0`:

- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/worker/package.json`
- `packages/domain/package.json`
- `packages/i18n/package.json`
- `packages/telemetry/package.json`

## v4.6.0 — CRITICAL FIX: Complete Logout Session Invalidation

**Date:** March 29, 2026
**Type:** Critical fix

### Summary

Closes the logout invalidation gap. Sign-out now clears both auth cookies with explicit expiry, revokes all active sessions for the authenticated account, and prevents refresh or cross-role cookie leftovers from silently restoring a session.

### Added

- logout now clears both auth cookies and revokes the authenticated account's active sessions so refresh cannot restore the session
- login now clears the opposite auth cookie so stale staff and portal sessions cannot coexist in the browser
- browser regression coverage for logout plus refresh invalidation
- topbar sign-out now includes the required CSRF header, and the web proxy preserves separate auth `Set-Cookie` headers

### Validation

- `pnpm lint` — passed
- raw auth verification — passed
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "shared sign-in gate links new clients into the portal create-account flow|sign out fully invalidates the browser session after refresh"` — passed

## v4.5.0 — Final Portal Signoff + Agent Validation

**Date:** March 29, 2026
**Type:** Stabilization release

### Summary

Records the final security, triage, and repair sweeps for the completed portal release. No new blocking issues were found. The repo-native validation suite, including localization and security checks, passed before publication.

### Added

- `docs/AGENT-RUN-2026-03-29.md` — consolidated report for the final agent-driven signoff sweep
- security-regression fixture alignment for the current public portal consent contract
- release note coverage for the completed portal and validation pass
- direct `Create account`, `Request care`, and `Get scheduled` portal-entry actions on the shared sign-in surface, with `/portal` intent preselection

### Validation

- `pnpm lint` — passed
- `node --env-file=.env apps/api/src/db/migrate.js` — passed
- `pnpm --filter @faith/web build` — passed
- `pnpm test:e2e` — passed (`5/5`)
- `pnpm test:launch-readiness` — passed (`3/3`)
- `npx playwright test tests/e2e/localization.spec.mjs` — passed (`4 passed, 2 skipped`)
- `API_BASE_URL=http://127.0.0.1:3104 pnpm test:security` — passed
- security regression harness aligned with current onboarding consent requirements

## v4.0.0 — Client Portal Completion + Public Onboarding

**Date:** March 29, 2026
**Type:** Major feature release

### Summary

Completes the planned client-portal foundation with structured public onboarding, encrypted onboarding persistence, practice-controlled instant activation, localized portal auth/client UI, and final security/localization regression coverage.

### Added

- encrypted `onboarding_details_enc` on `portal_registration_requests`
- structured public onboarding intake fields and explicit contact consent
- default signup-form preview and public counselor directory preview in `/v1/portal/public-config`
- server-controlled instant activation for eligible `account_signup` flows
- admin-side create-account approval path that can activate a real portal account directly from the Workspace Studio queue
- Spanish localization keys for the portal auth reset flow and core authenticated portal shell
- localization regression coverage for the authenticated client portal

### Changed

- public `/portal` now presents a three-step onboarding structure with:
  - contact capture
  - onboarding context
  - explicit consent plus next-step summary
- `ClientPortalPage.jsx` now localizes the primary portal tabs, headings, financial labels, resource library, and data-rights actions
- `AuthGate.jsx` now localizes the portal password-reset request/completion flow
- `ops/security-regression.mjs` now includes the required onboarding consent in its public portal create-request probe

### Validation

- `pnpm lint` — passed
- `node --env-file=.env apps/api/src/db/migrate.js` — passed
- `pnpm --filter @faith/web build` — passed
- `pnpm test:e2e` — passed (`5/5`)
- `pnpm test:launch-readiness` — passed (`3/3`)
- `npx playwright test tests/e2e/localization.spec.mjs` — passed (`4 passed, 2 skipped`)
- `API_BASE_URL=http://127.0.0.1:3104 pnpm test:security` — passed

### Version bump

Updated package versions from `3.5.0` to `4.0.0`:

- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/worker/package.json`
- `packages/domain/package.json`
- `packages/i18n/package.json`
- `packages/telemetry/package.json`

## v3.5.0 — Authenticated Client Portal Access + Self-Service Foundation

**Date:** March 29, 2026
**Type:** Feature revision

### Summary

Extends the earlier portal foundation into a real authenticated client experience. Portal users can now sign in with dedicated client credentials, restore client sessions through the shared auth endpoints, land directly on the portal surface, update tenant-scoped profile data, and submit appointment requests without relying on staff preview mode.

### Added

- `portal_sessions` schema for dedicated client-session persistence
- `portal_accounts` credential fields for:
  - `email_lookup_hash`
  - `password_hash`
  - `failed_attempts`
  - `locked_until`
- development migration/backfill logic for the seeded portal client account
- real client-session support in:
  - `POST /v1/auth/login`
  - `POST /v1/auth/logout`
  - `GET /v1/auth/me`
- authenticated client routing in the main shell so `client` users land on `portal`
- client-role navigation restrictions to:
  - `portal`
  - `about`
  - `monitor`
- Workspace Studio portal-account creation responses now include a one-time temporary password
- Playwright regression coverage for a real portal-client login flow

### Changed

- `apps/api/src/lib/auth.js`
- `apps/api/src/lib/security.js`
- `apps/api/src/index.js`
- `apps/api/src/db/migrate.js`
- `apps/api/src/db/schema.sql`
- `apps/api/src/db/queries/portal.js`
- `apps/web/src/App.jsx`
- `apps/web/src/components/Sidebar.jsx`
- `apps/web/src/components/TopBar.jsx`
- `apps/web/src/components/WorkspaceStudio/tabs/PortalTab.jsx`
- `apps/web/src/components/Portal/ClientPortalPage.jsx`
- `apps/web/src/lib/clientApi.js`
- `tests/e2e/helpers.mjs`
- `tests/e2e/high-value-journeys.spec.mjs`
- `PLANS/CLIENT-PORTAL-EXPANSION.md`

### Notes

- This closes the earlier “staff preview only” gap for the authenticated portal path.
- Portal telemetry continues to cover `portal.dashboard`, `portal.profile`, and `portal.appointments` without introducing PHI/PII labels.
- Portal password change is still intentionally blocked from the shared staff password-change surface; dedicated portal credential-management remains a follow-up slice.

### Version bump

Updated package versions from `3.0.7` to `3.5.0`:

- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/worker/package.json`
- `packages/domain/package.json`
- `packages/i18n/package.json`
- `packages/telemetry/package.json`

### Validation

- `node --env-file=.env apps/api/src/db/migrate.js` — passed
- `pnpm lint` — passed
- `pnpm --filter @faith/web build` — passed
- `pnpm test:e2e` — passed (`5/5`)
- `pnpm test:launch-readiness` — passed (`3/3`)

### Breaking changes

None. The new portal auth path is additive and compatible with the existing admin preview flow.

## v3.0.7 — Full-Surface Localization Pass 2 + Playwright Regression Coverage

**Date:** April 2026
**Type:** Feature revision

### Summary

Completes Spanish localization across all deeper application surfaces (client detail, counselor detail, Workspace Studio) and introduces a dedicated Playwright localization regression spec. Also copies the Translation Guardian agent into the canonical `.github/agents/` directory and updates the agent catalog.

---

### Findings

1. **Tab labels were hard-coded English strings** in three component trees: `ClientDetailTabs.jsx`, `CounselorDetailTabs.jsx`, and `WorkspaceStudioPage.jsx`. Each used a local `TABS` array with a `label` property that bypassed the i18n system entirely.
2. **Variable shadowing in `WorkspaceStudioPage.jsx`**: The `.map()` parameter was named `t`, which shadowed the `t()` i18n function. Tab labels in the studio were resolving to the parameter value (a tab object reference) instead of the translated string.
3. **Inconsistent studio tab rendering**: The `documentsStudio` tab used a bespoke translation key path while all other tabs used a different path — two code paths for one concept.
4. **Playwright helpers and assertions were English-only**: `openPrimaryNav` in `helpers.mjs` used a hard-coded English `aria-label`. Eight assertions across `high-value-journeys.spec.mjs` would have failed if the locale persisted in test state.
5. **No dedicated localization regression spec existed**: There was no CI-automatable check that raw i18n key strings were absent from the UI or that translated strings appeared after a locale switch.

### Mitigations and Fixes

| Finding | Component | Fix |
| --- | --- | --- |
| Tab labels bypassing i18n | `ClientDetailTabs.jsx`, `CounselorDetailTabs.jsx`, `WorkspaceStudioPage.jsx` | Converted `TABS` arrays from `{ label }` to `{ labelKey }`. All tab renders use `t(tab.labelKey)`. |
| Variable shadowing | `WorkspaceStudioPage.jsx` | Renamed `.map()` parameter from `t` to `tab` across all three usages in the file. |
| Inconsistent studio tab key path | `WorkspaceStudioPage.jsx` | Removed `documentsStudio` special case. All 10 studio tabs use uniform `t(tab.labelKey)`. |
| English-only Playwright selectors | `tests/e2e/helpers.mjs` | `openPrimaryNav` toggle selector now includes the Spanish aria-label alternative. |
| English-only E2E assertions | `tests/e2e/high-value-journeys.spec.mjs` | 8 assertions relaxed to bilingual regex (`/English\|Spanish/i`). |
| No localization regression spec | `tests/e2e/localization.spec.mjs` | Created. Four suites: dashboard keys, client detail tabs, counselor detail tabs, studio title + tabs. |

### Added

- `tests/e2e/localization.spec.mjs` — dedicated Playwright localization regression spec
  - Dashboard: raw key guard; locale-switch labels
  - Client detail tabs: EN baseline + Spanish switch
  - Counselor detail tabs: EN baseline + Spanish switch
  - Workspace Studio: title + all tabs EN baseline + Spanish switch
- 54 new EN i18n keys in `packages/i18n/src/index.js`:
  `role.*` (6), `clientDetail.*` (7), `counselorDetail.*` (7), `client.tab.*` (7), `counselor.tab.*` (7), `studio.*` (11 + placeholder)
- 54 matching Spanish translations in `apps/api/data/i18n/es.json`
- `.github/agents/translation_guardian/` — Translation Guardian Python service copied from `agents/translation_guardian/`
- `.github/agents/README.md` — Translation Guardian catalog entry added

### Changed

- `apps/web/src/components/ClientDetail/ClientDetailPage.jsx` — added `useI18n`, keyed loading/error/back strings
- `apps/web/src/components/ClientDetail/ClientDetailHeader.jsx` — added `useI18n`, keyed buttons, label fields, status badge
- `apps/web/src/components/ClientDetail/ClientDetailTabs.jsx` — `TABS` converted to `labelKey` pattern; added `useI18n`
- `apps/web/src/components/CounselorDetail/CounselorDetailPage.jsx` — added `useI18n`, keyed loading/error/back strings
- `apps/web/src/components/CounselorDetail/CounselorDetailHeader.jsx` — added `useI18n`, keyed back button, role badge, label fields
- `apps/web/src/components/CounselorDetail/CounselorDetailTabs.jsx` — `TABS` converted to `labelKey` pattern; added `useI18n`
- `apps/web/src/components/WorkspaceStudio/WorkspaceStudioPage.jsx` — `STUDIO_TABS` converted to `labelKey` pattern; variable shadowing fixed; title and placeholder keyed
- `tests/e2e/helpers.mjs` — `openPrimaryNav` bilingual-resilient
- `tests/e2e/high-value-journeys.spec.mjs` — 8 assertions use bilingual regex

### Version bump

Updated package versions from `3.0.6` to `3.0.7`:

- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/worker/package.json`
- `packages/domain/package.json`
- `packages/i18n/package.json`
- `packages/telemetry/package.json`

### Validation

- `pnpm --filter @faith/web build` — passed, no compile errors (1263 modules transformed)
- `npx playwright test tests/e2e/localization.spec.mjs` — 3 passed, 2 skipped (client/counselor detail tests skip when no seeded records; no failures)
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs` — 3 passed

### Breaking changes

None. All 54 new i18n keys fall back gracefully to English base strings when a locale override file is absent.

---

## v3.0.6 — Lint Cleanup, Docs Refresh, and Build Sync

**Date:** March 2026  
**Type:** Maintenance revision

### Summary

Updates the root documentation to reflect the recent Workspace Studio repair work, clears remaining markdown lint findings in repo-visible documentation artifacts, and refreshes tracked web build output so committed assets match the current source tree.

---

### Changed

- Updated `README.md` with a new `v3.0.6` maintenance release section.
- Added and normalized `docs/FUNCTIONAL-TESTING.md` as the detailed functional validation report for the recent repair cycle.
- Added an inclusive-smoke testing addendum in `docs/FUNCTIONAL-TESTING.md` documenting new Playwright coverage, failure modes observed during stabilization, and final passing validation.
- Hardened security around public portal intake and diagnostics:
  - unauthenticated `/v1/portal/public-requests` submissions no longer accept caller-controlled tenant or internal status values
  - `/v1/monitoring/db` now requires an authenticated admin role
- Extended the same hardening cycle to:
  - require an authenticated admin role for `/v1/telemetry/summary`
  - persist the canonical audit contract fields in `audit_events`
  - encrypt staff login email and tenant-provisioning owner email at rest with migration-backed rollout
- Added a dated run record at `docs/SECURITY-RUN-2026-03-28.md`.
- Added `docs/RELEASE_3.0.6.md` and `docs/v3.0.6-RELEASE-SUMMARY.md` for release tracking.
- Updated `.gitignore` to ignore transient `test-results/*` folders while preserving `test-results/.last-run.json`, and to ignore `.claude/settings.local.json`.

### Build artifact sync

- Rebuilt the web app with `pnpm --filter @faith/web build`.
- Updated tracked bundle references in `apps/web/public/index.html`.
- Removed stale hashed assets from `apps/web/public/assets` and replaced them with the current bundle set.

### Version bump

Updated package versions from `3.0.5` to `3.0.6`:

- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/worker/package.json`
- `packages/domain/package.json`
- `packages/i18n/package.json`
- `packages/telemetry/package.json`

### Validation

- `pnpm lint` completed successfully.
- `pnpm --filter @faith/web build` completed successfully.
- `npx playwright test tests/e2e/inclusive-smoke.spec.mjs` completed successfully (4/4).

### Breaking changes

None. This release is documentation, lint, and build-output alignment only.

## v3.0.5 — Workspace Studio Forms + Portal Workflow Completion

**Date:** March 2026  
**Type:** Minor revision

### Summary

Completes the Workspace Studio Documents & Inventories workflow so counselors can assign forms, schedule them by timing mode, and review historical repeated submissions for each client. Adds protected submission persistence, standard-on-signup auto-assignment, and a public portal onboarding page.

---

### Added

#### Planning and specification

- `PLANS/WORKSPACE-STUDIO-FORMS-PORTAL-WORKFLOW.md`
  - Canonical implementation plan and acceptance criteria for this workflow.

#### API DB schema (`apps/api/src/db/schema.sql`)

- Added `form_catalog` table.
- Added `form_assignments` table.
- Added `form_submissions` table with encrypted payload storage (`responses_enc`) and `submission_version`.
- Added `portal_registration_requests` table.

#### API query layer

- New file: `apps/api/src/db/queries/formWorkflows.js`
  - Catalog list/create/update and lookup by `form_key`
  - Assignment list/create/update and by-id read
  - Submission list/create plus next-version calculation
  - Portal public registration request create/list

#### API endpoints (`apps/api/src/index.js`)

- Added form workflow routes:
  - `GET/POST/PATCH /v1/forms/catalog`
  - `GET/POST/PATCH /v1/forms/assignments`
  - `GET/POST /v1/forms/submissions`
  - `GET /v1/forms/client-overview`
- Added portal public request route:
  - `GET/POST /v1/portal/public-requests`
- Added default catalog bootstrap behavior (seed-on-read if empty).
- Added automatic standard-on-signup assignment when a portal account is created.

#### Workspace UI

- New file: `apps/web/src/components/WorkspaceStudio/tabs/DocumentsStudioTab.jsx`
  - Client picker
  - Assignment composer with timing modes (`next_session`, `future_session`, `scheduled_recurring`, `account_signup`)
  - Active assignment table
  - Completion history table with version and score summary
  - Integrated form launch and save flow

- `apps/web/src/components/WorkspaceStudio/WorkspaceStudioPage.jsx`
  - Replaced placeholder for Documents & Inventories tab with operational DocumentsStudioTab.

- New shared registry:
  - `apps/web/src/components/Documents/formRegistry.js`

- `apps/web/src/components/Documents/DocumentsPage.jsx`
  - Refactored to use shared form registry module.

- `apps/web/src/components/Documents/FormRunner.jsx`
  - Added `onComplete` callback support.
  - Added score-summary extraction helper for persisted submissions.
  - Kept existing print behavior when callback not provided.

- `apps/web/src/components/WorkspaceStudio/tabs/PortalTab.jsx`
  - Added public portal access notice and launch button.

#### Public portal surface

- New files:
  - `apps/web/public/portal.html`
  - `apps/web/public/portal.js`
- `apps/web/server.js`
  - Added route resolution for `/portal` → `portal.html`.

---

### Version bump

Updated package versions from `3.0.0` to `3.0.5`:

- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/worker/package.json`
- `packages/domain/package.json`
- `packages/i18n/package.json`
- `packages/telemetry/package.json`

---

### Validation

- `pnpm --filter @faith/web build` completed successfully.
- `pnpm --filter @faith/api exec node --check src/index.js` completed successfully.

---

### Breaking changes

None. Changes are additive and preserve existing behavior.

## v3.0.0 — Expanded Clinical Forms Library (19 Instruments)

**Date:** March 2026
**Type:** Major — major feature expansion

### Summary

Expands the clinical forms library from 4 to **19 instruments** and redesigns the Documents UI with category-grouped sections. Adds 10 validated clinical assessments and 5 custom faith-based counseling tools. All versions bumped from 2.2.0 → 3.0.0 across the monorepo.

---

### New Form Files (15)

All new files located in `apps/web/src/components/Documents/forms/`.

#### `PHQ9.js` — Patient Health Questionnaire-9 (Depression Screener)

- **Reference:** Kroenke K, Spitzer RL, Williams JBW. *J Gen Intern Med* 2001;16:606–13
- **Scoring:** `scoreFields` (9 items, 0–3 each) → `phq9ScoreInterpretation(total)` — max 27
- **Exports:** `PHQ9_SCORE_IDS`, `phq9ScoreInterpretation`, `PHQ9`
- **Sections:** Depression Symptoms (9 items), Daily Functioning, Faith Dimension
- **Bands:** Minimal (0–4), Mild (5–9), Moderate (10–14), Moderately Severe (15–19), Severe (20–27)
- **Clinical note:** Item 9 (self-harm ideation) triggers inline counselor alert at any non-zero response

#### `BeckAnxietyInventory.js` — Beck Anxiety Inventory

- **Reference:** Beck AT, et al. *J Consult Clin Psychol* 1988;56:893–897
- **Scoring:** `scoreFields` (21 items, 0–3 each) → `baiScoreInterpretation(total)` — max 63
- **Exports:** `BAI_SCORE_IDS`, `baiScoreInterpretation`, `BeckAnxietyInventory`
- **Sections:** Anxiety Symptoms (21 items, gad_scale), Context & History, Faith Dimension
- **Bands:** Minimal (0–7), Mild (8–15), Moderate (16–25), Severe (26–63)

#### `PCL5.js` — PTSD Checklist for DSM-5

- **Reference:** Weathers FW, et al. (2013). National Center for PTSD
- **Scoring:** `scoreFields` (20 items, 0–4 each) → `pcl5ScoreInterpretation(total)` — max 80; cutpoint ≥ 33
- **Exports:** `PCL5_SCORE_IDS`, `pcl5ScoreInterpretation`, `PCL5`
- **Sections:** Identifying the Stressful Event, PTSD Symptom Checklist (20 items), Faith & Trauma
- **Bands:** Minimal (0–9), Significant Symptoms (10–32), Probable PTSD (≥ 33)

#### `RosenbergSelfEsteem.js` — Rosenberg Self-Esteem Scale

- **Reference:** Rosenberg M. Princeton University Press, 1965
- **Scoring:** `scoreFields` (10 items) → `rsesScoreInterpretation(total)` — max 30
- **Implementation note:** Reverse-scored items use `RSES_OPTIONS_REVERSED` (SA=0, A=1, D=2, SD=3) so the standard sum is correct without a custom reversal function
- **Exports:** `RSES_SCORE_IDS`, `rsesScoreInterpretation`, `RosenbergSelfEsteem`
- **Sections:** Self-Esteem Statements (10 items), Self-Image Context, Faith & Identity in Christ
- **Bands:** Low (< 15), Normal (15–24), High (25–30)

#### `ASRSv1.js` — Adult ADHD Self-Report Scale v1.1

- **Reference:** WHO / Kessler RC, et al. (2003)
- **Scoring:** `scoreInterpretation(answers)` — Part A threshold counting (items 1–4: ≥ 2, items 5–6: ≥ 3). ≥ 4 positives = likely ADHD
- **Exports:** `asrsScoreInterpretation`, `ASRSv1`
- **Sections:** Part A (6 screening items), Part B (12 additional items), History & Impact, Faith Dimension

#### `OCIRevised.js` — OCD Inventory Revised

- **Reference:** Foa EB, et al. *Psychol Assess* 2002;14(4):485–96
- **Scoring:** `scoreFields` (18 items, 0–4 each) → `ociScoreInterpretation(total)` — max 72; cutpoint ≥ 21
- **Exports:** `OCI_SCORE_IDS`, `ociScoreInterpretation`, `OCIRevised`
- **Sections:** OCD Symptom Checklist (18 items), Impact & History, Faith Dimension (includes scrupulosity coverage)
- **Bands:** Minimal (0–9), Subclinical (10–20), OCD Likely (≥ 21), Severe (≥ 40)

#### `AUDIT.js` — Alcohol Use Disorders Identification Test

- **Reference:** Babor TF, et al. WHO Publication No. 01.6a, 2001
- **Scoring:** `scoreInterpretation(answers)` — sums all 10 items manually (Q9/Q10 use values 0, 2, 4); max 40
- **Exports:** `auditScoreInterpretation`, `AUDIT`
- **Implementation note:** Q9 and Q10 options use `gad_scale` type with values `'0'`, `'2'`, `'4'` — non-contiguous but parsed correctly by `parseInt()` in the scoring function
- **Sections:** Alcohol Use (10 items), Context & History, Faith Dimension
- **Bands:** Low Risk (0–7), Hazardous (8–15), Harmful (16–19), Likely Dependence (≥ 20)

#### `DASS21.js` — Depression Anxiety Stress Scales (Short Form)

- **Reference:** Lovibond PF, Lovibond SH. *Behav Res Ther* 1995;33(3):335–43
- **Scoring:** `scoreInterpretation(answers)` — computes three independent subscales (Depression: items 3,5,10,13,16,17,21 · Anxiety: items 2,4,7,9,15,19,20 · Stress: items 1,6,8,11,12,14,18); returns worst color
- **Exports:** `dass21ScoreInterpretation`, `DASS21`
- **Sections:** 21 symptom items (0–3 scale), Context & Duration, Faith Dimension

#### `ACEQuestionnaire.js` — Adverse Childhood Experiences

- **Reference:** Felitti VJ, Anda RF, et al. *Am J Prev Med* 1998;14(4):245–258
- **Scoring:** `scoreInterpretation(answers)` — counts `'Yes'` responses across 10 specific field IDs; max 10
- **Exports:** `aceScoreInterpretation`, `ACEQuestionnaire`
- **Sections:** About This Assessment, Abuse (3 items), Neglect (2 items), Household Dysfunction (5 items), Current Impact & Reflection, Faith & Healing
- **Bands:** None (0), Low-Moderate (1), Moderate (2–3), High (4–5), Very High Risk (≥ 6)

#### `InsomniaSeverityIndex.js` — Insomnia Severity Index

- **Reference:** Morin CM. Guilford Press, 1993. Morin CM, et al. *Sleep* 2011;34(5):601–608
- **Scoring:** `scoreFields` (7 items, 0–4 each) → `isiScoreInterpretation(total)` — max 28. Item 2 uses reverse-sorted options (satisfaction)
- **Exports:** `ISI_SCORE_IDS`, `isiScoreInterpretation`, `InsomniaSeverityIndex`
- **Sections:** Sleep Problem Severity (7 items), Sleep History & Context, Faith & Rest
- **Bands:** No Significant Insomnia (0–7), Subthreshold (8–14), Moderate Clinical (15–21), Severe Clinical (22–28)

#### `CouplesAssessment.js` — Couples & Relationship Assessment

- **Type:** Custom, unscored
- **Export:** `CouplesAssessment`
- **Sections:** Relationship Background, Communication Patterns (Gottman-informed), Conflict & Repair, Intimacy & Connection, Faith & Marriage (Eph. 5:21–33)

#### `GriefAssessment.js` — Grief & Loss Assessment

- **Type:** Custom, unscored
- **Export:** `GriefAssessment`
- **Sections:** Loss History, Grief Experience, Complicated Grief Indicators (DSM-5 Prolonged Grief Disorder), Faith & Lament (Ps. 22, 88; Lamentations; Job; John 11:35)

#### `BurnoutAssessment.js` — Ministry & Caregiver Burnout Assessment

- **Type:** Custom, unscored; based on Maslach Burnout Inventory dimensions
- **Export:** `BurnoutAssessment`
- **Sections:** Role & Ministry Context, Emotional Exhaustion, Cynicism & Compassion Fatigue, Reduced Accomplishment & Identity, Faith & Sustainability (Matt. 11:28)

#### `SpiritualWellnessInventory.js` — Spiritual Wellness Inventory

- **Type:** Custom, unscored; faith-specific assessment
- **Export:** `SpiritualWellnessInventory`
- **Sections:** Spiritual Practices, Core Beliefs & Theology, Community & Accountability, Spiritual Growth & Discipleship

#### `FamilySystemsAssessment.js` — Family Systems Assessment

- **Type:** Custom, unscored; Bowen Family Systems Theory + biblical family theology
- **Export:** `FamilySystemsAssessment`
- **Sections:** Family Composition, Family Relationships & Emotional Climate, Roles & Patterns & Triangles, Faith in Family Context

---

### Modified Files

#### `apps/web/src/components/Documents/DocumentsPage.jsx`

- Added 15 import statements for new form definitions
- Added `CATEGORIES` array (14 domains, display-ordered)
- Replaced flat `FORM_CATALOG` (4 entries) with 19-entry categorized catalog — each entry has `category` field referencing a `CATEGORIES.id`
- Removed unused `ThemeIcon` import
- Replaced single `SimpleGrid` render with `CATEGORIES.map()` loop producing separate labeled `<Stack>` + `<SimpleGrid>` groups per category

#### `package.json` — all 7 monorepo files

- `apps/api/package.json`, `apps/web/package.json`, `apps/worker/package.json`
- `package.json` (root), `packages/domain/package.json`, `packages/i18n/package.json`, `packages/telemetry/package.json`
- Changed: `"version": "2.2.0"` → `"version": "3.0.0"`

---

### Breaking Changes

None. FormRunner, FormDefinition schema, App.jsx routing, and all existing form definitions are unchanged.

---

## v2.2.0 — Electronic Documents & Clinical Form Library

**Date:** March 28, 2026
**Type:** Minor — new feature module

### Overview

Introduces the **Documents** area as a first-class, fully operational feature of the FaithCounseling platform. Prior to this release, the Documents navigation item was a registered placeholder that rendered a generic workspace grid with no document-specific content. This release replaces that placeholder with a complete electronic forms system purpose-built for Christian counseling practices.

The Documents module provides counselors with a library of reusable, session-ready clinical forms rendered directly in the browser. Forms are multi-section, paginated, and support conditional question logic, auto-scoring, and print/PDF export. Every form in the library includes a dedicated **Faith & Spiritual Profile** or **Faith Dimension** section that invites clients to share how their Christian faith shapes their healing journey. Scripture references are embedded contextually throughout each form.

The form architecture is generic and data-driven: all four initial forms are defined as pure JavaScript configuration objects (sections → typed fields), and a single shared `FormRunner` component renders any form definition without custom per-form code. Adding new form templates in the future requires only a new definition file — no renderer changes.

---

### New Files

#### `apps/web/src/components/Documents/forms/ShortIntakeForm.js`

A concise, approximately 10-minute intake form designed to gather essential information before the first counseling session. Structured into six sections:

1. **Personal Information** — name, date of birth, gender, phone, email, address, emergency contact, marital status, employment, preferred communication method
2. **Presenting Concerns** — reason for seeking counseling (free-text), primary concern (select), concern severity scale (1–10), how long the issue has been present, prior counseling experience, reason for choosing this practice
3. **Medical & Mental Health** — current medications, medical conditions, prior mental health diagnoses, substance use status, whether the client is currently safe
4. **Goals** — what the client hopes to achieve, what a successful outcome would look like, preferred counseling style, how they heard about the practice
5. **Faith & Spiritual Profile** *(Christian counseling section)* — religious tradition, faith importance scale (0–10), church attendance frequency, whether they are connected to a church community, openness to integrating faith into counseling sessions (select with five levels from "I prefer faith stays separate" through "Faith is central to my healing"), whether prayer in session is welcome, any specific spiritual goals, name of their pastor or church leader if they consent to contact
6. **Safety Screening** — current thoughts of self-harm or suicide, thoughts of harming others (yes/no radio, required), affirmation that the intake information is accurate

---

#### `apps/web/src/components/Documents/forms/LongIntakeForm.js`

A comprehensive, approximately 40-minute pre-counseling assessment capturing the full clinical and personal picture. Structured into fourteen sections:

1. **Personal Information** — full personal demographics including preferred name, pronouns, and household composition
2. **Emergency Contact** — name, relationship, phone
3. **Presenting Concerns** — detailed description of the primary issue, severity and duration, immediate triggers, prior treatment and outcomes, how the issue affects daily functioning, the client's readiness for change
4. **Mental Health History** — prior diagnoses, psychiatric hospitalizations, prior therapy history, whether the client has ever attempted suicide or engaged in self-harm (with conditional follow-up fields for dates and recency), current mental health medications
5. **Medical History** — primary care physician, chronic conditions, significant surgeries or hospitalizations, allergies, list of all current medications and dosages, physical health currently affecting mental health
6. **Family History** — parents' relationship status, family history of mental health or substance use concerns, childhood description (happy/mixed/difficult/traumatic), key family dynamics that shaped the client
7. **Developmental & Social History** — education level, vocational history, current living situation, primary social supports, legal history, military service including combat exposure
8. **Relationship History** — current relationship status, relationship duration, relationship satisfaction scale, children (ages and living situation), significant relationships (past and present), relationship strengths and areas for growth
9. **Substance Use** — alcohol, tobacco, marijuana, prescription misuse, and other substance use; frequency and quantity; whether misuse has ever been a concern; family history of addiction
10. **Trauma History** — trauma screening checklist (childhood abuse, domestic violence, sexual assault, natural disaster, accident, medical trauma, loss, combat, community violence, other), approximate age of occurrence, whether they have received trauma-specific therapy, whether trauma is a focus for current counseling
11. **Current Functioning** — sleep quality and issues, appetite and eating patterns, physical activity, how they currently cope with stress, current life stressors
12. **Goals & Expectations** — specific counseling goals, what they would consider a successful outcome, timeline expectations, preferred counseling approach (directive / reflective / collaborative / spiritual / eclectic), concerns about the counseling process
13. **Faith & Spiritual Profile** *(Christian counseling section)* — religious tradition/denomination, faith importance scale (1–10), church attendance frequency, whether they are actively connected to a home church, frequency of personal prayer, frequency of personal Bible reading, spiritual disciplines practiced (checkboxes: fasting, journaling, small group, service/volunteering, retreats, worship music, memorization, meditation), preferred level of faith integration in sessions (select with five levels), whether they consent to prayer during or between sessions, specific Christian-focused counseling goals, spiritually significant scriptures or sources of comfort, pastor or church contact consent
14. **Safety Assessment** — current self-harm or suicidal ideation with required yes/no, access to means of harm, current plan or intent (conditional on ideation response), whether the client is currently safe

---

#### `apps/web/src/components/Documents/forms/AnxietyAssessment.js`

A clinically validated anxiety screening based on the **GAD-7 (Generalized Anxiety Disorder 7-item scale)**, extended with physical symptom screening, anxiety pattern exploration, coping inventory, and a Christian faith dimension. Structured into seven sections with automatic real-time scoring:

1. **Personal Information** — date, name, date of birth, counselor name
2. **GAD-7 Core Items** — the seven standardized GAD-7 questions using the canonical four-point frequency scale (Not at all / Several days / More than half the days / Nearly every day). Scored from 0–3 per item, 0–21 total. Scoring bands:
   - 0–4: Minimal anxiety (green)
   - 5–9: Mild anxiety (yellow)
   - 10–14: Moderate anxiety (orange) — watchlist threshold
   - 15–21: Severe anxiety (red) — immediate clinical attention recommended
3. **Physical Symptoms** — nine physical co-occurring symptoms (chest tightness, rapid heartbeat, shortness of breath, dizziness, sweating, trembling, nausea, fatigue, sleep disruption) with additional field for other physical symptoms
4. **Anxiety Patterns & Triggers** — primary anxiety situations (select), frequency of panic episodes (select), severity of anxiety impact on daily functioning (scale 0–10), other specific triggers (free text), onset of current anxiety episode and duration
5. **Impact on Daily Life** — work/school functioning, social functioning, self care functioning, avoidance of activities, notes on daily life impact
6. **Coping Strategies** — checkboxes for current and past coping methods (deep breathing, prayer/meditation, journaling, exercise, support network, professional help, medication, nature/outdoors, worship music, scripture reading, fasting, service/volunteering); space for describing what has helped most
7. **Faith Dimension** *(Christian counseling section)* — Philippians 4:6–7 displayed as an invitation to reflection ("Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God..."); whether the client's anxiety affects their sense of God's presence or trust in God (free text); checkboxes for specific spiritual anxiety factors (faith doubts, prayer feels difficult, spiritual disconnection, questioning God's care, shame/guilt, church/community conflict); a scale (0–10) of current trust and surrender to God; whether faith has been a source of comfort or distress in the anxiety experience; specific faith-based goals for counseling

The scoring engine exports a standalone `anxietyScoreInterpretation(total)` function used by the `FormRunner` to display a live score banner as the client completes the GAD-7 section.

---

#### `apps/web/src/components/Documents/forms/SelfHarmAssessment.js`

A carefully constructed risk assessment based on the **C-SSRS (Columbia Suicide Severity Rating Scale)** — adapted to a clinician-guided client self-report format — combined with non-suicidal self-injury (NSSI) screening and a Christian counseling faith dimension. This form is flagged as clinician-only and carries a crisis resource notice on the library card. Structured into eight sections plus a clinician section:

1. **Personal Information** — date, name, date of birth, counselor name
2. **Before We Begin** — visible crisis resource notice (988 Suicide and Crisis Lifeline, Text HOME to 741741); required confirmation of current immediate safety before the form continues
3. **C-SSRS Ideation Items** — five items from the Columbia scale:
   - Passive wish to be dead (cssrs1)
   - Active suicidal ideation without plan or intent (cssrs2)
   - Suicidal ideation with intent but no specific plan (cssrs3)
   - Suicidal ideation with plan (cssrs4)
   - Suicidal ideation with plan and intent (cssrs5)
   Each item uses a yes/no radio with conditional follow-up questions when answered Yes: frequency (scale 0–10), most recent episode (date), longest duration of ideation, level of control over thoughts (scale)
4. **Non-Suicidal Self-Injury Screening** — whether the client has engaged in NSSI in the last 90 days (yes/no, conditional ); if yes: method checkboxes (cutting, burning, hitting/banging, scratching, hair pulling, other), frequency, most recent occurrence (date), what the NSSI achieved emotionally (checkboxes: emotional release, feeling something/numbness, punishment, control, communication, other), and urge intensity in the last week (scale 0–10)
5. **Behavioral History** — C-SSRS behavior items: lifetime and recent (< 90 days) suicide attempt history (yes/no, conditional dates and method), and aborted or interrupted attempt history
6. **Protective Factors** — reasons for living (required free text); hopefulnessRating scale (0–10, labeled "No hope at all" to "Completely hopeful"); support network and specific support persons; access to lethal means and whether means restriction has been considered by the clinician; future-oriented thinking and plans
7. **Current Emotional State** — current suffering level (scale 0–10); current emotional state checkboxes (hopeful / hopeless / worthless / burdened / alone / loved / at peace / confused / angry / numb / stable / other); notes on what is happening in life right now
8. **Faith Dimension** *(Christian counseling section)* — Jeremiah 29:11 and Psalm 34:18 displayed as pastoral grounding; whether the client believes God has a purpose and future for them (radio: yes / not sure / struggling with this); what is making it hard to see God's purpose (free text, conditional); current sense of God's presence (scale 0–10); whether the client holds moral or religious beliefs that would prevent self-harm (yes/no, free text); whether they would consent to pastoral contact or prayer; scriptures or passages that feel hopeful; open reflection on Jeremiah 29:11
9. **Clinician Section** — clinician-only fields intended to be completed during or after the session: assessed risk level (select: Imminent / High / Moderate / Low / Minimal), actions taken (checkboxes: safety plan, means restriction, referral, hospitalization, increased frequency, pastor contact, family notification), and clinician notes

The risk engine exports a standalone `selfHarmRiskInterpretation(answers)` function that evaluates the C-SSRS ideation items to calculate a risk band (Imminent / High / Moderate / Low / Minimal) displayed as a live banner in the side panel of the form.

---

#### `apps/web/src/components/Documents/FormRunner.jsx`

The shared generic renderer that takes any form definition object and renders it interactively. Provides:

- **Multi-section navigation** — left-column section list with numbered buttons; active section highlighted in brand indigo; safety-marked sections shown with a red dot badge
- **Progress tracking** — a sticky header progress bar (filled brand-color) showing percentage of visible fields answered; section count and estimated completion time displayed alongside the progress bar
- **Field type support** — `text`, `email`, `tel`, `number`, `date` (Mantine `DateInput`), `textarea` (auto-sizing), `select` (searchable + clearable), `radio` (horizontal Group with all options), `checkboxes` (SimpleGrid two-column), `scale` (numeric button row with min/max labels), `gad_scale` (compact Radio.Group row matching the GAD-7 four-option format)
- **Conditional field rendering** — fields with a `showIf: { field, value }` or `showIf: { field, values[] }` property are shown only when the referenced answer matches; evaluated live on every answer change. Used throughout SelfHarmAssessment for follow-up ideation questions and NSSI method group
- **Half-width columns** — fields with `half: true` are placed into a two-column SimpleGrid on tablet and wider; full-width fields span both columns
- **Real-time scoring** — for forms marked `scorable: true`, a score banner is rendered in the left panel showing the current total score, severity band, color, and interpretation. GAD-7 uses a numeric sum (`scoreFields` → sum of integer answers). Self-harm risk uses answer-based logic (`scoreInterpretation(answers)`)
- **Section descriptions** — section `description` strings are rendered with a left brand-color border callout style for visual emphasis
- **Print / PDF export** — "Print / Save PDF" button triggers `window.print()`; print CSS hides navigation and side panels so only the form content is printed
- **Clear and restart** — with a browser confirmation guard
- **Keyboard and accessibility** — all inputs use native Mantine ARIA patterns; tab order follows document flow

---

#### `apps/web/src/components/Documents/DocumentsPage.jsx`

The form library browser rendered when the user navigates to the Documents area. Provides:

- **Form catalog grid** — `SimpleGrid` with 1/2/3 column breakpoints displaying a card for each available form template
- **Form cards** — each card shows the form emoji icon, title, description (3-line clamp), type badge (Intake / Assessment / Clinical Assessment), estimated time badge, and section/field count
- **Crisis alert** — the SelfHarmAssessment card carries a red top border and an inline alert: "Clinical use. In crisis? Call/text 988 or text HOME to 741741."
- **Form launch** — "Open Form" button mounts `<FormRunner>` with the selected form definition and a back-to-library callback
- **Christian integration footer** — a brand-tinted `Paper` block at the bottom of the library explains that every form includes a Faith & Spiritual Profile or Faith Dimension section, with Psalm 147:3 as the closing verse
- **App theme compliance** — uses `var(--bg)`, `var(--surface)`, `var(--text)`, `var(--mantine-color-brand-*)`, and `Paper withBorder radius="lg"` consistent with all other major surfaces in the application

---

### `apps/web/src/App.jsx` — Routing and Telemetry Changes

- Added `import DocumentsPage` alongside other top-level page imports
- Added `const showDocuments = currentView === 'documents'` boolean flag alongside all other view flags
- Added `!showDocuments` to the `showClientsWorkspace` fallback guard so the client workspace is not accidentally rendered behind the documents page on the `documents` route
- Added `showDocuments ? <DocumentsPage />` routing branch between the `showWorkspaceStudio` block and the final dashboard/clients else block
- Removed `'documents'` from the placeholder `emptyState` list in `useSurfaceTelemetry` — the Documents surface now reports as a real surface, not a placeholder

---

### Surface and Monitoring Compliance

The Documents surface now emits real surface telemetry via `useSurfaceTelemetry` (inherited from the App.jsx routing layer). It is no longer listed as a placeholder surface. The form library view and the form runner view share the `documents` surface ID. Individual form opens do not create separate surface registrations in this release.

### Breaking Changes

None. All changes are additive. No existing API, schema, or routing behavior was removed or altered in a backward-incompatible way.

### Clinical & Faith Notes

All four form instruments in this release are grounded in standard clinical practice and adapted for the Christian counseling context:

- **GAD-7** (Spitzer, Kroenke, Williams, & Löwe, 2006) — validated 7-item generalized anxiety disorder scale reproduced in standard form with standard scoring bands
- **C-SSRS** (Posner et al., 2011) — Columbia Suicide Severity Rating Scale ideation and behavior items adapted to a self-report format for this tool; clinical review is expected before acting on results
- **Long Intake** and **Short Intake** — original instruments drawing on standard intake and biopsychosocial assessment conventions common in outpatient mental health settings
- **Faith Dimensions** — original questions authored for this system; not validated psychometric instruments, but designed to support therapeutic alliance and integrate faith naturally into the intake and assessment process

Counselors should review all completed forms and use clinical judgment before making decisions based on any instrument in this library.

---

## v2.1.20 — Appointment Identity Integrity

**Date:** March 28, 2026
**Type:** Patch

### Overview

Fixes identity drift in the scheduling module. Clients and counselors already had generated primary keys in the data model, but appointment create/edit and counselor-calendar filtering were still partially name-driven. That meant a counselor rename could leave stale snapshots in appointment displays or make counselor-specific workload and calendar views depend on outdated names instead of the linked record.

### API and DB (v2.1.20)

- Updated appointment reads in `apps/api/src/db/queries/appointments.js` so `clientName` and `counselorName` resolve from the current linked client/staff rows first and only fall back to stored appointment snapshots when necessary
- Updated `POST /v1/appointments` and `PATCH /v1/appointments/:id` in `apps/api/src/index.js` to accept `counselorId`, validate it against the tenant staff directory, and derive the counselor display name from the linked staff record
- Added staff-rename propagation in `apps/api/src/index.js` so counselor profile name changes refresh appointment snapshots and re-link legacy name-only appointment rows
- Added migration coverage in `apps/api/src/db/migrate.js` for `appointments.counselor_id` plus `idx_appointments_counselor` so older databases are upgraded to the current scheduling identity model
- Added a migration-time backfill that links legacy name-only appointments to a counselor ID when the stored counselor name maps cleanly to one current staff record
- Preserved compatibility for older appointment rows that still carry a counselor display name snapshot without a linked counselor ID

### Web (v2.1.20)

- Updated `apps/web/src/components/SchedulingPage.jsx` so the appointment composer selects counselors by staff ID instead of by counselor name text
- Updated counselor-calendar filtering to request `/api/v1/scheduling/calendar` with `counselorId`, making workload and day views stable across counselor renames
- Updated scheduling metrics to count active counselors by stable ID when available
- Kept a fallback path for legacy appointments so previously stored name-only rows still render and can be edited

### Breaking changes

None.

## v2.1.19 — Schema and Query Bug Fixes

**Date:** March 28, 2026
**Type:** Patch

### Overview

Resolves three runtime errors that surfaced when scheduling and reporting features hit the live MySQL database for the first time: two missing tables that were implemented in the query layer but never added to `schema.sql`, one MySQL `only_full_group_by` violation in the utilization summary query, and a missing `--env-file` flag that caused the API to start without database credentials after a manual restart.

### API (v2.1.19)

- Added `availability_overrides` table to `schema.sql` — columns: `id`, `tenant_id`, `staff_id`, `override_date`, `override_type`, `reason`, `start_time`, `end_time`, `all_day`, `created_at`, `updated_at`; indexes on tenant, staff+date, and tenant+date
- Added `appointment_series` table to `schema.sql` — columns: `id`, `tenant_id`, `counselor_id`, `client_id`, `client_name_enc`, `counselor_name_enc`, `appointment_type`, `recurrence_rule`, `start_date`, `end_date`, `duration_minutes`, `location_id`, `remote_session`, `status`, `created_at`, `updated_at`; indexes on tenant, counselor, client, and date range
- Both tables applied directly to the live database via Docker
- Fixed `GROUP BY` violation in `getUtilizationSummary()` — changed `GROUP BY location_name` (alias) to `GROUP BY a.location_name, l.name` to satisfy MySQL `only_full_group_by` strict mode
- API must be started from the monorepo root with `node --env-file=.env apps/api/src/index.js` to load database credentials

### Breaking changes

None.

## v2.1.18 — Sidebar Options Icon Refresh

**Date:** March 28, 2026
**Type:** Patch

### Overview

Refreshes the sidebar heading inside the hamburger menu. The previous header used a plain purple square plus the two-line `Faith Counseling` / `Practice Workspace` label. It now uses a compact animated counseling icon and a simpler `Options` heading.

### Web (v2.1.18)

- Replaced the placeholder purple square in `apps/web/src/components/Sidebar.jsx` with an animated counseling-style icon
- Simplified the sidebar heading copy to `Options`
- Added the supporting sidebar icon animation styles in `apps/web/src/App.css`
- Preserved the original footprint so the nav layout stays stable

### Breaking changes

None.

## v2.1.17 — Desktop Sidebar Toggle Fix

**Date:** March 28, 2026
**Type:** Patch

### Overview

Fixes the main application hamburger menu on desktop. The sidebar toggle state was wired correctly, but the Mantine AppShell configuration only applied collapse behavior to mobile layouts, so the side menu remained visible on desktop after clicking the burger.

### Web (v2.1.17)

- Updated `apps/web/src/App.jsx` so the AppShell navbar uses `collapsed: { mobile: !navOpened, desktop: !navOpened }`
- Desktop and mobile now both respond to the same hamburger toggle state
- The change affects shell behavior only; no visual redesign was introduced here

### Breaking changes

None.

## v2.1.16 — UI enhancements

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Consolidates the current UI refresh work into a single top-level release entry. The main application shell, monitoring page, and Operations Studio have all been brought into a more cohesive branded experience, and the web bundle delivery path now uses versioned asset filenames so those UI changes reach the browser more reliably.

### Web (v2.1.16)

- Renamed the main header to `Practice Operations Center` and added the animated counseling scene
- Moved session identity into the dashboard metric band and moved API connection status into the sidebar identity area
- Reworked `/monitor.html` into the shared light indigo/blue product palette
- Reworked `/operations.html` into the shared light indigo/blue product palette
- Switched the web build back to hashed asset filenames and regenerated the current `public/index.html` bundle references

### Breaking changes

None.

## v2.1.15 — Sidebar Connection Status Placement

**Date:** March 28, 2026
**Type:** Patch

### Overview

Moves the live API connection badge out of the main header and into the sidebar identity section. The header is now reserved for navigation, title, and language controls, while the connection state sits directly below the signed-in user bubble where session context already lives.

### Web (v2.1.15)

- Removed the connection-state badge from `apps/web/src/components/TopBar.jsx`
- Added the connection-state badge to `apps/web/src/components/Sidebar.jsx` directly under the user identity pill
- Continued using the same state mapping for `Connecting…`, `API Connected`, and `Connection Error`
- Wired the shared `connectionStatus` app state into the sidebar instead of the top bar

### Breaking changes

None.

## v2.1.14 — Operations Page Brand Alignment

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Refreshes the standalone Operations Studio page so it matches the main app’s lighter indigo-forward visual system instead of reading like an older admin utility surface. The functionality on `operations.html` was already substantial, but its darker top bar, flatter white cards, and more generic neutral styling made it feel visually behind the rest of the product.

### Web (v2.1.14)

- Reworked `apps/web/public/operations.html` to use the same light indigo/blue palette as the main app and monitoring page
- Updated the Operations Studio top bar, brand mark, buttons, and status indicators to the shared branded treatment
- Retuned tab navigation, cards, forms, audit panels, reporting blocks, and platform/data sections for the lighter workspace background
- Added brighter gradients, softer indigo borders, and lighter shadows so the page feels consistent with the rest of the refreshed product
- Kept the page structure, controls, and existing JavaScript behavior unchanged

### Breaking changes

None.

## v2.1.13 — Monitoring Page Brand Alignment

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Refreshes the monitoring page so it visually matches the main application instead of reading like a separate dark-theme utility. The existing monitor page already exposed the right telemetry and health data, but its older dark palette, harsher borders, and heavier surfaces made it feel detached from the lighter indigo-forward product experience used elsewhere in the app.

### Web (v2.1.13)

- Reworked `apps/web/public/monitor.html` from the older dark monitor palette to the shared light indigo/blue brand palette
- Added layered gradient page backgrounds and brighter glass-like cards to match the main workspace and About page direction
- Updated the monitor top bar styling, logo mark, buttons, and status chip treatment to fit the main app color system
- Retuned KPI cards, summary panels, issue lists, health rows, DB metric tiles, and OTEL settings inputs for the lighter theme
- Corrected the donut chart center text color so the percentage label remains readable after the palette shift

### Breaking changes

None.

## v2.1.12 — Versioned Web Asset Delivery

**Date:** March 28, 2026
**Type:** Patch

### Overview

Fixes the web bundle delivery path so browser refreshes reliably pick up the latest UI. The build had been emitting fixed filenames like `assets/app.js`, which made it possible for an older dashboard bundle to keep showing after a UI change even though the source and server were already updated. The build now emits hashed asset filenames so each rebuild gets a new URL and the browser is forced onto the current bundle.

### Web (v2.1.12)

- Updated `apps/web/vite.config.js` so Rollup emits hashed entry, chunk, and asset filenames
- Stopped pinning the React bundle to `assets/app.js`
- Stopped pinning CSS/assets to fixed non-versioned names
- `public/index.html` now points to build-specific asset URLs after each web build

### Breaking changes

None.

## v2.1.11 — Operations Header And Session Card Refresh

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Refreshes the main dashboard header and relocates session identity out of the top bar. The previous header still used the older `Practice HUB` title and surfaced `Admin User` / `Server-managed session` inline in the brand area, which diluted the visual hierarchy and made the top bar feel administrative instead of operational. This update turns the header into a more deliberate operations banner, adds a lightweight animated counseling motif, and moves session context into a dedicated metric card beside the audit summary.

### Web (v2.1.11)

- Renamed the main header title from `Practice HUB` to `Practice Operations Center`
- Increased header visual hierarchy with larger title styling and supporting operational subtitle copy
- Added a CSS-animated counseling scene in the top bar instead of relying on a static or external graphic asset
- Removed `Admin User` and `Server-managed session` from the header itself
- Added a new `Current Session` dashboard card that shows the active user identity and server-managed session status beside `Audit Events`
- Expanded the metric band from three to four cards and added dedicated styling so the session card reads as contextual status rather than a numeric KPI
- Increased the application header height to support the larger title and animated header composition without degrading mobile behavior

### Breaking changes

None.

## v2.1.10 — Static File Server Query-String Fix

**Date:** March 28, 2026
**Type:** Patch

### Overview

Fixes the web server's static file handler so URLs with query strings (e.g. `operations.js?v=2.1.7`) resolve correctly to their on-disk files. Before this patch, any `?...` suffix was passed verbatim into `path.join()`, causing the server to look for a file with the query string literally in its name — resulting in a 404, the script never loading, and the entire page becoming unresponsive to clicks.

### Web (v2.1.10)

- Fixed `resolvePublicUrl()` in `apps/web/server.js` to strip the query string with `requestUrl.split('?')[0]` before resolving the file path
- All cache-busting query strings on static assets (`?v=X`, `?t=X`, etc.) now work correctly
- No behavior change for URLs without a query string

### Breaking changes

None.

## v2.1.9 — About Page Experience Refresh

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Redesigns the static About page into a more polished product-overview experience. The page previously rendered as a minimal header plus two generic content panels. It now uses a branded hero, stronger layout hierarchy, warmer visual treatment, and dedicated module/documentation cards while preserving the same operational links and product scope.

### Web (v2.1.9)

- Rebuilt `apps/web/public/about.html` as a richer landing page with:
  - branded top navigation and a stronger Back to App control
  - hero section with large headline, supporting copy, and capability badges
  - summary sidebar with explanatory copy and compact workspace metrics
  - dedicated module cards for charting, scheduling, billing, and portal/faith workflows
  - dedicated utility cards for API health, OpenAPI, Swagger UI, and Monitoring
- Added page-local styling for a warmer gradient background, more expressive typography, softer card treatment, and clearer mobile stacking
- Preserved all existing about-page links and telemetry startup behavior

### Breaking changes

None.

## v2.1.8 — Swagger UI Proxy Repair

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Repairs the interactive API docs at `/api/docs`. The proxied Swagger page was broken because it still referenced the spec as `/openapi.yaml` instead of the proxied `/api/openapi.yaml`, and the web server applied the normal app CSP/COEP profile to the docs route, which blocked Swagger’s CDN-hosted JS and CSS assets.

### API (v2.1.8)

- Changed Swagger UI spec resolution from `/openapi.yaml` to relative `./openapi.yaml`
- Disabled the external Swagger validator with `validatorUrl: null`
- Added `HEAD` support for `/docs` and `/openapi.yaml`

### Web (v2.1.8)

- Added a Swagger-specific CSP profile for `/api/docs` and `/api/docs/`
- Allowed `https://unpkg.com` scripts and styles only on the docs route
- Allowed the inline Swagger bootstrap script only on the docs route
- Relaxed `Cross-Origin-Embedder-Policy` only on the docs route so CDN assets can load successfully
- Left the stricter CSP/COEP profile unchanged for the rest of the application

### Breaking changes

None.

## v2.1.7 — Reporting Tab UI Redesign

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Replaces the two raw JSON textareas in the Operations Studio Reporting tab with a fully rendered dashboard. Practice Reporting now displays stat cards, proportional bar charts, a document-completion progress bar, an accounts-receivable aging grid, and a location-performance table. Platform Operations Summary now renders provisioning, impersonation, and data-export activity as stat pills and sortable tables, with a retention-policy grid at the bottom.

### Web (v2.1.7)

- Replaced `initReporting()` in `operations.js` with purpose-built rendering functions; the old `textarea.value = pretty(data)` pattern is gone
- Added `renderPracticeReport(summary)` — drives utilization stat cards (sessions, completed, remote rate, avg/counselor), referral-source bar chart, document-completion progress bar with pending/overdue counts, assessment-trends bar chart, AR aging cells with warn/danger color coding, outstanding-by-client table, and location-performance table
- Added `renderPlatformSummary(summary)` — drives provisioning stat pills + recent-tenants table, impersonation stat pills + recent-sessions table, data-exports stat pills + recent-exports table, and retention-policy grid
- Added `runPracticeReport()` — reads active `.rpt-window-btn` for day window, fetches `/v1/reporting/overview?days=N`, populates as-of timestamp
- Added `runPlatformSummary()` — fetches `/v1/platform/overview`, delegates to `renderPlatformSummary`
- Added JS helpers: `fmtMoney(cents)`, `fmtPct(ratio)`, `rptBars()`, `platStatPill()`, `statusBadgeHtml()`
- `initReporting()` now wires `.rpt-window-btn` preset toggling (same active-button-as-state-source pattern as Audit tab), Run Report → `runPracticeReport`, Refresh → `runPlatformSummary`
- All CSS classes reference existing definitions in `operations.html`; no new styles needed

### Breaking changes

None.

## v2.1.6 — Dashboard Metrics Correction

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Corrects the dashboard metric cards so they show live appointment and audit data instead of a miswired appointment-type count and a never-populated audit total. Before this change, the second card reported configuration depth (`Appointment Types`) instead of future workload, and the audit card displayed `0` because the frontend never issued an audit-summary request.

### Web (v2.1.6)

- Replaced `Appointment Types` with `Future Appointments` in the React dashboard metrics component
- Changed dashboard appointment metric sourcing from `/api/v1/appointment-types` to `/api/v1/appointments`
- `Today's Sessions` now counts current-day non-cancelled appointments
- `Future Appointments` now counts upcoming non-cancelled appointments
- Replaced placeholder metric badge copy with live, context-appropriate metadata tied to the underlying values
- Fixed the dashboard audit metric bug by fetching `GET /api/v1/audit/intelligence?days=7&limit=1` and reading `summary.total`
- Renamed the third card from `Audit Event Sync` to `Audit Events` so the label matches the displayed number
- Added role-aware audit metric messaging so non-admin users see `Admin visibility required` instead of a misleading silent zero state

### Breaking changes

None.

## v2.1.5 — Structured PHI-Safe API Logging

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Hardens the API logging layer so useful error and warning lines always reach operators as structured JSON without exposing request bodies, raw SQL, auth material, names, emails, or other PHI/PII-sensitive content.

### API (v2.1.5)

- Added shared structured API logger: `apps/api/src/lib/log.js`
- Added `x-request-id` correlation header generation/preservation on API responses
- Added structured startup, listen-failure, uncaught exception, and unhandled rejection logging
- Added structured `request.failed`, `request.complete`, and `request.slow` events with normalized route templates, status code, duration, tenant context, and actor role
- Added structured audit console output (`audit.event`) and audit failure logging (`audit.write_failed`)
- Sanitized error text before logging so obvious secrets, cookies, JWTs, bearer tokens, and email addresses are redacted
- Explicitly kept request/response bodies and raw SQL out of operational logs

### Standards and documentation

- Updated `PLANS/FULL-SECURITY-AND-AUDITING.md` with the canonical operational logging standard
- Updated `README.md` with the new API logging contract and validation notes

### Breaking changes

None.

## v2.1.4 — Audit Intelligence UI Redesign

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Replaces the two raw JSON textarea boxes in the Audit Intelligence tab of Operations Studio with a purpose-built investigation interface. No API changes — entirely a frontend improvement. Operators now have a filter bar, live stat cards, breakdown bar charts, and a formatted event log table instead of unreadable JSON blobs.

### Web (v2.1.4)

#### Filter bar (`operations.html`)

- Time window preset buttons replace the number input: **7 days**, **30 days**, **90 days** — active selection shown with filled indigo pill
- Result dropdown: All results / Success / Denied / Error
- Actor role dropdown pre-populated with all known system roles
- Free-text "action contains" search field; pressing Enter triggers the query
- All controls in a single card-style row above results

#### Summary stat cards (`operations.html`)

Four cards rendered after each query, each with a large count and a color-coded top border:

| Card | Color | Metric |
| --- | --- | --- |
| Total Events | Neutral | All events in window |
| Successful | Green | `result: success` count |
| Denied | Amber | Access / permission blocks |
| Errors | Red | Unexpected failures |

#### Breakdown charts (`operations.html`)

Two side-by-side cards with proportional horizontal bar charts:

- **Top Actions** (indigo) — up to 8 most frequent action codes with counts
- **By Actor Role** (purple) + **By Target Type** (cyan) — stacked in a single card; up to 8 rows each

All bars animate to width via CSS transition on render.

#### Event Log table (`operations.html`)

Full-width table replacing the events textarea:

| Column | Content |
| --- | --- |
| Dot | Color-coded glow dot — green (success), amber (denied), red (error) |
| Action | Monospace; module prefix highlighted indigo; result label in matching color below |
| Actor Role | Color-coded badge by role |
| Target | Target type + target ID in grey monospace |
| Tenant | Tenant ID in monospace |
| When | Relative ("3m ago") + full locale timestamp |

Description line under the card title narrates active filters. Count badge shows number of events returned.

#### Zero state (`operations.html`)

Centered search icon, "No events matched" heading, and a suggestion message replace the empty table when no results are returned.

#### Intro banner (`operations.html`)

Contextual paragraph at the tab top explains what is tracked and explicitly states no PHI or client names are stored — operators get context without reading documentation.

### JS (`operations.js`)

- `escapeHtml(str)` — XSS-safe rendering for all dynamic content
- `fmtRelTime(iso)` — relative time label (s / m / h / d ago)
- `fmtActionHtml(action)` — highlights module prefix of dot-notation action strings
- `roleBadgeClass(role)` — maps role strings to CSS badge modifier classes
- `runAuditQuery()` — decoupled from click handler; also wired to Enter key on action filter
- `renderAuditSummary(summary, days)` — drives stat cards and all bar charts
- `renderAuditEvents(events, days)` — drives event log table and zero state

### Breaking changes

None. No API changes. Existing `GET /v1/audit/intelligence` response shape is consumed directly.

---

## v2.1.3 — Deep Database Engine Monitoring

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Replaces the single DB health ping with a live, rich monitoring surface backed by MySQL internal status tables. The monitoring dashboard now shows connection counts, InnoDB buffer pool hit ratio, per-operation query breakdowns, throughput, slow-query alerting, and per-table row/size estimates alongside an animated SVG database-engine graphic.

### API (v2.1.3)

- Added `GET /v1/monitoring/db` — no-auth monitoring endpoint (same RBAC exemption as `/v1/telemetry/summary`)
- Queries `SHOW GLOBAL STATUS` for: `Uptime`, `Threads_connected`, `Threads_running`, `Max_used_connections`, `Questions`, `Slow_queries`, `Com_select/insert/update/delete`, `Innodb_buffer_pool_pages_total/free`, `Innodb_buffer_pool_read_requests/reads`, `Bytes_received/sent`
- Queries `SHOW GLOBAL VARIABLES` for: `max_connections`, `innodb_buffer_pool_size`
- Queries `information_schema.TABLES` for per-table row estimates and `data_length + index_length` storage sizes, scoped to `DB_NAME`
- Derives `bufferPool.hitRatio` as `(1 − reads/requests) × 100`
- Returns `{ mode: "unavailable" }` gracefully when `DB_NAME` is not set
- Route registered in `resolveRoute()` as `/v1/monitoring/db`

### Web (v2.1.3)

- Added **Database Engine** section in `apps/web/public/monitor.html` between Health Probes and Request Activity
- Animated SVG graphic: 3D cylinder with glowing cap, three staggered pulsing ground rings, animated data-stream from above, and three orbiting data packets (cyan 3.2 s, indigo 3.2 s half-offset, amber 2.1 s) — pure SVG SMIL, no external libraries
- Six metric tiles: Uptime, Connections (with running/max sub-line), Buffer Pool Hit %, Total Queries (S/I/U/D sub-line), Slow Queries (amber highlight when > 0), Throughput (human-readable bytes)
- Table Storage & Row Estimates pill grid: one card per table with name, row count estimate, and KB/MB size
- Added `fmtBytes()` and `fmtUptimeLong()` helpers to `apps/web/public/monitor.js`
- Added `updateDbPanel()` to drive all DB panel DOM updates with graceful fallback
- `/api/v1/monitoring/db` added as a fourth parallel fetch in `doRefresh()` `Promise.allSettled` call

### Breaking changes (v2.1.3)

None.

---

## v2.1.2 — Monitoring Foundation And OTEL Surface Coverage

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Adds the first full frontend monitoring foundation across visible application surfaces, expands the monitoring dashboard to consume per-surface telemetry, and formalizes the repo governance baseline for monitoring and security/auditing work.

### Governance and planning

- Added implementation record: `docs/MONITORING-AND-GOVERNANCE-FOUNDATION.md`
- Added canonical monitoring enforcement in `AGENTS.md`
- Added canonical security/auditing enforcement in `AGENTS.md`
- Added `PLANS/FULL-SECURITY-AND-AUDITING.md`
- Expanded `PLANS/FULL-SURFACE-MONITORING.md` with audit-intelligence monitoring obligations and audit-vs-telemetry separation rules

### API and telemetry

- Added structured frontend telemetry ingestion: `POST /v1/telemetry/events`
- Extended `GET /v1/telemetry/summary` with `overall`, `frontend`, `surfaces`, and health detail blocks
- Added OTEL-ready UI metric families for screen views, load time, active time, interaction latency, actions, validation failures, empty states, UI errors, and fetch failures
- Kept local monitoring available without OTEL export while preserving optional OTLP export support
- Corrected `exportedViaOtel` behavior so metrics-only OTLP configuration is treated as active export

### Web and monitoring

- Added shared surface registry and frontend telemetry helpers for React and standalone pages
- Instrumented app shell views, detail tabs, scheduling subviews, Workspace Studio tabs, and standalone pages
- Expanded the monitoring dashboard with overall UI summary, failing surface/workflow lists, health probe visibility, OTEL export status, and per-surface breakdown tables

### Breaking changes

None.

## v2.1.1 — AegisTrail Baseline Slice

**Date:** March 28, 2026
**Type:** Minor Release

### Overview

Introduces the first implementation slice of the AegisTrail security and auditing initiative: canonical standards, enforcement updates, and a privileged audit intelligence read path.

### Standards and governance

- Added canonical security and auditing standard document: `PLANS/FULL-SECURITY-AND-AUDITING.md`
- Updated `PLANS/FULL-SURFACE-MONITORING.md` to include audit intelligence monitoring obligations
- Updated `AGENTS.md` to require the canonical security plan for security/audit-related work

### API (v2.1.1)

- Added `GET /v1/audit/intelligence`
- Added bounded filters (`days`, `limit`, `action`, `actorRole`, `result`, optional `tenantId` for platform admin)
- Added aggregated summary outputs and recent event list for investigation workflows
- Added in-memory runtime audit event buffer for non-DB mode visibility

### Web (v2.1.1)

- Added **Audit Intelligence** tab in Operations Studio with filter controls, summary output, and recent-event output

### Breaking changes

None.

## v2.1.0 — ScheduleOps

**Date:** March 28, 2026
**Type:** Minor Release

### v2.1.0 Overview

Phase 4 of the scheduling roadmap — availability overrides, recurring appointment series, utilization reporting, and worker reminder lifecycle hardening.

### API

- `GET/POST/PATCH/DELETE /v1/scheduling/availability-overrides` — manage staff availability overrides (PTO, holidays, one-off openings); RBAC-gated to admin and scheduler roles
- `GET/POST/PATCH /v1/scheduling/series` — manage recurring appointment series with recurrence rules, status lifecycle, and counselor/client filters
- `GET /v1/scheduling/utilization` — appointment utilization summary by status, counselor, and location; restricted to `practice_owner`, `practice_admin`, `scheduler_biller`

### Web

- **Availability tab** (`AvailabilityOverridesPanel`): table of staff availability overrides with create/delete support; block vs. open override types; optional time range for partial-day overrides
- **Recurring tab** (`SeriesPanel`): list and create recurring appointment series; cancel series in place; filters by counselor and client
- **Utilization tab** (`UtilizationPanel`): date-range filter; stat cards for total count and per-status breakdown; per-counselor table; visible only to authorized roles

### Worker

- Added `expireStaleReminders()`: pending reminders still unsent > 24 h past their scheduled time are auto-marked `expired`, preventing stale entries from re-entering the poll window
- Added in-loop cancellation re-check guard in `processDueReminders()`: each reminder's status is re-fetched before dispatch to prevent a race between cancel and send
- Introduced `poll()` orchestrator that runs `processDueReminders` and `expireStaleReminders` concurrently on each interval

### Runtime

- Added graceful startup handling for `EADDRINUSE` in the API server so port collisions now fail with a direct remediation message instead of an unhandled Node error event
- Added `pnpm start:api:standalone` and `@faith/api start:standalone` to run the API on port `3104` for isolated local development
- Updated `start-api.sh` to load `.env` and respect an existing `PORT` override while defaulting to `3104`

### v2.1.0 Breaking Changes

None.

---

## v2.0.0 — Tenant-Model Update

**Date:** March 27, 2026
**Type:** Major Release

### v2.0.0 Overview

Hardened the full DB query layer to enforce tenant isolation on every domain. Stabilized smoke test suites (Step 11, Step 12, security regression) and resolved SQL timestamp, return-shape, and CORS preflight failures that blocked DB-mode operation.

### v2.0.0 Changes

- Normalized all SQL `TIMESTAMP` inserts to `YYYY-MM-DD HH:MM:SS` format across all query modules
- Fixed return-shape mismatches in `clinical.js` and `platform.js` query helpers to match the API contract
- Added `DEFAULT_ALLOWED_ORIGINS` in `security.js` to include Vite dev server ports (`5173`); env-defined origins now merge with defaults instead of replacing them
- Fixed `createAuditEvent` in `packages/domain` to auto-generate a UUID `id`, resolving `AUDIT_FAIL: Column 'id' cannot be null` on every audit write
- Added `docs/security/tenant-query-safety-checklist.md` with 7 required query rules and a grep-based CI gate design
- Verified all Step 11, Step 12, and security regression smokes green under DB mode

### v2.0.0 Breaking Changes

None — DB-mode query shapes are now correct and consistent with in-memory equivalents.

---

## v1.6.0 — Explicit Health Probes & OTEL Health Metrics

**Date:** March 27, 2026  
**Type:** Minor Release

### v1.6.0 Overview

Adds explicit API liveness/readiness endpoints and dedicated OpenTelemetry health metrics so infrastructure can distinguish process-up from dependency-ready.

### v1.6.0 Changes

- Added `GET /health/live`
- Added `GET /health/ready`
- Kept `GET /health` as the liveness-compatible endpoint
- Added OTEL metrics:
  - `faith.service.health_status`
  - `faith.service.dependency.health_status`
  - `faith.service.healthcheck.duration`
  - `faith.service.healthcheck.total`
- Added readiness health state into `/v1/telemetry/summary`
- Exposed new health routes through the public-route allowlist for probes

### v1.6.0 Breaking Changes

None.

## v1.0.0 — Production Release: Client Management Module

**Date:** March 24, 2026  
**Type:** Major Release

### v1.0.0 Overview

First production-ready release completing Phase 1 of the full client management suite. Implements comprehensive client CRUD operations with React UI components, audit logging, RBAC enforcement, and complete OpenAPI documentation.

### New API Endpoints

- `GET /v1/clients/{id}` — Retrieve single client with tenant scoping
- `DELETE /v1/clients/{id}` — Soft-delete (archive) client
- Enhanced `PATCH /v1/clients/{id}` — Full client update support

### New React Components

- `ClientForm.jsx` — Reusable form component for create/edit workflows
- `ClientModal.jsx` — Modal wrapper for form presentation
- Enhanced `WorkspaceGrid.jsx` — Integrated add/edit/delete UI

### UI Features

- "New Client" button in Clients panel
- Edit and delete buttons on each client row
- Real-time client list refresh after mutations
- Loading, error, and empty states
- Form validation and error handling

### Documentation

- Updated OpenAPI spec (`docs/api/openapi.yaml`) with full `/v1/clients/{id}` operations
- Comprehensive release notes (`docs/RELEASE_1.0.0.md`)
- Updated README.md with v1.0.0 status
- All package.json files bumped to 1.0.0

### Files Modified

- `apps/api/src/index.js` — Enhanced handleClientById()
- `apps/web/src/components/ClientForm.jsx` — New
- `apps/web/src/components/ClientModal.jsx` — New
- `apps/web/src/components/WorkspaceGrid.jsx` — Enhanced
- `apps/web/src/App.jsx` — Added refresh state management
- `docs/api/openapi.yaml` — Added /v1/clients/{id} paths
- `README.md` — Updated version and release notes
- `package.json` (all) — Bumped to 1.0.0

### v1.0.0 Breaking Changes

None — fully backward compatible.

### Performance

- <100ms API response time for client operations
- Efficient client list refresh via state triggers
- Client-side validation prevents unnecessary API calls

### Security

- Tenant-scoped access enforcement on all endpoints
- RBAC checks (admin-only for delete)
- Audit logging for all client operations
- Soft-delete pattern preserves data integrity

For detailed release notes, see `docs/RELEASE_1.0.0.md`.

---

## Step 10 — Christian Counseling Differentiation

### Step 10 Files

- `apps/api/src/index.js`
- `apps/web/public/index.html`
- `apps/web/src/app.js`
- `ops/step10-smoke.mjs`

### Step 10 Summary

- Added `/v1/faith/*` endpoints for note templates, treatment goals, consent variants, resources, inventories, referral coordination, and language preferences.
- Added the **Faith Workflows** tab in Operations Studio and wired all create/save actions.
- Added smoke coverage for happy paths and client-role guard behavior.

## Step 11 — Reporting and Platform Operations

### Step 11 Files

- `apps/api/src/index.js`
- `apps/web/public/index.html`
- `apps/web/src/app.js`
- `ops/step11-smoke.mjs`
- `docs/change-log.md`

### Step 11 Summary

- Added reporting API: `/v1/reporting/overview` with utilization, counselor productivity, referral sources, document completion, assessment trends, A/R, and location performance.
- Added platform ops APIs:
  - `/v1/platform/overview`
  - `/v1/platform/tenant-provisioning`
  - `/v1/platform/impersonation-sessions`
  - `/v1/platform/data-exports`
  - `/v1/platform/retention-policies`
- Added strict platform-admin checks for tenant provisioning and impersonation sessions.
- Added **Reporting & Ops** tab in the web app with refresh/actions for reporting, provisioning, impersonation, exports, and retention policy updates.
- Added Step 11 smoke script for endpoint + guard verification.

## How to Track Current Changes

- List changed files: `git status --short`
- Inspect full diff: `git diff`
- Inspect a file diff: `git diff -- apps/api/src/index.js`
- Run latest smoke script: `node ops/step11-smoke.mjs`

## Step 12 — Hardening, UX, and Validation

### Step 12 Files

- `apps/api/src/index.js`
- `apps/api/src/lib/http.js`
- `apps/api/src/lib/security.js`
- `apps/web/build.js`
- `apps/web/public/index.html`
- `apps/web/public/styles.css`
- `apps/web/src/app.js`
- `ops/step12-validate.mjs`
- `package.json`

### Step 12 Summary

- Hardened request handling with explicit malformed JSON and payload-size responses.
- Expanded local CORS allowlist for the current web port and prevented API response caching.
- Fixed the web build script to resolve paths correctly from the repository root.
- Improved UI accessibility and UX with keyboard tab navigation, role-aware tab visibility, better live status messaging, textarea styling, and reduced-motion support.
- Added Step 12 workflow validation covering tenant isolation, security checks, and end-to-end flows across lifecycle, documents, billing, portal, faith workflows, reporting, and platform operations.
- Added Playwright coverage for highest-value browser journeys plus launch-readiness accessibility and performance audits.
- Added a dedicated RBAC and tenant-isolation regression script and tightened client-role access so non-portal reads are blocked centrally.
