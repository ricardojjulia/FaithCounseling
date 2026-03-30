# Faith Counseling

Christian counseling practice management SaaS for solo counselors, group practices, and multi-location clinics.

## At a Glance

- Version: `4.7.0`
- Status: `Beta Ready`
- Release summary: [docs/v4.7.0-RELEASE-SUMMARY.md](docs/v4.7.0-RELEASE-SUMMARY.md)
- Operations Dashboard summary: [docs/OPERATIONS-DASHBOARD-UPGRADE-SUMMARY.md](docs/OPERATIONS-DASHBOARD-UPGRADE-SUMMARY.md)
- Change log: [docs/change-log.md](docs/change-log.md)
- Spanish translation report: [docs/TRANSLATION-GUARDIAN-ES-RUN-2026-03-30.md](docs/TRANSLATION-GUARDIAN-ES-RUN-2026-03-30.md)

## What This Includes

- practice operations workspace for counselors, managers, and admins
- upgraded Operations Dashboard with counselor workload, 1-hour gap visibility, compliance note-gap tracking, portal request rollups, operational alert thresholds, and 7-day trend visibility
- dashboard drill-down workflows that open the affected client, document, scheduling, and portal-review queues directly from summary metrics
- scheduling with appointments, waitlist, reminders, recurring workflows, and utilization support
- client and counselor management with richer portal, profile, and operational views
- authenticated client portal with onboarding, documents, uploads, data rights, counselor, financial, and resources surfaces
- electronic documents library with 39 forms spanning intake, consent, assessment, treatment planning, worksheets, and faith-integrated tools
- monitoring, audit, security, and launch-readiness coverage across the main visible surfaces

## Current Release Focus

The current build adds a real Operations Dashboard summary for staff and makes those metrics actionable. Today’s Schedule shows counselor workload and remaining 1-hour gaps, Priority Queue is driven by a real high-touchpoint client flag, Compliance Watch tracks unresolved note gaps and incomplete assigned work, and the Clients card focuses on totals, unscheduled clients, and portal request statuses. Staff can now drill straight into those queues from the dashboard, the dashboard raises alerts when thresholds are crossed for unscheduled high-touchpoint clients, documentation backlog, exhausted counselor capacity, or portal backlog growth, and the new 7-day trend section shows whether utilization, note gaps, portal flow, and unscheduled-client backlog are improving or worsening.

## Key Docs

- Release summary: [docs/v4.7.0-RELEASE-SUMMARY.md](docs/v4.7.0-RELEASE-SUMMARY.md)
- Operations Dashboard summary: [docs/OPERATIONS-DASHBOARD-UPGRADE-SUMMARY.md](docs/OPERATIONS-DASHBOARD-UPGRADE-SUMMARY.md)
- Operations Dashboard implementation log: [docs/OPERATIONS-DASHBOARD-IMPLEMENTATION-LOG-2026-03-30.md](docs/OPERATIONS-DASHBOARD-IMPLEMENTATION-LOG-2026-03-30.md)
- Spanish translation report: [docs/TRANSLATION-GUARDIAN-ES-RUN-2026-03-30.md](docs/TRANSLATION-GUARDIAN-ES-RUN-2026-03-30.md)
- Operations Dashboard plan: [PLANS/OPERATIONS-DASHBOARD-UPGRADE.md](PLANS/OPERATIONS-DASHBOARD-UPGRADE.md)
- Form library plan: [PLANS/FORM-LIBRARY-EXPANSION.md](PLANS/FORM-LIBRARY-EXPANSION.md)
- Portal plan: [PLANS/CLIENT-PORTAL-EXPANSION.md](PLANS/CLIENT-PORTAL-EXPANSION.md)
- Monitoring baseline: [PLANS/FULL-SURFACE-MONITORING.md](PLANS/FULL-SURFACE-MONITORING.md)
- Security baseline: [PLANS/FULL-SECURITY-AND-AUDITING.md](PLANS/FULL-SECURITY-AND-AUDITING.md)

## Translation Guardian Agent

The translation quality/safety agent is available at `agents/translation_guardian`.

Latest Spanish findings and remediation report:

- [docs/TRANSLATION-GUARDIAN-ES-RUN-2026-03-30.md](docs/TRANSLATION-GUARDIAN-ES-RUN-2026-03-30.md)

Quick run from repo root:

```bash
pnpm agent:translation:build
pnpm agent:translation:run
```

The service listens on `http://127.0.0.1:8098` by default.

## v4.7.0 — Expanded Counseling Form Library (March 29, 2026)

### v4.7.0 Overview

This release expands the electronic Documents library from a screening-heavy catalog into a fuller counseling toolkit. The shared browser-based form engine now serves intake and consent paperwork, deeper assessments, treatment-planning templates, therapeutic worksheets, and additional Christian counseling reflection forms without introducing a second document system.

The library now ships with 39 total forms. New additions include informed consent, telehealth consent, ROI authorization, biopsychosocial assessment, MSE, safety planning, treatment planning, SMART goals, relapse prevention, CBT and grounding worksheets, mindfulness logs, and expanded faith-history and biblical-identity tools.

### v4.7.0 — What Changed

- Added 20 new form definitions in grouped modules:
  - `apps/web/src/components/Documents/forms/AdministrativeForms.js`
  - `apps/web/src/components/Documents/forms/ClinicalFoundationForms.js`
  - `apps/web/src/components/Documents/forms/TreatmentPlanningForms.js`
  - `apps/web/src/components/Documents/forms/TherapeuticWorksheets.js`
  - `apps/web/src/components/Documents/forms/FaithCounselingForms.js`
- Added a documented rollout spec at `PLANS/FORM-LIBRARY-EXPANSION.md`
- Expanded the shared Documents registry with new categories:
  - `administrative`
  - `assessment`
  - `treatment`
  - `worksheets`
- Updated the Documents page copy so it reflects the broader library scope instead of only intake and assessments
- Expanded the API default form catalog so the new forms are available to staff workflows and signup-default selection logic where appropriate
- Added browser regression coverage for opening one of the new consent forms from the real Documents UI

### v4.7.0 — Validation

- `pnpm lint`
- `pnpm --filter @faith/web build`
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "practice admin can access the expanded documents library and open a new consent form"`

## v4.6.0 — CRITICAL FIX: Complete Logout Session Invalidation (March 29, 2026)

### v4.6.0 Overview

This is a critical logout hardening release for the completed client portal work. It closes the session-restoration gap where a browser refresh could pick the user session back up after sign-out if stale auth cookies or active session rows remained.

The server now clears both staff and portal auth cookies with explicit expiry, revokes all active sessions for the authenticated account on logout, and clears the opposite auth cookie on login so refresh or role switching cannot silently restore a session.
The browser sign-out path now also sends the required CSRF header, and the web proxy preserves separate auth `Set-Cookie` headers so the real topbar `Sign out` action cannot leave a recoverable session behind.

### v4.6.0 — Validation

- `pnpm lint`
- raw auth verification:
  - login clears the opposite auth cookie
  - logout clears both auth cookies
  - `GET /v1/auth/me` returns `401` immediately after logout
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs --grep "shared sign-in gate links new clients into the portal create-account flow|sign out fully invalidates the browser session after refresh"`

## v4.5.0 — Final Portal Signoff + Agent Validation (March 29, 2026)

### v4.5.0 Overview

This is a stabilization release for the completed client portal work. It records the final security, triage, and repair sweeps, plus the repo-native validation pass that confirmed the portal build is stable, localized, and ready for release.

The shared sign-in surface now also exposes direct portal entry actions for `Create account`, `Request care`, and `Get scheduled`, and routes those links into the matching `/portal` onboarding intent.

### v4.5.0 — Validation

- `pnpm lint`
- `node --env-file=.env apps/api/src/db/migrate.js`
- `pnpm --filter @faith/web build`
- `pnpm test:e2e` — passed (`5/5`)
- `pnpm test:launch-readiness` — passed (`3/3`)
- `npx playwright test tests/e2e/localization.spec.mjs` — passed (`4 passed, 2 skipped`)
- `API_BASE_URL=http://127.0.0.1:3104 pnpm test:security` — passed after aligning the security-regression public request fixture with current consent requirements
- Final agent-run report: [docs/AGENT-RUN-2026-03-29.md](docs/AGENT-RUN-2026-03-29.md)

## v4.0.0 — Client Portal Completion + Public Onboarding (March 29, 2026)

### v4.0.0 Overview

This release completes the planned client-portal core. The public `/portal` experience now supports structured onboarding intake, practice-configured default form visibility, counselor directory preview, and server-controlled instant activation for create-account flows when a practice enables it. The authenticated portal now closes the remaining self-service gaps around documents, uploads, data rights, counselor visibility, finances, and localized client navigation.

### v4.0.0 — Public Portal and Onboarding

- Extended `/v1/portal/public-config` to return:
  - registration summary
  - default signup form preview
  - public counselor directory preview when enabled
- Added structured onboarding capture to public portal requests, including:
  - preferred name
  - pronouns
  - education level
  - affiliations
  - referral source
  - faith preference
  - scheduling focus
  - explicit contact consent
- Added encrypted `onboarding_details_enc` persistence for portal registration requests.
- Added server-controlled instant activation for eligible `account_signup` flows:
  - creates a client record
  - provisions a real portal account
  - bootstraps a portal profile
  - auto-assigns configured signup forms
- Workspace Studio public-request review can now approve a create-account request into an active portal account and returns the temporary invitation password in the admin response.

### v4.0.0 — Authenticated Client Portal

- Completed the client portal shell with localized tabs for:
  - dashboard
  - profile
  - appointments
  - documents
  - counselor
  - financials
  - resources
  - data rights
- Localized the portal sign-in password-reset flow and the core client-portal headings/buttons for Spanish locale switching.
- Expanded the public and authenticated portal to preserve PHI/PII safeguards while exposing only client-safe counselor previews and published resources.

### v4.0.0 — Validation

- `pnpm lint`
- `node --env-file=.env apps/api/src/db/migrate.js`
- `pnpm --filter @faith/web build`
- `pnpm test:e2e` — passed (`5/5`)
- `pnpm test:launch-readiness` — passed (`3/3`)
- `npx playwright test tests/e2e/localization.spec.mjs` — passed (`4 passed, 2 skipped`)
- `API_BASE_URL=http://127.0.0.1:3104 pnpm test:security` — passed

## v3.5.0 — Authenticated Client Portal Access + Self-Service Foundation (March 29, 2026)

### v3.5.0 Overview

This release moves the portal from staff preview into real client authentication. Portal accounts can now sign in through the shared auth surface, land directly in the authenticated client portal, manage profile/preferences, and submit appointment requests against tenant-scoped data in DB mode.

### v3.5.0 — Identity and Session Layer

- Added dedicated portal-account credential support with hashed passwords, failed-attempt tracking, and lockout handling.
- Added `portal_sessions` persistence and `portal_session` cookie handling for authenticated client users.
- Extended `/v1/auth/login`, `/v1/auth/logout`, and `/v1/auth/me` to support real portal-client sessions alongside staff sessions.
- Added development migration/backfill support so the seeded portal client account is available outside first-run bootstrap scenarios.
- Workspace Studio portal-account creation now generates and returns a one-time temporary password for secure invitation handoff.

### v3.5.0 — Client Portal Experience

- The main app now routes authenticated `client` users directly to the `portal` surface after sign-in and session restore.
- Client navigation is restricted to `portal`, `about`, and `monitor`.
- Added authenticated client dashboard coverage for:
  - next appointment summary
  - pending forms/documents summary
  - assigned counselor preview
  - resource preview
  - balance or voluntary-offering summary
- Added client-owned `GET/PATCH /v1/portal/profile` usage in the authenticated portal UI for:
  - preferred name
  - contact email
  - contact phone
  - contact preferences
  - demographics
  - education
  - affiliations
- Added client appointment-request composition and history in the authenticated portal.
- Added Playwright coverage for both admin preview and real portal-client sign-in flows.

### v3.5.0 — Validation

- `node --env-file=.env apps/api/src/db/migrate.js`
- `pnpm lint`
- `pnpm --filter @faith/web build`
- `pnpm test:e2e` — passed (`5/5`)
- `pnpm test:launch-readiness` — passed (`3/3`)

### v3.5.0 Breaking Changes

None. The portal auth work is additive and preserves the existing staff-preview path for admins.

## v3.0.7 — Full-Surface Localization Pass 2 + Playwright Regression Coverage (April 2026)

### v3.0.7 Overview

This release completes Spanish localization across all deeper application surfaces — client detail, counselor detail, and Workspace Studio — and adds a dedicated Playwright localization regression spec that guards against i18n key regressions on CI.

### v3.0.7 — Localization

**Newly localized surfaces (second pass):**

- `ClientDetailPage.jsx` — loading state, error message, back button
- `ClientDetailHeader.jsx` — action buttons, DOB / ID / pronouns labels, status badge
- `ClientDetailTabs.jsx` — all 7 clinical detail tabs converted to `labelKey` pattern
- `CounselorDetailPage.jsx` — loading state, error message, back button
- `CounselorDetailHeader.jsx` — back button, role badge, license / supervision / ID labels
- `CounselorDetailTabs.jsx` — all 7 counselor profile tabs converted to `labelKey` pattern
- `WorkspaceStudioPage.jsx` — title, all 10 studio tab labels, tab placeholder text

**Catalog additions:**

- 54 new EN keys added to `packages/i18n/src/index.js` across six groups:
  `role.*`, `clientDetail.*`, `counselorDetail.*`, `client.tab.*`, `counselor.tab.*`, `studio.*`
- 54 matching Spanish translations added to `apps/api/data/i18n/es.json`

**Bug fixes during this pass:**

- Fixed variable-shadowing in `WorkspaceStudioPage.jsx` where the `.map((t) => …)` parameter collided with the `t()` i18n function, causing tab labels to resolve incorrectly.
- Unified studio tab label rendering — removed a `documentsStudio` special case so all tabs use the same `t(tab.labelKey)` path.

### v3.0.7 — Playwright Regression Coverage

- Added `tests/e2e/localization.spec.mjs` — dedicated localization regression spec with four test suites:
  - Dashboard: sidebar nav labels change after locale switch; no raw keys visible.
  - Client detail: tab labels resolve correctly in EN; switch to Spanish produces translated labels; no raw keys appear.
  - Counselor detail: same guard as client detail.
  - Workspace Studio: title and all tab labels resolve; locale switch produces Spanish labels; no raw keys appear.
- Updated `tests/e2e/helpers.mjs` — `openPrimaryNav` is now bilingual-resilient, matching both `[aria-label="Toggle navigation"]` and `[aria-label="Alternar navegacion"]`.
- Relaxed 8 English-only string assertions in `tests/e2e/high-value-journeys.spec.mjs` to bilingual regex patterns (`/English|Spanish/i`).

### v3.0.7 — Agent Catalog

- Copied `agents/translation_guardian/` into `.github/agents/translation_guardian/` — the canonical location for all repo agents.
- Added Translation Guardian entry to `.github/agents/README.md`.

### v3.0.7 — Validation

- `pnpm --filter @faith/web build` — passed, 1263 modules, no errors
- `npx playwright test tests/e2e/localization.spec.mjs` — 3 passed, 2 skipped (client/counselor detail skip without seeded records)
- `npx playwright test tests/e2e/high-value-journeys.spec.mjs` — 3 passed

### v3.0.7 Breaking Changes

None. All new i18n keys fall back to English strings when a locale override is absent.

## v3.0.6 — Maintenance Release: Lint Cleanup, Docs Refresh, and Build Sync (March 2026)

### v3.0.6 Overview

This maintenance revision consolidates the recent Workspace Studio repair work into the public docs, clears the remaining markdown lint issues in the repo-visible reporting surfaces, and refreshes the tracked web build output so committed assets match the current application source.

### v3.0.6 — Documentation

- Updated `README.md` to reflect the new release and maintenance scope.
- Added and normalized `docs/FUNCTIONAL-TESTING.md` as the detailed functional validation report for:
  - launch-readiness fixes
  - telemetry/CSRF repair
  - Workspace Studio form-assignment recovery
- Added inclusive-smoke coverage documentation in `docs/FUNCTIONAL-TESTING.md` for:
  - keyboard-first auth verification
  - public monitoring landmark validation
  - portal feedback-state validation
  - mobile viewport usability checks
- Added security hardening for:
  - admin-only access to database diagnostics at `/v1/monitoring/db`
  - public portal request creation ignoring caller-supplied tenant and internal status fields
  - admin-only access to `/v1/telemetry/summary`
  - encrypted-at-rest staff login email and tenant-provisioning owner email with migration-backed lookup support
  - canonical audit ledger fields persisted in DB mode
- Added dated security run documentation:
  - `docs/SECURITY-RUN-2026-03-28.md`
- Added release artifacts:
  - `docs/RELEASE_3.0.6.md`
  - `docs/v3.0.6-RELEASE-SUMMARY.md`

### v3.0.6 — Lint and Repo Hygiene

- Removed remaining markdown diagnostics from repo-visible documentation surfaces.
- Normalized generated Playwright markdown outputs that were still surfacing editor lint warnings.
- Updated `.gitignore` so transient `test-results` folders and local Claude settings do not reintroduce noise into the working tree.

### v3.0.6 — Build Artifact Sync

- Rebuilt the web app and refreshed tracked files under `apps/web/public/assets`.
- Removed stale hashed asset generations so committed build output reflects the current Vite bundle set referenced by `apps/web/public/index.html`.

### v3.0.6 — Validation

- `pnpm lint`
- `pnpm --filter @faith/web build`
- `npx playwright test tests/e2e/inclusive-smoke.spec.mjs`

### v3.0.6 Breaking Changes

None. This release is a maintenance and packaging revision.

## v3.0.5 — Workspace Studio Documents/Portal Workflow Completion (March 2026)

### v3.0.5 Overview

This minor revision completes the operational workflow for Workspace Studio Documents & Inventories and Portal account onboarding.

The system now supports assigning one or more forms to a selected client, scheduling assignments for next session, future sessions, or recurring cadence, persisting repeated submissions over time for progress tracking, and showing prior completion history on the same screen.

The Portal area now supports standard-on-signup form auto-assignment and includes a public `/portal` entry page for existing and prospective clients.

### v3.0.5 — New Planning Artifact

- Added canonical implementation plan:
  - `PLANS/WORKSPACE-STUDIO-FORMS-PORTAL-WORKFLOW.md`

### v3.0.5 — Backend Data Model

Added new schema tables in `apps/api/src/db/schema.sql`:

- `form_catalog`
  - tenant-scoped catalog of available forms
  - includes `is_standard_on_signup` and active/version fields
- `form_assignments`
  - counselor assignment records with assignment type and schedule metadata
  - supports `next_session`, `future_session`, `scheduled_recurring`, and `account_signup`
- `form_submissions`
  - append-only form completion records
  - includes `submission_version` for repeated completions
  - stores response payload encrypted (`responses_enc`)
- `portal_registration_requests`
  - stores public prospective-client account requests

### v3.0.5 — Backend Query/API Layer

- Added new DB query module:
  - `apps/api/src/db/queries/formWorkflows.js`

- Extended API in `apps/api/src/index.js` with:
  - `GET/POST/PATCH /v1/forms/catalog`
  - `GET/POST/PATCH /v1/forms/assignments`
  - `GET/POST /v1/forms/submissions`
  - `GET /v1/forms/client-overview`
  - `GET/POST /v1/portal/public-requests`

- Added automatic standard-form assignment during portal account creation:
  - when portal account is created, active catalog forms flagged `is_standard_on_signup = true` are auto-assigned to the client

### v3.0.5 — Workspace Studio UI

- Added new operational tab content:
  - `apps/web/src/components/WorkspaceStudio/tabs/DocumentsStudioTab.jsx`

Features:

- Client picker for assignment scope
- Form assignment composer (multi-form support via repeated assignment actions)
- Timing controls for next session, future session, and recurring schedule
- Assignment table with status and launch action
- Completed-history table with submission count, latest version, last submitted timestamp, and latest score summary
- Integrated form completion save flow to persist submissions

- Wired into Workspace Studio shell:
  - `apps/web/src/components/WorkspaceStudio/WorkspaceStudioPage.jsx`

### v3.0.5 — Form Runtime Integration

- Updated `apps/web/src/components/Documents/FormRunner.jsx`:
  - Added completion callback support (`onComplete`)
  - Added score-summary extraction helper so persisted submissions include score metadata when available
  - Maintains existing print behavior when no callback is provided

- Added shared forms registry module:
  - `apps/web/src/components/Documents/formRegistry.js`

- Updated `apps/web/src/components/Documents/DocumentsPage.jsx`:
  - Refactored to consume shared registry constants

### v3.0.5 — Portal Public Access

- Added public portal page and script:
  - `apps/web/public/portal.html`
  - `apps/web/public/portal.js`

- Added `/portal` static route mapping:
  - `apps/web/server.js`

- Added portal tab entry-point notice/button:
  - `apps/web/src/components/WorkspaceStudio/tabs/PortalTab.jsx`

### v3.0.5 — Validation

- Web build validated successfully (`pnpm --filter @faith/web build`)
- API syntax validated successfully (`pnpm --filter @faith/api exec node --check src/index.js`)

### v3.0.5 Breaking Changes

None. Changes are additive and backward-compatible with existing documents/forms workflows.

## v3.0.0 — Expanded Clinical Forms Library (March 2026)

### v3.0.0 Overview

This major release expands the FaithCounseling clinical forms library from **4 instruments** to **19 instruments**, adding 15 new validated clinical assessments and custom faith-based counseling tools. The Documents UI has been redesigned from a flat grid to a **category-grouped library** organized across 14 clinical domains.

All new forms follow the form definition schema established in v2.2.0. The generic `FormRunner` renderer required **zero changes** — every new instrument is delivered as a standalone data definition file, validating the extensibility of the v2.2.0 architecture. Every form includes a **Faith Dimension** section with Scripture references and questions about how the presenting concern intersects with the client's relationship with God.

---

### v3.0.0 — Validated Clinical Instruments (10 new forms)

#### PHQ-9 — Patient Health Questionnaire-9

**File:** `apps/web/src/components/Documents/forms/PHQ9.js` · **Scoring:** 0–27 · **Time:** ~5 min
**Reference:** Kroenke K, Spitzer RL, Williams JBW. *J Gen Intern Med* 2001;16:606–13.
Gold-standard 9-item depression screener. Nine frequency items (0–3 each). Bands: 0–4 Minimal, 5–9 Mild, 10–14 Moderate, 15–19 Moderately Severe, 20–27 Severe. Item 9 (thoughts of self-harm) triggers a counselor follow-up alert at any non-zero response. Faith Dimension explores connection with God, impact of depression on prayer and worship, hope anchored in faith, and comforting Scriptures.

#### Beck Anxiety Inventory (BAI)

**File:** `apps/web/src/components/Documents/forms/BeckAnxietyInventory.js` · **Scoring:** 0–63 · **Time:** ~7 min
**Reference:** Beck AT, Epstein N, Brown G, Steer RA. *J Consult Clin Psychol* 1988;56:893–897.
21 somatic and cognitive anxiety symptoms rated 0–3 over the past week. Bands: 0–7 Minimal, 8–15 Mild, 16–25 Moderate, 26–63 Severe. Faith Dimension grounded in Philippians 4:6–7 and 1 Peter 5:7.

#### PCL-5 — PTSD Checklist for DSM-5

**File:** `apps/web/src/components/Documents/forms/PCL5.js` · **Scoring:** 0–80 · **Time:** ~10 min
**Reference:** Weathers FW, et al. (2013). National Center for PTSD.
20-item PTSD symptom checklist anchored to a client-identified stressful event. Items rated 0–4. Cutpoint ≥ 33 suggests probable PTSD. Faith Dimension covers lament theology (Psalms 22, 88; Lamentations; Job), anger at God, and integration of Christian hope in trauma recovery.

#### Rosenberg Self-Esteem Scale (RSES)

**File:** `apps/web/src/components/Documents/forms/RosenbergSelfEsteem.js` · **Scoring:** 0–30 · **Time:** ~5 min
**Reference:** Rosenberg M. Princeton University Press, 1965.
10-item global self-esteem measure. Five items are reverse-scored — reversal is encoded in option values (RSES\_NEG uses SA=0, A=1, D=2, SD=3) so the standard `scoreFields` sum works without post-processing. Bands: < 15 Low, 15–24 Normal, 25–30 High. Faith Dimension anchored in *imago Dei* (Gen. 1:27) and identity as a beloved child of God (1 John 3:1).

#### ASRS v1.1 — Adult ADHD Self-Report Scale

**File:** `apps/web/src/components/Documents/forms/ASRSv1.js` · **Scoring:** threshold-based · **Time:** ~8 min
**Reference:** World Health Organization / Kessler RC, et al. (2003).
18-item ADHD screener. Part A (6 items) is the primary screen; positive if ≥ 2 for items 1–4, ≥ 3 for items 5–6. Four or more Part A positives suggests likely ADHD. Uses `scoreInterpretation(answers)` pattern. Faith Dimension explores ADHD-related shame in faith contexts and God-given cognitive design.

#### OCI-R — Obsessive-Compulsive Inventory Revised

**File:** `apps/web/src/components/Documents/forms/OCIRevised.js` · **Scoring:** 0–72 · **Time:** ~7 min
**Reference:** Foa EB, et al. *Psychol Assess* 2002;14(4):485–96.
18-item OCD measure across six subscales (washing, checking, ordering, obsessing, hoarding, neutralizing). Items rated 0–4. Clinical cutpoint ≥ 21. Faith Dimension includes dedicated coverage of **scrupulosity** — religious OCD involving obsessive guilt, compulsive confession, and inability to receive God's grace.

#### AUDIT — Alcohol Use Disorders Identification Test

**File:** `apps/web/src/components/Documents/forms/AUDIT.js` · **Scoring:** 0–40 · **Time:** ~5 min
**Reference:** Babor TF, et al. WHO Publication No. 01.6a, 2001.
10-item WHO alcohol screening. Items 1–8 use 0–4 scale; items 9–10 use 0/2/4 scale and use `gad_scale` type with values `'0'`, `'2'`, `'4'` so standard `parseInt()` summation works correctly. Bands: 0–7 Low Risk, 8–15 Hazardous, 16–19 Harmful, ≥ 20 Likely Dependence. Faith Dimension references Ephesians 5:18 and 1 Corinthians 6:19–20.

#### DASS-21 — Depression Anxiety Stress Scales

**File:** `apps/web/src/components/Documents/forms/DASS21.js` · **Scoring:** 3 subscales · **Time:** ~8 min
**Reference:** Lovibond PF, Lovibond SH. *Behav Res Ther* 1995;33(3):335–43.
21-item tripartite measure yielding Depression, Anxiety, and Stress subscores. Uses `scoreInterpretation(answers)` pattern with dedicated subscale item arrays. ScoreBanner displays all three severity levels; banner color reflects the most elevated subscale.

#### ACE Questionnaire — Adverse Childhood Experiences

**File:** `apps/web/src/components/Documents/forms/ACEQuestionnaire.js` · **Scoring:** 0–10 count · **Time:** ~10 min
**Reference:** Felitti VJ, Anda RF, et al. *Am J Prev Med* 1998;14(4):245–258.
10-category childhood adversity screener (yes/no). Uses `scoreInterpretation(answers)` counting `'Yes'` values. Bands: 0 None, 1 Low-Moderate, 2–3 Moderate, 4–5 High, ≥ 6 Very High Risk. Covers physical, emotional, and sexual abuse; physical and emotional neglect; and five household dysfunction categories. Faith Dimension covers healing from childhood wounds and the role of the "Father to the fatherless" (Psalm 68:5).

#### Insomnia Severity Index (ISI)

**File:** `apps/web/src/components/Documents/forms/InsomniaSeverityIndex.js` · **Scoring:** 0–28 · **Time:** ~5 min
**Reference:** Morin CM. Guilford Press, 1993. Morin CM, et al. *Sleep* 2011;34(5):601–608.
7-item validated insomnia screener. Item 2 is reverse-scored (satisfaction → dissatisfaction). Bands: 0–7 None, 8–14 Subthreshold, 15–21 Moderate Clinical, 22–28 Severe Clinical. Faith Dimension grounded in Psalm 127:2 and explores Sabbath rhythms, surrender to God, and nighttime prayer practices.

---

### v3.0.0 — Custom Faith-Based Assessments (5 new forms)

#### Couples & Relationship Assessment

**File:** `apps/web/src/components/Documents/forms/CouplesAssessment.js` · **Unscored** · **Time:** ~20 min
Five-section couples counseling assessment. Covers relationship duration and history, Gottman-informed communication patterns (the Four Horsemen), conflict intensity and repair capacity, trust and safety, physical and emotional intimacy, love languages, and a Faith & Marriage section covering shared practice, marital theology (Eph. 5:21–33), and vision for a Kingdom-centered marriage.

#### Grief & Loss Assessment

**File:** `apps/web/src/components/Documents/forms/GriefAssessment.js` · **Unscored** · **Time:** ~20 min
Four-section grief assessment grounded in Worden's Tasks of Mourning and biblical lament theology. Covers all loss types (death, divorce, health loss, miscarriage, estrangement, career). Includes DSM-5-informed complicated grief indicators. Faith & Lament section covers anger at God, the practice of lament (Ps. 22, 88; Lamentations; Job), resurrection hope, and faith community support.

#### Ministry & Caregiver Burnout Assessment

**File:** `apps/web/src/components/Documents/forms/BurnoutAssessment.js` · **Unscored** · **Time:** ~15 min
Five-section burnout assessment for pastors, missionaries, counselors, healthcare workers, and family caregivers. Based on Maslach Burnout Inventory dimensions: Emotional Exhaustion, Depersonalization/Cynicism, Reduced Personal Accomplishment. Faith & Sustainability section explores calling, spiritual intimacy vs. duty-driven ministry, rest theology, Sabbath rhythms, and experiencing God's acceptance apart from performance. Rooted in Matthew 11:28.

#### Spiritual Wellness Inventory

**File:** `apps/web/src/components/Documents/forms/SpiritualWellnessInventory.js` · **Unscored** · **Time:** ~20 min
Four-section comprehensive spiritual health inventory spanning spiritual practices (prayer quality, Bible engagement, disciplines, personal barriers), core beliefs and theology (God's character and nearness, grace reception, theological doubts), community and accountability (church belonging, small group, spiritual direction, church wounds/spiritual abuse), and spiritual growth (current season, areas of struggle, habitual sin patterns, identity in Christ, and what God may be inviting the client into).

#### Family Systems Assessment

**File:** `apps/web/src/components/Documents/forms/FamilySystemsAssessment.js` · **Unscored** · **Time:** ~25 min
Four-section family systems assessment grounded in Bowen Family Systems Theory and biblical family theology. Covers family composition and genogram patterns, emotional climate and attachment style (secure, anxious, avoidant, disorganized), family roles (scapegoat, peacemaker, parentified child, hero, mascot, etc.), triangulation and differentiation of self, significant cut-offs, faith transmission, and identifying generational redemption.

---

### v3.0.0 — Documents Library UI

`DocumentsPage.jsx` redesigned from a flat card grid to a **category-grouped library**:

| Icon | Category | Forms |
| ------ | ---------- | ------- |
| 📋 | Intake Forms | Short Intake, Long Intake |
| 🌧️ | Depression | PHQ-9, DASS-21 |
| 💨 | Anxiety & OCD | GAD-7, Beck Anxiety Inventory, OCI-R |
| 🛡️ | Trauma & PTSD | PCL-5, ACE Questionnaire |
| 🌱 | Self & Identity | Rosenberg Self-Esteem Scale |
| ⚡ | Attention (ADHD) | ASRS v1.1 |
| 🍂 | Substance Use | AUDIT |
| 🌙 | Sleep | Insomnia Severity Index |
| ⚠️ | Clinical Safety | C-SSRS Self-Harm Assessment |
| 💑 | Relationships | Couples Assessment |
| 🕊️ | Grief & Loss | Grief Assessment |
| 🕯️ | Burnout & Wellness | Ministry Burnout Assessment |
| ✝️ | Faith & Spirituality | Spiritual Wellness Inventory |
| 🏠 | Family Systems | Family Systems Assessment |

A `CATEGORIES` array drives display order, decoupled from `FORM_CATALOG`. New forms can be added to any category without reordering the catalog.

### v3.0.0 — Files Changed

**New files (15):** PHQ9.js, BeckAnxietyInventory.js, PCL5.js, RosenbergSelfEsteem.js, ASRSv1.js, OCIRevised.js, AUDIT.js, DASS21.js, ACEQuestionnaire.js, CouplesAssessment.js, GriefAssessment.js, BurnoutAssessment.js, SpiritualWellnessInventory.js, FamilySystemsAssessment.js, InsomniaSeverityIndex.js — all in `apps/web/src/components/Documents/forms/`

**Modified:** `apps/web/src/components/Documents/DocumentsPage.jsx` (category grouping, 15 new imports, 19-entry FORM_CATALOG)

**Version bumped (7 files):** root `package.json`, `apps/api/package.json`, `apps/web/package.json`, `apps/worker/package.json`, `packages/domain/package.json`, `packages/i18n/package.json`, `packages/telemetry/package.json`

### v3.0.0 Breaking Changes

None. FormRunner, FormDefinition schema, App.jsx routing, and existing form definitions are all unchanged.

---

## v2.2.0 — Electronic Documents & Clinical Form Library (March 2026)

### v2.2.0 Overview

This release delivers the **Documents** area as a complete, production-ready feature of the FaithCounseling platform. Prior to this release, the Documents navigation item was a registered placeholder that rendered no document-specific content. Documents is now a fully operational electronic forms module: counselors can open interactive multi-section forms, complete or guide clients through them in-session, view real-time clinical scores, and print or save as PDF directly from the browser.

The module is purpose-built for Christian counseling. Every form in the library contains a **Faith & Spiritual Profile** or **Faith Dimension** section that invites clients to authentically share how their faith shapes their experience and healing. Scripture references (Philippians 4:6–7, Jeremiah 29:11, Psalm 34:18, Psalm 147:3) are embedded contextually throughout the forms as pastoral anchors — not decorative elements.

The form architecture is intentionally generic and data-driven. A single shared `FormRunner` renderer can display any form definition written as a JavaScript configuration object. Adding new form types to the library in the future requires only a new definition file; the renderer and the page shell require no modification.

---

### v2.2.0 — Electronic Forms Library

Four clinical instruments are included in this release:

#### Short Intake Form (~10 minutes)

A focused pre-session intake covering personal information, the presenting concern and its severity, medical and mental health history, session goals, and a faith profile. Designed to be completed by the client in the waiting area or shared electronically in advance of the first appointment. Includes a required safety screening at the end.

The **Faith & Spiritual Profile** section asks about religious tradition, how important faith is to the client (0–10 scale), church attendance, openness to integrating faith into sessions (five-level select), consent to prayer, spiritual goals, and pastor contact consent.

#### Long Intake Form (~40 minutes)

A comprehensive biopsychosocial and spiritual pre-counseling assessment structured across fourteen sections. Designed to give a counselor everything they need to begin treatment planning after the first session. Sections cover:

- Full personal demographics
- Presenting concerns in detail — triggers, duration, daily functioning impact
- Mental health history including hospitalizations and prior self-harm (with conditional follow-up fields)
- Medical history with medications and chronic conditions
- Family-of-origin history and childhood description
- Developmental, social, vocational, and legal history
- Relationship history — current relationship satisfaction, children, relational strengths
- Substance use screening across all major categories
- Trauma history via a screening checklist covering ten trauma types
- Current functioning — sleep, appetite, activity, coping, life stressors
- Goals and expectations for the counseling relationship
- An extensive **Faith & Spiritual Profile** section with questions on prayer life, Bible reading, spiritual disciplines (fasting, journaling, small groups, service, retreats, worship music), preferred level of faith integration, specific Christian counseling goals, and pastor contact consent
- Safety assessment with ideation screening and conditional plan/intent follow-up

#### Anxiety Assessment — GAD-7 (15 minutes)

A clinically validated anxiety screening using the **Generalized Anxiety Disorder 7-Item (GAD-7)** scale (Spitzer, Kroenke, Williams & Löwe, 2006). Extended with physical symptom screening, anxiety pattern and trigger exploration, and a coping inventory.

**Scoring:** The seven GAD-7 items produce a 0–21 total score. The `FormRunner` displays a live score banner with severity band and color:

| Score | Band | Color |
| ------- | ------ | ------- |
| 0–4 | Minimal anxiety | Green |
| 5–9 | Mild anxiety | Yellow |
| 10–14 | Moderate anxiety | Orange |
| 15–21 | Severe anxiety | Red |

The **Faith Dimension** section opens with Philippians 4:6–7 as a pastoral framing. It asks whether anxiety affects the client's sense of God's presence or trust in God, which specific spiritual anxiety factors apply (spiritual disconnection, faith doubts, guilt/shame, etc.), the client's current level of trust and surrender to God (0–10 scale), and their faith-based counseling goals.

#### Self-Harm & Suicide Risk Assessment — C-SSRS (20–30 minutes)

A structured risk assessment based on the **Columbia Suicide Severity Rating Scale (C-SSRS)** (Posner et al., 2011), adapted to a clinician-guided self-report format. Combines C-SSRS ideation and behavior items with non-suicidal self-injury (NSSI) screening, protective factor documentation, and a Christian faith dimension.

**Risk stratification:** The five C-SSRS ideation items produce a risk band based on answer pattern:

| Band | Trigger |
| ------ | --------- |
| Imminent | cssrs5 = Yes (plan + intent) |
| High | cssrs4 = Yes (plan without intent) |
| Moderate | cssrs3 = Yes (intent without plan) |
| Low | cssrs2 = Yes (ideation, no plan or intent) |
| Minimal | No active ideation (cssrs1–cssrs5 all No) |

The NSSI section uses conditional rendering — method, frequency, and function questions appear only when the client confirms NSSI engagement in the last 90 days. Similarly, behavioral history follow-up questions (attempt dates, method) appear only when prior attempts are confirmed.

**Clinician section** collects the assessed risk level, documenting actions taken (safety plan, means restriction, referral, hospitalization, pastoral contact, etc.), and free-text clinician notes.

The **Faith Dimension** section opens with Jeremiah 29:11 and Psalm 34:18 as pastoral grounding. It asks whether the client believes God has a purpose and future for them, what is making that hard to see (conditional), current sense of God's presence (0–10), whether moral or religious beliefs serve as a protective factor against self-harm, consent to pastoral contact, scriptures that feel hopeful, and a free-text reflection on "For I know the plans I have for you" (Jer. 29:11).

> **Clinical note:** This form is flagged on the library card with a red alert: "Clinical use — this form should be reviewed by a licensed clinician. In crisis? Call/text **988** or text HOME to **741741**."

---

### v2.2.0 — Technical Architecture

#### Form Definition Schema

Forms are pure JavaScript objects exported from files in `apps/web/src/components/Documents/forms/`. The schema:

```text
FormDefinition {
  id: string                        // unique identifier
  title: string
  description: string
  icon: string                      // emoji
  estimatedMinutes: number
  scorable?: boolean                // enables score banner in FormRunner
  scoreFields?: string[]            // field IDs to sum (GAD-7 style)
  scoreMax?: number
  scoreLabel?: string
  scoreInterpretation: function     // (total) => { label, color, description }
                                    // or (answers) => { label, color, description }
  sections: Section[]
}

Section {
  id: string
  title: string
  description?: string              // rendered as a brand-border callout
  color?: 'red'                     // marks safety sections
  fields: Field[]
}

Field {
  id: string                        // used as the answer key
  type: 'text'|'email'|'tel'|'date'|'number'|'textarea'|'select'|
        'radio'|'checkboxes'|'scale'|'gad_scale'
  label: string
  placeholder?: string
  required?: boolean
  half?: boolean                    // renders in two-column grid
  options?: string[] | { value, label }[]  // for select/radio/checkboxes
  min?: number                      // for scale, number
  max?: number
  minLabel?: string                 // for scale end labels
  maxLabel?: string
  minRows?: number                  // for textarea
  showIf?: { field: string, value: string }
         | { field: string, values: string[] }
}
```

#### FormRunner (`apps/web/src/components/Documents/FormRunner.jsx`)

Stateless renderer: accepts `formDef` and `onClose` props. Manages `answers` and `activeStep` locally. Computes visible field counts and percent-complete in real time using `useMemo`. All `showIf` evaluation is purely derived from the current `answers` object — no side effects.

Key implementation details:

- `ScoreField`, `GadScaleField`, and `CheckboxesField` are isolated sub-components that receive `field`, `value`, and `onChange` props — no answer state leaks between fields
- `ScoreBanner` reads from the exported `scoreInterpretation` function on the form definition; it handles both the numeric-sum pattern (GAD-7) and the answer-object pattern (C-SSRS risk)
- Print CSS is injected as an inline `<style>` tag; `.no-print` elements (header, nav, buttons) are hidden; `.print-section` Paper blocks avoid page breaks with `break-inside: avoid`
- Section navigation in the left column renders as `Button` elements (not tabs) so keyboard users can navigate without a roving focus trap

#### DocumentsPage (`apps/web/src/components/Documents/DocumentsPage.jsx`)

Thin page shell that maintains a single piece of state: `activeEntry | null`. When null, renders the form catalog grid. When set, renders `<FormRunner>`. The `onClose` callback resets `activeEntry` to null, returning to the grid. No routing changes are needed for the form runner view — it is mounted inline within the Documents route.

---

### v2.2.0 — App Routing and Telemetry Changes

| File | Change |
| ------ | -------- |
| `apps/web/src/App.jsx` | Added `DocumentsPage` import |
| `apps/web/src/App.jsx` | Added `const showDocuments = currentView === 'documents'` |
| `apps/web/src/App.jsx` | Added `!showDocuments` to the `showClientsWorkspace` fallback |
| `apps/web/src/App.jsx` | Added `showDocuments ? <DocumentsPage />` routing branch |
| `apps/web/src/App.jsx` | Removed `'documents'` from the placeholder `emptyState` telemetry list |

---

### v2.2.0 Validation

```sh
pnpm --filter @faith/web build
# Expect: zero errors, DocumentsPage and FormRunner bundled
```

---

### v2.2.0 Breaking Changes

None.

---

## v2.1.20 — Appointment Identity Integrity (March 2026)

### v2.1.20 Overview

Hardens scheduling data so counselor workload, calendar views, and appointment lists stay correct when people are renamed. The underlying system already had generated primary keys for both clients and counselors, but parts of the scheduling flow were still behaving as if counselor names were the stable identifier. That created drift risk for workload summaries and edited appointments after counselor profile changes.

This update makes linked IDs authoritative in the scheduling flow while still preserving readable display names for the UI. Appointment reads now resolve current counselor and client names from the linked records first, and the scheduling UI now creates and filters appointments by `counselorId` instead of relying on counselor names alone.

### v2.1.20 Changes

#### API and persistence (`apps/api/src/index.js`, `apps/api/src/db/queries/appointments.js`, `apps/api/src/db/migrate.js`)

- Appointment reads now prefer the current linked client and counselor records when building `clientName` and `counselorName`
- Appointment create and update flows now accept and resolve `counselorId`, then derive the human-readable counselor name from the linked staff record
- Staff rename updates now backfill legacy appointment rows so old name-snapshot appointments are re-linked and refreshed when a counselor changes their name
- Added migration coverage for `appointments.counselor_id` and the corresponding tenant/counselor index so older local databases are brought up to the current scheduling model
- Added a safe migration-time backfill that links legacy name-only appointments to a counselor ID when the stored counselor name still matches exactly one current staff record
- Client display names continue to follow the linked client record, so counselor and client rename behavior now follows the same identity model

#### Scheduling UI (`apps/web/src/components/SchedulingPage.jsx`, `apps/web/src/lib/clientApi.js`)

- Appointment composer now selects counselors by stable staff ID instead of counselor name text
- Counselor calendar filtering now requests the schedule by `counselorId`, which avoids broken or empty filters after a counselor rename
- Day-level metrics now count active counselors by stable ID when available instead of relying only on display names
- Legacy appointments that still only carry a counselor display name remain visible and editable through a compatibility fallback

### v2.1.20 Validation

- `node --check apps/api/src/index.js`
- `node --check apps/api/src/db/migrate.js`
- `node --check apps/api/src/db/queries/appointments.js`
- `pnpm --filter @faith/web build`

## v2.1.18 — Sidebar Options Icon Refresh (March 2026)

### v2.1.18 Overview

Refreshes the hamburger-menu header area in the sidebar. The old solid purple box was a placeholder brand block, and the two-line `Faith Counseling` / `Practice Workspace` label was heavier than needed for a simple navigation heading. This update replaces the placeholder square with a compact animated counseling icon and simplifies the label to `Options`.

### v2.1.18 Changes

#### Main app sidebar (`apps/web/src/components/Sidebar.jsx`, `apps/web/src/App.css`)

- Replaced the plain purple square in the sidebar heading with a compact animated counseling-style icon
- Removed the `Faith Counseling` and `Practice Workspace` text from the sidebar heading
- Simplified the sidebar heading label to `Options`
- Kept the icon footprint aligned to the previous square so the surrounding layout remains stable

### v2.1.18 Validation

- `pnpm --filter @faith/web build`
- Verified the sidebar heading now renders the animated icon and `Options` label in the rebuilt web bundle

## v2.1.17 — Desktop Sidebar Toggle Fix (March 2026)

### v2.1.17 Overview

Fixes the main shell hamburger behavior on desktop. The burger state was updating, but the sidebar collapse configuration only targeted `mobile`, so clicking the hamburger on larger screens did not actually hide the side menu.

### v2.1.17 Changes

#### Main app shell (`apps/web/src/App.jsx`)

- Extended the AppShell navbar collapse configuration to include both `mobile` and `desktop`
- The hamburger menu now properly hides and restores the sidebar on desktop as well as mobile
- No visual redesign was introduced in this patch; this is a shell behavior correction only

### v2.1.17 Validation

- `pnpm --filter @faith/web build`
- Verified the AppShell config now collapses the navbar for both desktop and mobile breakpoints

## v2.1.16 — UI enhancements (March 2026)

### v2.1.16 Overview

Bundles the latest user-facing interface refinements into one release line. This set of changes reshapes the main shell, monitoring page, and Operations Studio so they feel like one product instead of a mix of old admin screens and newer branded surfaces. The work also improves delivery reliability for frontend assets so visual changes reach the browser more predictably.

### v2.1.16 Changes

#### Main application shell

- Renamed the main workspace header to `Practice Operations Center`
- Added a lightweight animated counseling scene to the header
- Moved session identity out of the header and into the dashboard metric band as `Current Session`
- Moved live API connection status out of the header and into the sidebar, directly below the signed-in user pill
- Kept the header focused on navigation, workspace context, and language controls

#### Monitoring and operations surfaces

- Reworked `/monitor.html` to the same light indigo/blue brand system as the main app
- Reworked `/operations.html` to the same light indigo/blue brand system as the main app
- Updated top bars, cards, summary panels, forms, tables, audit/reporting blocks, and supporting visual treatments so these standalone pages now feel like part of the same product family

#### Delivery and reliability

- Switched the web build back to versioned hashed asset filenames so browser refreshes pick up the latest JS/CSS more reliably
- Regenerated the production web bundle and current hashed asset references in `public/index.html`

### v2.1.16 Validation

- `pnpm --filter @faith/web build`
- Verified `/monitor.html` uses the aligned branded palette
- Verified `/operations.html` uses the aligned branded palette
- Verified the main app bundle now points at the current hashed asset URL from `public/index.html`

## v2.1.15 — Sidebar Connection Status Placement (March 2026)

### v2.1.15 Overview

Refines the main application shell by moving the live API connection state out of the top header and into the sidebar identity area. The `API Connected` badge is status information, not primary header content, so it now sits directly under the signed-in user bubble where session and environment state are easier to scan together.

### v2.1.15 Changes

#### Main app shell (`apps/web/src/components/TopBar.jsx`, `apps/web/src/components/Sidebar.jsx`, `apps/web/src/App.jsx`)

- Removed the `API Connected` / connection-state badge from the top bar
- Added the live connection-state badge directly below the signed-in user pill in the sidebar
- Kept the same green/gray/red state mapping for connected, loading, and error conditions
- Left the header focused on navigation, title, and language selection instead of runtime status

### v2.1.15 Validation

- `pnpm --filter @faith/web build`
- Verified the generated app bundle includes the sidebar-based connection status and no longer renders the status badge in the top bar

## v2.1.14 — Operations Page Brand Alignment (March 2026)

### v2.1.14 Overview

Brings the standalone Operations Studio page onto the same visual system as the main application shell, About page, and monitoring page. The workflows and content on `operations.html` were already strong, but the page still used an older darker utility-bar and neutral admin-panel palette that felt disconnected from the brighter indigo-forward product identity. This update keeps the structure and behavior intact while re-skinning the page into the shared workspace look.

### v2.1.14 Changes

#### Operations page styling (`apps/web/public/operations.html`)

- Replaced the older neutral/utility palette with the same light indigo-blue product palette used by the main app
- Updated the Operations Studio top bar to the brighter branded treatment with softer borders, glass-like surfaces, and the same brand mark style used on other refreshed pages
- Retuned cards, tabs, form controls, audit/reporting panels, stat tiles, and policy blocks so they read clearly on the lighter shared background
- Added layered page gradients, brighter panel surfaces, softer indigo borders, and lighter shadows so the page feels like part of the same product family
- Left the page content, workflows, telemetry hooks, and JavaScript behavior unchanged

### v2.1.14 Validation

- Verified `/operations.html` is served with the updated light indigo theme styles
- Confirmed the existing Operations Studio sections and controls remain in place after the styling refresh

## v2.1.13 — Monitoring Page Brand Alignment (March 2026)

### v2.1.13 Overview

Brings the monitoring page into the same visual language as the main application shell. The monitoring UI was functionally rich but still used an older dark dashboard treatment that felt visually disconnected from the lighter indigo-forward experience used in the main app and the refreshed About page. This update keeps the monitoring content intact while reworking the page into the shared product palette.

### v2.1.13 Changes

#### Monitoring page styling (`apps/web/public/monitor.html`)

- Replaced the old dark monitoring palette with the same light indigo/blue brand family used by the main app
- Added layered page gradients, brighter glass-like cards, softer indigo borders, and lighter surfaces so the monitor view feels part of the same workspace
- Updated the monitor top bar to use the same brighter branded treatment rather than the older dark utility bar
- Retuned KPI cards, summary pills, issue rows, health checks, database tiles, and form inputs so they remain readable on the lighter background
- Corrected the donut-chart center text color for the new light theme so the percentage label remains legible

### v2.1.13 Validation

- Verified `/monitor.html` is served with the updated light theme styles
- Confirmed the page still renders the existing monitoring structure and telemetry sections after the styling refresh

## v2.1.12 — Versioned Web Asset Delivery (March 2026)

### v2.1.12 Overview

Fixes a deployment/update visibility problem in the web app. The React build had been forcing stable output names like `/assets/app.js` and `/assets/index.css`. Even with conservative cache headers, that makes UI refreshes less reliable because the browser can continue using an older asset longer than expected. This patch switches the build back to versioned asset filenames so UI changes like the new `Practice Operations Center` header land predictably after a normal reload.

### v2.1.12 Changes

#### Web build output (`apps/web/vite.config.js`)

- Replaced fixed Rollup output names with hashed filenames for entry chunks, secondary chunks, and CSS/assets
- `index.html` now points to versioned asset URLs generated by Vite instead of the fixed `/assets/app.js` and `/assets/index.css` paths
- This makes normal browser reloads pick up new UI bundles more reliably after deploys and local rebuilds

### v2.1.12 Validation

- `pnpm --filter @faith/web build`
- Verified generated `public/index.html` references hashed asset filenames instead of fixed asset paths

## v2.1.11 — Operations Header And Session Card Refresh (March 2026)

### v2.1.11 Overview

Refreshes the main application header so the first screen feels like an operations workspace instead of a dated admin shell. The old top bar used a smaller `Practice HUB` title and spent prominent space on session identity text (`Admin User`, `Server-managed session`) that belongs in the dashboard context instead of the primary brand/header area. This patch reframes the entry point as an operations center, adds a lightweight animated counseling visual, and relocates the session information into the metric band where it sits naturally beside `Audit Events`.

### v2.1.11 Changes

#### Main app header (`apps/web/src/components/TopBar.jsx`, `apps/web/src/App.css`, `apps/web/src/App.jsx`)

- Renamed the primary title from `Practice HUB` to `Practice Operations Center`
- Increased the title scale and hierarchy so the screen leads with a clearer, more intentional operational identity
- Added a small CSS-animated counseling scene in the top bar to give the header more energy without introducing a heavy asset dependency
- Removed the user/session identity block from the top bar so the header no longer burns prime space on `Admin User` and `Server-managed session`
- Increased the app-shell header height so the refreshed copy and visual have enough room to breathe on desktop without collapsing on mobile

#### Dashboard metrics row (`apps/web/src/components/Metrics.jsx`, `apps/web/src/App.jsx`, `apps/web/src/App.css`)

- Added a new `Current Session` card to the primary metric band
- Moved session identity details into that card so the active user and session mode now appear alongside `Audit Events` instead of inside the header
- Expanded the metric grid to support four cards cleanly across desktop breakpoints
- Added dedicated card styling so the session card reads as contextual system state rather than another numeric KPI

### v2.1.11 Validation

- `pnpm --filter @faith/web build`

## v2.1.10 — Static File Server Query-String Fix (March 2026)

### v2.1.10 Overview

Patches a bug in the raw Node.js static file server where any URL containing a query string (e.g. `/operations.js?v=2.1.7`) was passed verbatim to `path.join()`. The server would then look for a file literally named `operations.js?v=2.1.7` on disk, find nothing, and return a 404. In practice this meant adding a cache-busting query string to any script tag caused that script to silently fail to load — leaving the page with no JavaScript event listeners and completely unresponsive to user interaction.

### v2.1.10 Changes

#### Web static file server (`apps/web/server.js`)

- Fixed `resolvePublicUrl(requestUrl)` to strip the query string before resolving to a file path: `const pathname = requestUrl.split('?')[0]`
- The `pathname` (not the full URL) is now used for all path comparisons (`/about`, `/monitor`) and returned as the file path to look up on disk
- Query strings are still forwarded correctly for API proxy requests (`/api/...`) — only static asset lookups are affected by this change
- Cache-busting suffixes on any static asset (`?v=X`, `?t=X`, `?build=X`) now resolve correctly in production

### v2.1.10 Validation

- `node --check apps/web/server.js`
- Request to `/operations.js?v=2.1.7` now returns the contents of `operations.js` with a `200` rather than a `404`
- Removing the query string from the script src and doing a hard refresh (`Cmd+Shift+R`) also unblocks the page while the server is still running the old binary

## v2.1.9 — About Page Experience Refresh (March 2026)

### v2.1.9 Overview

Transforms the static About page from a plain stack of utility panels into a proper product overview surface. The old page was functional but visually flat: one header, two white boxes, and bare checklist text. The new version keeps the same content and links, but presents them as a designed landing page with a stronger visual identity, clearer hierarchy, richer grouping, and better scannability on both desktop and mobile.

### v2.1.9 Changes

#### About page layout and styling (`apps/web/public/about.html`)

- Rebuilt the page as a two-stage editorial layout with a branded top bar, a hero panel, and a split content grid
- Added a stronger hero section with a large serif headline, supporting narrative copy, and compact characteristic badges for role-aware workflows, faith workflows, API backing, and telemetry visibility
- Introduced a summary aside in the hero with a plain-language “what this app does” explanation and three compact numeric summary tiles
- Replaced the old checklist presentation with module cards for:
  - Client Lifecycle & Charting
  - Scheduling & Operations
  - Billing & Claims
  - Portal & Faith Workflows
- Reworked the platform/documentation area into dedicated utility cards for API Health, OpenAPI, Swagger UI, and Monitoring, with the existing links preserved
- Added local page-only styling so the About experience feels intentional without changing the broader shared stylesheet or the rest of the app shell

#### Visual direction

- Introduced a warmer, more atmospheric background using layered radial gradients instead of a flat content-page look
- Switched the page to a more expressive type pairing: editorial serif headline treatment with a cleaner operational sans-serif body
- Added softer glass-like panels, stronger card rhythm, and more deliberate spacing to make the page feel like a product overview rather than a settings stub
- Improved mobile behavior with explicit responsive stacking for the hero, module cards, utility cards, and navigation

### v2.1.9 Validation

- Verified the page remains fully static and continues to load through the existing web server route at `/about`
- Verified all existing links remain intact:
  - `/index.html`
  - `/api/openapi.yaml`
  - `/api/docs`
  - `/monitor.html`
- Kept the existing telemetry hook for the `about` surface in place so monitoring coverage is unchanged

## v2.1.8 — Swagger UI Proxy Repair (March 2026)

### v2.1.8 Overview

Repairs the interactive API documentation at `/api/docs`. The proxied Swagger UI had two independent breakages: the docs HTML was still referencing the spec as `/openapi.yaml`, which is correct only when the API serves the page directly, and the web proxy was applying the app’s strict CSP/COEP profile to the docs page, which blocked Swagger’s CDN-hosted scripts and styles. The result was a broken interactive docs page even though the API spec itself still existed.

### v2.1.8 Changes

#### API docs HTML generation (`apps/api/src/index.js`)

- Changed the Swagger spec URL from absolute `/openapi.yaml` to relative `./openapi.yaml`
- This preserves direct API docs behavior at `/docs` while also making proxied docs at `/api/docs` correctly resolve the spec at `/api/openapi.yaml`
- Disabled Swagger’s external validator call with `validatorUrl: null` so the docs stay self-contained and do not depend on outbound network behavior
- Added `HEAD` support for `/docs` and `/openapi.yaml` so the docs endpoints behave like normal static documentation assets for link checkers, proxies, and inspectors

#### Web proxy security headers (`apps/web/server.js`)

- Added a docs-specific CSP profile for `/api/docs` and `/api/docs/`
- Allowed Swagger UI CDN assets from `https://unpkg.com` only on the docs route instead of weakening the CSP for the full application
- Allowed inline Swagger bootstrap script execution only on the docs route, because the HTML returned by the API contains a small inline initializer
- Relaxed `Cross-Origin-Embedder-Policy` only for the docs route so the proxied Swagger page can load its cross-origin assets successfully
- Left the stricter application CSP/COEP policy unchanged for the rest of the site

### v2.1.8 Validation

- `node --check apps/api/src/index.js`
- `node --check apps/web/server.js`
- Restarted API and web servers with the patched code
- Verified `GET /docs` returns Swagger HTML with `url: './openapi.yaml'`
- Verified `GET /api/docs` returns Swagger HTML through the web proxy with a docs-compatible CSP
- Verified `GET /api/openapi.yaml` is the intended proxied spec path for the interactive docs
- Verified `HEAD /docs`, `HEAD /api/docs`, and `HEAD /api/openapi.yaml` no longer fall through to `404`

## v2.1.7 — Reporting Tab UI Redesign (March 2026)

### v2.1.7 Overview

Replaces the two raw JSON textarea boxes in the Operations Studio Reporting tab with a purpose-built dashboard. The previous implementation dumped entire API payloads into read-only textareas, making it impossible to scan trends, compare figures, or understand the shape of the data without hand-parsing JSON. The redesign renders every field in a form suited to its meaning — numbers as numbers, ratios as percentages, time-series as bars, aging buckets as colored cells, and lists as sortable tables.

### v2.1.7 Changes

#### Operations Studio — Reporting Tab (`apps/web/public/operations.js`)

##### Background and motivation

`initReporting()` previously attached click handlers that fetched the API and wrote the raw response to `el('reportingSummary').value` and `el('platformSummary').value`. Neither textarea element exists in the current HTML anymore. The replacement decouples fetch, render, and DOM attachment into three layers so each section can be tested or extended independently.

##### `initReporting()`

- Wires `.rpt-window-btn` preset toggling so clicking 7/30/90/180 flips the `active` class without any hidden `<input>` — consistent with the active-button-as-state-source pattern used in the Audit tab
- Attaches Run Report → `runPracticeReport()` and Refresh → `runPlatformSummary()`

##### `runPracticeReport()`

Reads the selected window from `document.querySelector('.rpt-window-btn.active')?.dataset?.days ?? '30'`, calls `GET /v1/reporting/overview?days=N`, writes the as-of timestamp from `summary.generatedAt` to `#reportingAsOf`, and delegates to `renderPracticeReport(summary)`.

##### `renderPracticeReport(summary)`

| Section | What it renders |
| --- | --- |
| Stat cards | Sessions (total), Completed, Remote Rate (%), Avg/Counselor — each with a colored top-accent card |
| Referral sources | Proportional horizontal bar chart; bar width is relative to the highest-count source |
| Document completion | Progress bar (green fill) showing completed vs pending vs overdue; percentage caption beneath |
| Assessment trends | Proportional bar chart of assessment types administered in the window |
| AR aging | Grid of cells — Current, 30–60d, 60–90d, 90d+ — with amber/danger color coding on older buckets |
| Outstanding by client | Table with client ID, outstanding balance, and invoice count |
| Location performance | Table with total / completed / remote session counts and a completion-% column |

##### `renderPlatformSummary(summary)`

| Section | What it renders |
| --- | --- |
| Provisioning | Stat pills (Total / Queued / In Progress / Completed), recent tenants table with status badges and timestamps |
| Impersonation | Stat pills (Total / Active / Ended), recent sessions table with tenant, role, reason, status, start time, duration |
| Data exports | Stat pills (Total / Queued / Completed / Failed), recent exports table with type, format, requester, status, timestamps |
| Retention policy | Grid of policy cards using `.plat-policy-item` CSS — each shows data type, retention days, and purgeability flag |

##### Helper functions added

| Function | Purpose |
| --- | --- |
| `fmtMoney(cents)` | Formats an integer cent value as a locale `$` string with two decimal places |
| `fmtPct(ratio)` | Formats a 0–1 float as a `%` string with one decimal |
| `rptBars(containerId, items, labelKey, valueKey, total)` | Generic horizontal bar chart renderer; bar widths are relative to the max value in the dataset; optionally appends a % share label |
| `platStatPill(label, value, color)` | Renders a `.plat-stat` card with a colored top border using the existing CSS |
| `statusBadgeHtml(status)` | Wraps a status string in a `.status-badge` span matched to the existing CSS class variants |

### v2.1.7 Validation

- `node --check apps/web/public/operations.js` — no syntax errors
- All CSS class names (`plat-stat`, `plat-stat-label`, `plat-stat-value`, `plat-policy-item`, `rpt-aging-cell`, `rpt-aging-val`, `status-badge`, etc.) reference existing definitions in `operations.html`; no new styles required
- Run Report with a 30-day window should populate all six sections: stat cards, referral bars, doc completion, assessment bars, AR aging + client table, location table
- Refresh Platform should populate all four sections: provisioning, impersonation, exports, retention policy
- A `null` or missing subsection (e.g. no `clients` array in AR) degrades gracefully to a "No outstanding AR" table row, never a JS error

## v2.1.6 — Dashboard Metrics Correction (March 2026)

### v2.1.6 Overview

Corrects the top dashboard metrics so they reflect live operational data instead of placeholder or miswired values. Before this fix, the second card was labeled `Appointment Types` and showed how many appointment types were configured, which is not an operational workload metric. The third card rendered `Audit Event Sync` but never loaded any audit data at all, so it silently stayed at the initial `0` value even when audit activity existed. The dashboard now reports actual scheduling load and real audit activity.

### v2.1.6 Changes

#### Dashboard metric cards (`apps/web/src/App.jsx`, `apps/web/src/components/Metrics.jsx`)

- Replaced the `Appointment Types` dashboard card with `Future Appointments`
- Removed the misleading configuration-style metric that counted `/api/v1/appointment-types`
- Dashboard scheduling metrics now come from `/api/v1/appointments`, which makes the cards reflect actual scheduled work instead of setup metadata
- `Today's Sessions` now counts non-cancelled appointments scheduled for the current calendar day
- `Future Appointments` now counts non-cancelled appointments scheduled at or after the current time
- Replaced the static `+12% from yesterday` and `5 configured` badge text with live, relevant metadata tied to what the cards actually measure

#### Audit metric wiring

- Fixed the dashboard audit metric bug where `auditEvents` stayed at `0` because the frontend initialized the state but never fetched any audit summary data
- Dashboard now calls `GET /api/v1/audit/intelligence?days=7&limit=1` for admin-capable roles and uses `summary.total` as the displayed count
- The card label now reflects what is actually being shown: `Audit Events` instead of the vague `Audit Event Sync`
- Non-admin roles now see `Admin visibility required` instead of a misleading silent zero-fetch state
- When the summary loads successfully, the card metadata now states `Last 7 days` so operators know the count is a bounded audit window, not a lifetime total

### v2.1.6 Validation

- `pnpm --filter @faith/web build`
- Dashboard metric source code now fetches live appointment data and live audit summary data
- The `Future Appointments` label and metadata are rendered from the React source instead of the old appointment-type placeholder
- Audit metric no longer relies on the default `0` initializer alone

## v2.1.5 — Structured PHI-Safe API Logging (March 2026)

### v2.1.5 Overview

Hardens the API logging layer so server failures, request warnings, audit failures, and startup events always emit usable structured JSON lines without leaking request bodies, raw SQL, names, emails, tokens, cookies, or other PHI/PII-sensitive content.

### v2.1.5 Changes

#### API logging contract (`apps/api/src/index.js`, `apps/api/src/lib/log.js`)

- Added a shared structured logger for API runtime events
- Every request now gets a correlation-friendly `x-request-id` response header; inbound IDs are preserved when present, otherwise the API generates one
- Request logs now use normalized route templates like `/v1/appointments/:id` instead of raw paths
- Caught request failures emit structured `request.failed` lines with method, route, request ID, status code, duration, tenant context, actor role, and sanitized error details
- Request warnings now cover non-5xx client errors and slow requests; successful low-latency traffic stays quiet unless `API_LOG_ALL_REQUESTS=1`
- Startup logs and listen failures now use the same JSON logger instead of plain `console.log` / `console.error`

#### Audit console output (`apps/api/src/index.js`)

- Audit events now flow through the same structured logger as `audit.event`
- Audit write failures now emit structured `audit.write_failed` lines with request correlation and sanitized error detail
- Audit logging keeps IDs required for audit usability, but the logger still strips or redacts free text and credential material

#### Privacy and usability guardrails

- Logged request context is bounded to operational metadata: request ID, method, normalized route, tenant ID, actor role, auth state, status code, and duration
- Request/response bodies are never logged
- Raw SQL statements and payload dumps are never logged
- Error messages are sanitized before emission so obvious secrets, cookies, bearer tokens, JWTs, and email addresses are redacted

### v2.1.5 Validation

- `node --check apps/api/src/lib/log.js`
- `node --check apps/api/src/index.js`
- Live malformed JSON request to `POST /v1/auth/login` returned `400` and emitted structured `request.failed` + `request.complete` log lines with request correlation
- Live auth-gated requests emitted structured `request.complete` warning lines instead of disappearing silently
- The API now returns `x-request-id` headers for correlation

## v2.1.4 — Audit Intelligence UI Redesign (March 2026)

### v2.1.4 Overview

Replaces the two raw JSON textarea boxes in the Audit Intelligence tab with a purpose-built investigation interface. Operators now see a descriptive introduction, a compact filter bar, live stat cards, proportional breakdown charts, and a properly formatted event log table — all without touching the API.

### v2.1.4 Changes

#### Operations Studio — Audit Intelligence Tab (`apps/web/public/operations.html`, `apps/web/public/operations.js`)

##### What changed and why

The previous UI rendered the API's JSON payloads directly into `<textarea>` elements. That made it impossible to scan for patterns, compare counts at a glance, or read an action name without parsing dot-notation mentally. The redesign treats operators as the primary audience and presents every field in a form suited to its meaning.

##### Intro banner

A contextual description at the top of the tab explains what the audit log tracks and explicitly notes that no PHI, client names, or free-text is stored — only action codes, roles, target types, and IDs. This gives operators immediate context before they run a query.

##### Filter bar

- **Time window** — three preset buttons (7 days / 30 days / 90 days) replace the raw number input; the selected window is shown as an active pill
- **Result** — dropdown: All results / Success / Denied / Error
- **Actor role** — dropdown pre-populated with all known roles (Practice Owner, Practice Admin, Counselor, Scheduler / Biller, System)
- **Action contains** — free-text search field; supports Enter key to trigger query without reaching for the button
- **Run Query** button — aligned flush to the bottom of the filter row

##### Summary stat cards (appear after first query)

Four cards in a row, each with a large numeric value and a colored top accent:

| Card | Accent | What it shows |
| --- | --- | --- |
| Total Events | Neutral | All events in the selected window |
| Successful | Green | Events with `result: success` |
| Denied | Amber | Access or permission blocks |
| Errors | Red | Unexpected failures |

##### Breakdown charts (two cards side by side)

- **Top Actions** — horizontal bar chart of the 8 most frequent action codes; bars are indigo; each bar row shows the full action string and a count
- **Activity Breakdown** — two stacked bar charts: By Actor Role (purple bars) and By Target Type (cyan bars); up to 8 rows each

All bars animate to their correct width on render via a CSS transition.

##### Event Log table

Replaces the raw events textarea with a proper table:

| Column | Content |
| --- | --- |
| (dot) | Color-coded result indicator — green glow for success, amber for denied, red for error |
| Action | Action string in monospace; the module prefix (e.g. `billing`) is highlighted indigo; the result label appears below in matching color |
| Actor Role | Color-coded badge — purple for practice_owner, blue for practice_admin, green for system, amber for counselor |
| Target | Target type in bold with the target ID in grey monospace below |
| Tenant | Tenant ID in monospace grey |
| When | Relative time ("3m ago") with full locale timestamp below |

A description line beneath the card title narrates the active filters. A count badge shows the number of events returned.

##### Zero state

When a query returns no events, a centered search icon, heading, and suggestion message replace the empty table — no blank textarea, no confusion.

##### JS helpers added (`apps/web/public/operations.js`)

- `escapeHtml(str)` — XSS-safe string rendering for all dynamic content
- `fmtRelTime(iso)` — converts ISO timestamp to relative label (s / m / h / d ago)
- `fmtActionHtml(action)` — renders dot-notation action strings with the module prefix highlighted
- `roleBadgeClass(role)` — maps role strings to CSS badge modifier classes
- `runAuditQuery()` — extracted from the click handler; also called on Enter in the action filter field
- `renderAuditSummary(summary, days)` — drives stat cards and all three bar charts
- `renderAuditEvents(events, days)` — drives the event log table and zero state

### v2.1.4 Validation

- Querying with no filters renders stat cards, both breakdown charts, and the full event log
- Applying a result filter recalculates all panels correctly
- Pressing Enter in the action filter field triggers the query
- Zero-state renders when no events match; event log card is hidden
- Role badges render the correct color for each known role
- All dynamic content is XSS-safe via `escapeHtml`
- `node --check` passes on `operations.js`

## v2.1.3 — Deep Database Engine Monitoring (March 2026)

### v2.1.3 Overview

Replaces the single "is the database reachable?" health ping with a live, rich monitoring surface that queries MySQL internal status and metadata tables. The monitoring dashboard now displays real-time connection counts, InnoDB buffer pool efficiency, query-type breakdowns, throughput, slow-query alerting, and per-table row/size estimates — all alongside an animated database-engine graphic.

### v2.1.3 Changes

#### API — `GET /v1/monitoring/db` (`apps/api/src/index.js`, `apps/api/src/lib/security.js`)

New public (no-auth) monitoring endpoint that queries the running MySQL instance and returns:

| Field | Source | Description |
| --- | --- | --- |
| `uptime.seconds` | `SHOW GLOBAL STATUS · Uptime` | Seconds the MySQL process has been running |
| `connections.current` | `Threads_connected` | Open connections right now |
| `connections.running` | `Threads_running` | Queries actively executing |
| `connections.maxUsed` | `Max_used_connections` | High-water mark since last restart |
| `connections.maxAllowed` | `SHOW GLOBAL VARIABLES · max_connections` | Configured connection ceiling |
| `queries.total` | `Questions` | Cumulative queries handled |
| `queries.slow` | `Slow_queries` | Queries that exceeded `long_query_time` |
| `queries.selects/inserts/updates/deletes` | `Com_*` | Per-operation counts |
| `bufferPool.hitRatio` | `Innodb_buffer_pool_read_requests` vs `Innodb_buffer_pool_reads` | InnoDB cache efficiency (%) |
| `bufferPool.pagesUsed/pagesTotal` | `Innodb_buffer_pool_pages_*` | Buffer pool page utilization |
| `bufferPool.sizeBytes` | `innodb_buffer_pool_size` | Configured buffer pool size |
| `throughput.bytesReceived/bytesSent` | `Bytes_received/sent` | Cumulative network I/O |
| `tables[]` | `information_schema.TABLES` | Per-table row estimate and storage size (data + index) |

Returns `{ mode: 'unavailable' }` gracefully when `DB_NAME` is not configured. Route registered in `resolveRoute()`. Exempt from RBAC (same policy as other monitoring/telemetry endpoints).

#### Monitoring Dashboard — Database Engine Section (`apps/web/public/monitor.html`, `apps/web/public/monitor.js`)

A new **Database Engine** section appears between the Health Probes row and the Request Activity charts. It contains:

**Animated SVG graphic** — a 3D database cylinder with:

- Glowing elliptical cap with a pulsing center dot
- Three staggered pulsing ground rings (blue, indigo, cyan) that expand and fade outward
- An animated data-stream line falling into the cylinder top with a travelling packet dot
- Three orbiting data packets (cyan, indigo, amber) traversing an elliptical orbit around the cylinder's equator at different speeds (3.2 s, 3.2 s offset by half cycle, 2.1 s) — all implemented with pure SVG SMIL `<animateMotion>` and `<mpath>` — no external libraries

**Six metric tiles** (pulled from `/api/v1/monitoring/db` on every 15-second refresh):

| Tile | Metric | Notes |
| --- | --- | --- |
| Uptime | `d h m` formatted uptime | Shows days when > 24 h |
| Connections | Current open count | Sub-line: running threads · max used / max allowed |
| Buffer Pool Hit | InnoDB hit ratio % | Sub-line: pages used / total |
| Total Queries | Cumulative query count | Sub-line: S / I / U / D breakdown |
| Slow Queries | Count of slow queries | Value turns amber when non-zero |
| Throughput | Total bytes received + sent | Human-readable (KB / MB / GB) |

**Table Storage & Row Estimates grid** — one pill per table showing:

- Table name (monospace, truncated with tooltip)
- Estimated row count
- Storage size (data + index, shown as KB or MB)

**JS helpers added** (`apps/web/public/monitor.js`):

- `fmtBytes(bytes)` — converts raw byte count to human-readable string
- `fmtUptimeLong(sec)` — converts seconds to `Xd Xh Xm` format
- `updateDbPanel(data)` — drives all DB panel DOM updates; falls back gracefully when data is null or unavailable

**Wired into the refresh cycle**: `/api/v1/monitoring/db` is added as a fourth parallel fetch in `Promise.allSettled`, so it updates on every 15-second refresh alongside health, API telemetry, and web telemetry.

### v2.1.3 Validation

- `curl http://localhost:3001/v1/monitoring/db` returns `mode: "live"` with all fields populated when `DB_NAME` is set
- Returns `mode: "unavailable"` when `DB_NAME` is not configured (no crash, no 500)
- Monitoring dashboard "Database Engine" section renders with live data on page load and subsequent refreshes
- Animated SVG renders in Chrome, Firefox, and Safari without external dependencies
- Slow Queries tile turns amber correctly when `Slow_queries > 0`
- `monitor.js` passes `node --check` syntax validation

## v2.1.0 — ScheduleOps: Audit Hardening, Waitlist Promotion & Startup Hardening (March 2026)

### v2.1.0 Overview

Patches latent defects discovered during tenant-model validation and ScheduleOps rollout, delivers the first ScheduleOps Phase 4 quick-wins, and hardens local API startup behavior when shared dev ports are already occupied.

### v2.1.0 Changes

#### Domain — Audit UUID Auto-Generation (`packages/domain/src/index.js`)

`createAuditEvent` now auto-generates a `crypto.randomUUID()` `id` before spreading caller-provided fields. Previously, callers never supplied an `id`, causing `AUDIT_FAIL: Column 'id' cannot be null` on every audit write in DB mode. All downstream callers (`createAppointment`, `updateAppointment`, `deleteAppointment`, and any module that emits audit events) benefit automatically — no call-site changes required.

#### Scheduling — Waitlist Promote-to-Appointment (`apps/web/src/components/SchedulingPage.jsx`)

The **Waitlist** tab now exposes a **Schedule** button on each row. Clicking any waitlist entry pre-seeds the appointment composer with that client's id and immediately opens the composer on the Appointments tab, ready for a counselor and time slot. This closes the manual waitlist promotion gap — formerly, staff had to open the composer separately and re-enter the client.

- `WaitlistPanel` accepts a new `onPromote(clientId)` prop
- `SchedulingPage` manages a `composerClientId` state that overrides the default `initialClientId` for the duration of a promoted session
- Selecting **New Appointment** from the toolbar resets `composerClientId` back to the default, preserving existing entry-point behavior

#### API Runtime — Graceful Port Collision Handling (`apps/api/src/index.js`, `apps/api/package.json`, `start-api.sh`)

The API server now handles `EADDRINUSE` startup failures explicitly instead of crashing with an unhandled Node `error` event. When the default/shared local port is already occupied, startup exits cleanly and prints a direct remediation hint.

- `pnpm start:api` keeps the default/shared startup path
- `pnpm start:api:standalone` starts the API on port `3104` for isolated local work
- `apps/api/package.json` adds `start:standalone`
- `start-api.sh` now loads `.env` and honors an existing `PORT` override while defaulting to `3104`

### v2.1.0 Validation

- Audit events written in DB mode no longer produce `Column 'id' cannot be null` errors
- Clicking **Schedule** on any waitlist row opens the composer pre-seeded with the correct client
- **New Appointment** toolbar button continues to function as before
- `pnpm start:api` now reports a clear port-in-use message instead of terminating on an unhandled server event
- `pnpm start:api:standalone` successfully starts the API on port `3104`
- All previously-passing smoke tests (`step11`, `step12`, `security-regression`) remain green

## AegisTrail Security & Auditing Baseline (March 2026)

Initial implementation slice for the AegisTrail initiative has been added.

### Governance and standards

- Added canonical security/auditing baseline at `PLANS/FULL-SECURITY-AND-AUDITING.md`
- Extended `PLANS/FULL-SURFACE-MONITORING.md` to include audit intelligence surface obligations and audit-vs-telemetry separation rules
- Updated `AGENTS.md` so security/auditing work now requires the canonical security plan

### API

- Added `GET /v1/audit/intelligence` (admin-gated) for bounded-window audit investigation
- Supports filters: `days`, `limit`, `action`, `actorRole`, `result`, and optional `tenantId` for platform admin workflows
- Returns aggregated summary slices (`byResult`, `byAction`, `byActorRole`, `byTargetType`) plus recent events
- Added runtime in-memory audit buffer for local/in-memory mode visibility

### Operations Studio

- Added **Audit Intelligence** tab to `apps/web/public/operations.html`
- Added bounded filters and read-only outputs for summary and recent events
- Wired frontend behavior in `apps/web/public/operations.js`

### Privacy and compliance boundary

- Audit ledger data and monitoring telemetry are explicitly separated
- Raw audit rows are not to be exported via OTEL telemetry

## Tenant-Model Update (March 2026)

This update hardens tenant-isolated DB behavior and completes blocker remediation needed for full cross-module smoke validation in DB mode.

### Highlights

- Tenant-safe compatibility fixes across platform, clinical, documents, inventory, billing, portal, and faith DB query paths.
- SQL timestamp normalization for DB writes to avoid ISO-to-TIMESTAMP failures.
- DB-mode handler fixes where in-memory lookups previously caused false "not found" errors.
- CORS preflight hardening for local web origins used by integration smoke validation.
- Added tenant guardrail checklist and CI gate design in `docs/security/tenant-query-safety-checklist.md`.

### Validation

- `node ops/step11-smoke.mjs` passed.
- `node ops/step12-validate.mjs` passed.
- `node ops/security-regression.mjs` passed.

## v1.9.0 — Scheduling: Waitlist, Reminders & Calendar DB Support (March 2026)

### v1.9.0 Overview

Completes the scheduling module by wiring the three remaining features — waitlist management, appointment reminders, and the calendar endpoint — to the MySQL persistence layer. Fixes three latent schema mismatches in the DB query module that would have caused runtime crashes when `DB_NAME` is set. Adds a live reminder-dispatch polling loop to the worker process.

### v1.9.0 Changes

#### Frontend — Waitlist & Reminders Tabs (`apps/web/src/components/SchedulingPage.jsx`)

The Scheduling page now exposes three tabs:

- **Appointments** — existing calendar, counselor, and practice-manager views (unchanged)
- **Waitlist** — priority-sorted table showing all clients in waitlist status; inline editing of priority rank, requested service, preferred session type, and notes
- **Reminders** — list of all reminders with status badges; "New Reminder" modal to schedule a reminder against any upcoming appointment; mark-sent and cancel actions per row

#### API — DB Branches for Waitlist & Calendar (`apps/api/src/index.js`)

- `handleWaitlist` (GET + PATCH) — now has a full DB-mode branch; GET enriches rows with decrypted client names; PATCH updates via the query module
- `handleSchedulingCalendar` — DB-mode branch uses `listAppointmentsByDateRange` for appointments and a live staff query for availability templates
- Fixed bug: PATCH reminders was querying a non-existent `appointment_reminders` table — corrected to `reminders`

#### DB Query Module — Schema Mismatches Fixed (`apps/api/src/db/queries/appointments.js`)

Three column-name mismatches that would have caused runtime errors in DB mode:

| Table | Was | Now |
| --- | --- | --- |
| `reminders` | `scheduled_for`, `channel` | `reminder_at`, `delivery_channel` |
| `waitlist_metadata` | `requested_counselor_id`, `preferred_days`, `estimated_wait`, `priority` | `priority_rank`, `requested_service`, `preferred_session_type` |
| `availability_templates` | normalized `day_of_week`/`start_time`/`end_time` rows | single JSON `slots` column |

Also added the previously-missing `upsertAvailabilityTemplate` and `deleteAvailabilityTemplate` functions that were imported by `index.js` but did not exist.

#### Worker — Reminder Polling Loop (`apps/worker/src/index.js`)

- Added a 60-second polling loop that queries `reminders WHERE status='pending' AND reminder_at <= NOW()`
- Each due reminder is logged (delivery channel, type, appointment, client) and marked `sent` with a `sent_at` timestamp
- In production, replace the `console.log` dispatch with your email/SMS provider integration
- Loop is skipped gracefully when `DB_NAME` is not set
- `mysql2` added to worker dependencies

#### API Client — New Scheduling Functions (`apps/web/src/lib/clientApi.js`)

- `fetchWaitlist()` — `GET /v1/waitlist`
- `patchWaitlistEntry(data)` — `PATCH /v1/waitlist`
- `fetchReminders({ status, appointmentId })` — `GET /v1/reminders`
- `createReminderRecord(data)` — `POST /v1/reminders`
- `patchReminderRecord(data)` — `PATCH /v1/reminders`

### v1.9.0 Backward Compatibility

No breaking changes. All existing API routes and in-memory fallback behavior are preserved. The new tabs are additive UI surfaces. The worker reminder loop is a no-op when `DB_NAME` is not configured.

---

## Hotfixes (March 2026)

### Monitoring dashboard — DB dependency always shown as `unhealthy` (2026-03-28)

**Timestamp:** 2026-03-28 · commit `503ee6b`

**Problem:** The Health Probes & Dependencies section of the monitoring dashboard (`apps/web/public/monitor.html` + `monitor.js`) displayed every dependency as `unhealthy` regardless of actual DB status. This was misleading — the API and database were healthy but the badge always rendered red.

**Root cause:** In `updateHealthChecks()` inside `monitor.js`, the dependencies block destructured `Object.entries(health.dependencies)` as `([name, status])`. Each value in `health.dependencies` is a full object (`{ status: 2, observedAt: "..." }`), not a raw numeric status code. The function then called `healthBadge(status)` with the entire object. Inside `healthLabel()`:

```js
function healthLabel(status) {
  if (status === 2) return 'healthy';   // { status:2, ... } !== 2 → false
  if (status === 1) return 'degraded';  // { status:2, ... } !== 1 → false
  return 'unhealthy';                   // always reached
}
```

Because a plain object never strict-equals a number, the function always fell through to `'unhealthy'`, even when `status.status === 2`.

**Fix:** Renamed the destructured variable from `status` to `dep` to avoid shadowing confusion, and passed `dep?.status` (the numeric value) to `healthBadge()`:

```js
// Before
dependencies.map(([name, status]) => healthBadge(status))

// After
dependencies.map(([name, dep]) => healthBadge(dep?.status))
```

**File changed:** `apps/web/public/monitor.js` — no rebuild required (served as a static file).

---

### Appointments table — missing columns (`starts_at`, `ends_at`, `location_name`, `timezone`)

**Problem:** The appointments DB table was created with a `scheduled_at` column, but the query layer (`apps/api/src/db/queries/appointments.js`) was written expecting `starts_at`, `ends_at`, `location_name`, and `timezone`. Any read or write to the scheduling feature threw `Unknown column 'starts_at' in 'order clause'`.

**Fix:** Added the four missing columns via an idempotent `addColumnIfMissing` migration in `apps/api/src/db/migrate.js`. Re-run `node --env-file=.env apps/api/src/db/migrate.js` to apply on any environment that hasn't been updated yet. The old `scheduled_at` column is retained for backward compatibility.

### Portal API — `resolvePortalClient` not DB-aware

**Problem:** All portal endpoints (`/v1/portal/overview`, `/v1/portal/accounts`, etc.) validated the incoming `clientId` against the in-memory mock client array. When the app runs with a real MySQL database, clients have real UUIDs that don't exist in that array, causing every portal request to return `400 Valid clientId is required`.

**Fix:** `resolvePortalClient` in `apps/api/src/index.js` is now `async` and queries the `clients` table directly when `DB_NAME` is set. All seven call sites were updated with `await`.

### Appointment composer — counselor dropdown included non-counselor staff

**Problem:** The counselor selector in the appointment composer was populated from a list that included admin and scheduler roles (`platform_admin`, `practice_owner`, `practice_admin`, `scheduler_biller`) in addition to actual counselors and interns.

**Fix:** The `counselors` memo in `SchedulingPage.jsx` now filters exclusively on `COUNSELING_ROLES` (`counselor`, `intern`), so only staff classified as counselors appear in the dropdown.

### `npm run start` — `.env` not loaded, DB credentials empty

**Problem:** `ops/start-all.mjs` spawned child processes inheriting `process.env`, but the root `.env` file was never loaded into the parent process. DB credentials were undefined, causing MySQL to reject the connection with `Access denied for user ''`.

**Fix:** The `start` and `start:all` scripts in `package.json` now use `node --env-file=.env`, which is natively supported in Node 20+. No additional dependencies required.

### Web server — `app.js` served with 1-hour browser cache

**Problem:** `apps/web/server.js` intended to serve `no-cache` for all files under `assets/`, but the path check (`requestedPath.startsWith('assets/')`) never matched because the resolved path starts with `/assets/`. The JS bundle was cached for up to an hour after a rebuild.

**Fix:** Changed to `requestedPath.includes('assets/')` so all asset files are correctly served with `cache-control: no-cache`.

---

## v1.8.0 — Major Feature Addition: Scheduling (March 2026)

### v1.8.0 Overview

This release formally declares **Scheduling** as a major platform feature. The product now includes an end-to-end scheduling workflow covering calendar access, appointment creation, lifecycle updates, client-preselected booking flows, and portal request conversion into scheduled appointments.

### v1.8.0 Highlights

- Scheduling is now a first-class module in the primary app shell
- General, counselor, and practice-manager calendar views are available
- Dashboard `View Calendar` and `New Appointment` actions are fully wired
- Appointment lifecycle actions (edit, complete, cancel, no-show, delete) are available from scheduling views
- Staff can open scheduling with client-preselected context from client list and client detail
- Portal appointment requests can be converted into live scheduled appointments

### v1.8.0 Backward Compatibility

No breaking API changes were introduced. The scheduling feature is built on existing appointment endpoints and extends UI/workflow capability without altering established API contracts.

## v1.7.0 — Scheduling Module Foundation, Client Scheduling Flows & Portal Conversion (March 2026)

### v1.7.0 Overview

Introduces the first end-to-end Scheduling module implementation in the React app. The release adds a dedicated Scheduling surface, working dashboard scheduling actions, appointment lifecycle controls, client-preselected scheduling flows, and portal request handoff into live appointment scheduling.

### v1.7.0 Changes

#### Dedicated Scheduling Surface

- Added a real Scheduling page in the app shell (replacing placeholder navigation behavior)
- Added role-aware calendar modes:
  - General Calendar
  - Counselor Calendar
  - Practice Manager Calendar
- Added operational metrics cards for day-level scheduling visibility

#### Working Scheduling Entry Points

- `View Calendar` on the dashboard now opens the Scheduling page
- `New Appointment` on the dashboard now opens a functioning appointment composer
- Client rows now expose a `Schedule` action that opens scheduling with the client preselected
- Client detail header now exposes `Schedule Appointment` for direct scheduling

#### Appointment Creation & Lifecycle Actions

- Appointment composer supports:
  - client
  - appointment type
  - counselor
  - start/end
  - location or remote mode
  - timezone
- Added conflict handling from API `409` responses to surface scheduling collisions
- Added lifecycle actions from Scheduling agenda/grid:
  - Edit appointment
  - Mark completed
  - Mark cancelled
  - Mark no-show
  - Delete appointment

#### Portal Request to Appointment Conversion

- Portal appointment requests now provide `Schedule` actions for requested/approved items
- Selecting `Schedule` opens Scheduling with the client preselected and request timing prefilled
- Successful appointment creation marks the originating portal request as `scheduled`

#### Planning & Documentation

- Added implementation record: `PLANS/CALENDAR.md`
- Updated package versions to the `1.x` major line with synchronized release value `1.7.0`

### v1.7.0 Backward Compatibility

No breaking API changes were introduced. Existing appointment endpoints remain in place and were reused for the new Scheduling UX. The release adds UI and workflow capabilities on top of the current API contract.

## v1.6.0 — Explicit Health Probes & OTEL Health Metrics (March 2026)

### v1.6.0 Overview

Adds explicit liveness and readiness health endpoints to the API and exports dedicated service/dependency health metrics through OpenTelemetry. This closes the gap between generic request telemetry and actual machine-readable health status.

### v1.6.0 Changes

#### API Health Endpoints

- `GET /health` and `GET /health/live` now provide liveness status
- `GET /health/ready` now performs a DB readiness check and returns dependency/check detail
- Health routes are publicly accessible for probes and load balancers

#### OpenTelemetry Health Export

- Added `faith.service.health_status` observable gauge
- Added `faith.service.dependency.health_status` observable gauge
- Added `faith.service.healthcheck.duration` histogram
- Added `faith.service.healthcheck.total` counter
- Readiness results now update the API telemetry summary health block for operator visibility

#### Frontend Monitoring Foundation

- Added a shared visible-surface registry for app views, tabs, scheduling subviews, workspace studio tabs, static pages, and key modal workflows
- Added structured frontend telemetry ingestion via `POST /v1/telemetry/events`
- Extended `GET /v1/telemetry/summary` with `overall`, `frontend`, and `surfaces` sections for per-surface monitoring aggregation
- Added app-shell, tab, scheduling, shared fetch-layer, and standalone page instrumentation for surface views, load time, active time, fetch timing, action outcomes, and UI errors
- Expanded the monitoring page to show overall UI health, top failing surfaces/workflows, health probe status, OTEL export state, and a per-surface breakdown sourced from the API summary

### v1.6.0 Bug Fixes

- `exportedViaOtel` in `GET /v1/telemetry/summary` now reports active OTEL export when only `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` is configured
- Repository package manifests and OpenAPI metadata have been normalized to the `1.6.0` release line

### v1.6.0 Backward Compatibility

No breaking API changes. Existing `/health` callers still receive a successful liveness response, while `/health/ready` is available for deeper readiness probes.

## v1.5.0 — Operations Studio Revamp, Monitoring Dashboard & API Auth Fix (March 2026)

### v1.5.0 Overview

Overhauls the two standalone operational pages (Operations Studio and Monitoring Dashboard) from broken placeholder UIs into polished, fully-functional tools. Fixes a session-propagation bug that blocked platform admin operations with spurious "Admin role required" errors.

### v1.5.0 Changes

#### Monitoring Dashboard — Full Rewrite (`apps/web/public/monitor.html`)

The monitoring page has been completely rewritten as a self-contained dark-theme dashboard with live animated visualizations. No external chart library — all charts are pure SVG or CSS.

##### Visual Design

- Dark palette (`#080c18` background, `#141b2d` cards, glassmorphism sticky topbar)
- Pulsing health status chip with live "healthy / degraded / error" classification
- 15-second auto-refresh with countdown timer in the topbar
- CSS `countUp` animation on all KPI values when data loads

##### KPI Row (6 cards)

- Total Requests, Error Count, Avg Latency (ms), Uptime, Active Requests, Mutations — each with color-coded top-border accent

##### SVG Sparkline Chart

- Gradient-filled area chart for request volume (rolling 20-point browser history)
- Dashed overlay line for error rate
- Scales dynamically with `buildPath` / `buildFillPath` helpers

##### SVG Donut Chart

- Animated `stroke-dasharray` showing error percentage in the centre
- Colour shifts green → amber → red based on error rate threshold

##### Latency Bar Chart

- Horizontal bars for avg / p95 / max with CSS `transition: width 1s ease`
- Separate proxy latency sub-section

##### Memory Gauges

- Gradient-filled bars for Heap Used, Heap Total, and RSS (from `process` block in telemetry summary)

##### Status Code Drill-Down

- Clickable status code pills (colour-coded by 2xx / 3xx / 4xx / 5xx)
- Clicking a pill filters the HTTP Errors table below
- HTTP Errors table shows time, method, route, and status — filterable by All / 4xx / 5xx / GET / POST
- Powered by `recentErrors[]` from `GET /api/v1/telemetry/summary`

##### Browser Vitals Grid

- Renders `browserVitals` fields from the telemetry summary (LCP, FID, CLS, TTFB, etc.)

##### OTEL Settings Panel (admin)

- Active / Inactive status banner driven by `exportedViaOtel` from the API, including metrics-only OTLP configuration
- Editable inputs for `OTEL_EXPORTER_OTLP_ENDPOINT`, traces endpoint, and metrics endpoint
- Test Connection — sends a live OTLP probe (`POST { resourceSpans: [] }`) with a 5-second timeout; reports success or failure inline
- Generate .env Snippet — outputs a ready-to-paste `.env` block with current endpoint values

#### Operations Studio — Revamp (`apps/web/public/operations.html` + new `apps/web/public/operations.js`)

The Operations Studio page has been rebuilt from scratch with a clean layout and every button wired to real API endpoints.

##### Layout

- Sticky dark header with logo, connection status pill, navigation back to main app, and Sign In Panel
- Four tabs: Reporting, Platform Ops, Data & Retention, Language Studio
- White cards with inline status bars per action group
- Toast notifications (bottom-right) for success/error feedback

##### Reporting Tab

- Refresh Summary → `GET /api/v1/reporting/overview?days=N`

##### Platform Ops Tab

- Refresh Platform Summary → `GET /api/v1/platform/overview`
- Create Tenant → `POST /api/v1/platform/tenant-provisioning` (tenantId, practiceName, ownerEmail)
- Start Impersonation → `POST /api/v1/platform/impersonation-sessions` (auto-populates End Session ID)
- End Impersonation → `PATCH /api/v1/platform/impersonation-sessions/:id`

##### Data & Retention Tab

- Queue Export → `POST /api/v1/platform/data-exports`
- Save Retention Policy → `PUT /api/v1/platform/retention-policies`

##### Language Studio Tab

- Create Locale → `POST /api/v1/i18n/locales`
- Load Catalog → `GET /api/v1/i18n/catalog?locale=`
- Inline translation editor — key/value rows; tracks catalog state in memory
- Save Translations → `PATCH /api/v1/i18n/catalog/:locale`
- Auto-Translate → `POST /api/v1/i18n/translate`
- Save Config → `PATCH /api/v1/i18n/settings/:locale`

### v1.5.0 Bug Fixes

#### Platform / Reporting Operations — "Admin role required" Error

`handlePlatformOverview`, `handleReportingOverview`, and `handleTenantProvisioning` in `apps/api/src/index.js` were dispatched **without passing the resolved `session` object**. `callerRole()` then fell back to the `x-staff-role` request header, which the browser never sends, so every call was treated as unauthenticated and returned 403.

**Fix:** All three dispatch sites now pass `session` as an argument; handler signatures were updated accordingly.

### v1.5.0 Backward Compatibility

No breaking changes. All API routes, database schema, and client-side React application are unchanged. The standalone monitoring and operations pages are served as static HTML from `apps/web/public/` and do not affect the React bundle.

---

## v1.4.0 — Mantine UI Migration, Counselor Maintenance & Bug Fixes (March 2026)

### Overview

Completes a full migration of all React components from raw HTML inputs and inline styles to [Mantine v7](https://mantine.dev) component primitives. Adds a dedicated Counselor Maintenance screen showing only counselor and intern staff. Fixes two navigation regressions introduced during the UI refactor.

### Changes

#### Full Mantine v7 UI Migration

Every component in `apps/web/src/components/` has been rewritten to use Mantine v7 primitives, replacing raw `<input>`, `<select>`, `<textarea>`, and all inline style objects.

**Migrated components:**

| Component | Notes |
| --- | --- |
| `ClientForm.jsx` | `useForm` with field-level validation; `TextInput`, `Select`, `Alert` |
| `ClientModal.jsx` | Replaced custom backdrop div with Mantine `Modal` |
| `WorkspaceGrid.jsx` | `Paper`, `Tabs`, `Button`, `UnstyledButton`; `notifications.show()` for delete feedback |
| `UserMaintenance.jsx` | `Table`, `Modal`, `useForm`, `Badge`, `PasswordInput` |
| `CounselorDetail/tabs/ProfileTab.jsx` | `useForm`, `Select`, `Textarea`; self/admin RBAC |
| `CounselorDetail/tabs/LicensesTab.jsx` | List-of-cards with `Modal` for add/edit; `DateInput` for issue/expiry dates |
| `CounselorDetail/tabs/SpecialtiesTab.jsx` | `CheckGroup` multi-select for specialties, modalities, age groups; `NumberInput` for max caseload |
| `CounselorDetail/tabs/CounselorFaithProfileTab.jsx` | `Select` for tradition/integration style; `Checkbox` for ordained/memberships |
| `CounselorDetail/tabs/CertificationsTab.jsx` | Two-section layout (Certifications / CEU Log); `Modal` for add/edit |
| `CounselorDetail/tabs/EmploymentTab.jsx` | `DateInput` for hire/termination/malpractice dates; non-admin masked read-only view |
| `CounselorDetail/tabs/AvailabilityTab.jsx` | Mantine `Table` with `Badge` for remote/in-person |
| `ClientDetail/tabs/DemographicsTab.jsx` | `PasswordInput` for SSN; `DateInput` for DOB with age calculation; inline phone/address rows |
| `ClientDetail/tabs/ContactsTab.jsx` | `ContactCard` sub-component with `Paper`, `SimpleGrid`, `Badge` indicators |
| `ClientDetail/tabs/InsuranceTab.jsx` | Collapsible `Paper` header; `NumberInput` for copay/authorized visits; `DateInput` for all date fields |
| `ClientDetail/tabs/ClinicalHistoryTab.jsx` | `CollapsibleSection` pattern; `YesNoToggle` checkboxes; risk active `Alert` with confirmation |
| `ClientDetail/tabs/DiagnosesTab.jsx` | Three sub-lists (Diagnoses, Medications, Allergies); discontinued medications toggle |
| `ClientDetail/tabs/FaithProfileTab.jsx` | `Select` with `searchable` for denomination; faith integration description panel |
| `ClientDetail/tabs/LegalAdminTab.jsx` | Guardian toggle for non-minors; `DateInput` for court order expiry; Minor badge |

`CounselorDetail/sharedStyles.js` was deleted after all tabs were migrated off it.

#### Counselor Maintenance Screen

New `CounselorMaintenance.jsx` component replaces the generic `UserMaintenance` component in the Counselors sidebar view:

- Title reads **"Counselor Maintenance"** (was "User Maintenance")
- Filters staff list to only `counselor` and `intern` roles — admin and other roles do not appear
- Adds a **License Type** column relevant to clinical staff
- **"View Profile"** button (primary) opens the full `CounselorDetailPage`
- **"Edit"** button opens a quick-edit modal scoped to counselor/intern role options only
- **"Add Counselor"** modal limits the Role dropdown to `counselor` and `intern`
- `App.jsx` updated to import and render `CounselorMaintenance` for the `counselors` nav view

### Bug Fixes

#### Clients Sidebar — Empty Screen After Navigation

Clicking "Clients" in the sidebar called `onOpenClientPicker()` (a search modal) without updating `currentView`. Closing the modal left the app on whatever screen was previously active, often showing nothing if `currentView` had no matching render branch.

**Fix:** `Sidebar.jsx` now calls `onNavigate('clients')` for the Clients item, same as all other nav items. The Clients view navigates to `currentView = 'clients'`, which renders `WorkspaceGrid` with the full client list.

#### Client Detail Page — Blank Screen on Open

Clicking "Edit" on any client rendered a completely blank screen. Root cause: Mantine v7 `Tabs` renders **all panel children on mount** (hidden via CSS, not unmounted). `ClientDetailTabs.jsx` passed the `client` prop only to `DemographicsTab` but not to `InsuranceTab`, `ClinicalHistoryTab`, `FaithProfileTab`, or `LegalAdminTab`. All four components access `client.insurance`, `client.clinical`, etc. at the top of their render function, throwing a `TypeError` immediately — before anything was displayed.

**Fix:** `ClientDetailTabs.jsx` now passes `client` to every tab panel component.

### Backward Compatibility

No breaking changes. All API routes, database schema, and authentication behavior are unchanged.

---

## v1.3.0 — Counselor Profiling System (March 2026)

### v1.3.0 Overview

Adds a comprehensive counselor profiling system covering all information a Christian counseling practice needs to maintain on its counseling personnel. Each counselor now has a dedicated detail page with seven tabs: Profile, Licenses, Specialties, Faith Profile, Certifications, Employment, and Availability. RBAC allows counselors to edit their own specialty and faith profiles while keeping licenses, certifications, and employment records admin-controlled.

### v1.3.0 Changes

#### Database Schema (5 new tables)

- `staff_licenses` — multi-row, one per state license per counselor; PHI-encrypted license number
- `staff_certifications` — multi-row, one per certification or CEU entry; PHI-encrypted cert number and notes
- `staff_specialty_profiles` — singleton per counselor; JSON columns for specialties, modalities, age groups, languages
- `staff_employment` — singleton per counselor; PHI-encrypted NPI, malpractice policy, and direct phone
- `staff_faith_profiles` — singleton per counselor; PHI-encrypted theological approach, faith credentials, and spiritual gifts

Run migration: `node apps/api/src/db/migrate.js`

#### API Routes (7 new sub-resource routes)

All routes are scoped under `/api/v1/staff/:staffId/`:

- `GET|POST /licenses` — list and create licenses (admin or self for GET; admin-only POST)
- `GET|PATCH|DELETE /licenses/:id` — get, update, delete a single license
- `GET|POST /certifications` — list and create certifications
- `GET|PATCH|DELETE /certifications/:id` — get, update, delete a single certification
- `GET|PUT /specialty-profile` — get or upsert specialty profile (self or admin write)
- `GET|PUT /employment` — get or upsert employment record (admin-only)
- `GET|PUT /faith-profile` — get or upsert faith profile (self or admin write)

#### Domain Enums (8 new)

Added to `packages/domain/src/index.js`: `counselingSpecialties`, `therapeuticModalities`, `ageGroupsServed`, `employmentTypes`, `employmentStatuses`, `licenseStatuses`, `faithTraditions`, `integrationStyles`

#### Web UI — CounselorDetailPage

New component tree at `apps/web/src/components/CounselorDetail/`:

- **Profile tab** — core staff record fields; admins edit all, counselors edit their own bio
- **Licenses tab** — list-of-cards with add/edit/delete (admin only); masked license numbers
- **Specialties tab** — checkbox multi-select for 19 specialties, 16 modalities, 9 age groups, 10 languages; editable by self or admin
- **Faith Profile tab** — faith tradition, ordination details, AACC/ACBC/CCCA memberships, prayer and scripture integration preferences; editable by self or admin
- **Certifications tab** — cards split into Certifications and CEU Log sections with total CEU hours; admin write
- **Employment tab** — NPI, malpractice insurance, employment status; admin-only write with sensitive fields masked for non-admins; 10-digit NPI validation
- **Availability tab** — read-only weekly grid from existing scheduling data

#### App Routing

- `Sidebar.jsx` — added "Counselors" nav item, visible to admin roles only
- `UserMaintenance.jsx` — added "View Profile" button per staff row when `onViewCounselor` prop is provided
- `App.jsx` — added `selectedCounselorId` state, `handleOpenCounselor`/`handleCounselorBack` handlers, and `CounselorDetailPage` render branch

### v1.3.0 RBAC Summary

| Resource | Read | Write |
| --- | --- | --- |
| Licenses | Admin or self | Admin only |
| Certifications | Admin or self | Admin only |
| Specialty Profile | Admin or self | Self or admin |
| Faith Profile | Admin or self | Self or admin |
| Employment | Admin only | Admin only |

### v1.3.0 Backward Compatibility

No breaking changes. Existing staff list, user maintenance, and client workflows are unaffected.

### v1.3.0 Deferred

- Availability editing (managed through Scheduling)
- Credentialing expiry alerts
- CEU reporting and export
- Supervision assignment UI
- Counselor-facing self-service portal

See `PLANS/CounselorProfiling.md` for the full implementation plan.

---

## v1.2.0 — Docker Local Database, Env Loading Fix & Login Bug Fix (March 2026)

### v1.2.0 Overview

Completes the local developer experience for the MySQL persistence layer. Adds a Docker Compose file for one-command database startup, fixes environment variable loading so the API always reads `.env` on start, and resolves a login regression where the session INSERT failed due to a missing `role` column in the staff account query.

### v1.2.0 Changes

#### Docker Local Database

- `docker-compose.yml` added at repo root — starts MySQL 8 with persistent named volume (`faith_mysql_data`), healthcheck, and the `faith_app` user pre-configured
- Start the database: `docker compose up -d`
- Data persists across container restarts via the named volume

#### Environment Loading Fix

- `apps/api/package.json` `start` script updated from `node src/index.js` to `node --env-file=../../.env src/index.js`
- Previously, running `pnpm --filter @faith/api start` would launch the API without `.env` loaded, causing the DB connection to fail silently and fall back to anonymous credentials

#### Login Bug Fix

- `apps/api/src/lib/auth.js` — `login()` query was `SELECT sa.*, sm.first_name_enc, sm.last_name_enc` which omitted `sm.role`
- The `sessions` INSERT uses `account.role`, so `role` was `undefined` → MySQL `Column 'role' cannot be null` error
- Fixed by adding `sm.role` to the SELECT: `SELECT sa.*, sm.role, sm.first_name_enc, sm.last_name_enc`

#### Local Dev Quick Start

```bash
# 1. Start MySQL
docker compose up -d

# 2. Create all tables + seed dev account
node apps/api/src/db/migrate.js

# 3. Start the API (DB mode activates automatically via .env)
npx pnpm@10.7.0 --filter @faith/api start

# 4. Login
curl -s -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@faithcounseling.local","password":"ChangeMe!Dev2024#"}'
```

### v1.2.0 Bug Fixes

- API no longer connects anonymously when started via `pnpm start` without explicit env vars
- Login endpoint no longer throws `Column 'role' cannot be null` on first attempt

### v1.2.0 Backward Compatibility

No breaking changes. In-memory mode (no `DB_NAME`) is unaffected.

See `docs/DATABASE-IMPLEMENTATION.md` for full setup reference.

---

## v1.1.0 — MySQL Persistence, PHI Encryption & Session Auth (March 2026)

### v1.1.0 Overview

Full database persistence layer replacing the in-memory store. Introduces MySQL-backed storage for all domains, AES-256-GCM field-level encryption for PHI columns, session-based authentication with argon2id password hashing, and persistent audit logging. The API operates in **dual mode**: when `DB_NAME` is set it routes all requests through parameterized MySQL queries; without it the in-memory fallback remains fully functional for local development and tests.

### New Features

#### Database Layer

- MySQL connection pool (`apps/api/src/db/pool.js`) with configurable SSL, connection limit, and UTC timezone
- Full DDL schema (`apps/api/src/db/schema.sql`) — 30+ tables across all domains
- Run-once migration script: `node apps/api/src/db/migrate.js`
- Per-domain query helper modules under `apps/api/src/db/queries/` — `clients.js`, `clinical.js`, `appointments.js`, `billing.js`, `documents.js`, `portal.js`, `staff.js`, `faith.js`, `platform.js`
- 83 `process.env.DB_NAME` guards wired into all major handlers — each falls back to in-memory when DB is not configured

#### PHI Encryption

- AES-256-GCM field-level encryption (`apps/api/src/lib/encrypt.js`) for all PHI columns
- Encrypted fields: client names, staff names/license/bio, location addresses, progress note summaries, treatment plan goals, emergency contacts, insurance info, portal emails, message content
- Key sourced from `DB_ENCRYPTION_KEY` env var (32-byte hex); format: `iv:authTag:ciphertext` (all base64)

#### Authentication

- Session-based login (`apps/api/src/lib/auth.js`) replacing insecure header-based identity
- `POST /v1/auth/login` — argon2id password verification, HttpOnly session cookie
- `POST /v1/auth/logout` — server-side session revocation
- `GET /v1/auth/me` — current session profile
- Sessions stored as SHA-256 token hashes in `sessions` table; sliding 8-hour idle timeout
- Account lockout after 10 failed attempts

#### Security

- Persistent audit events — all mutations write to `audit_events` table in addition to console log
- Parameterized queries throughout — no SQL string interpolation
- Staff accounts table with `failed_attempts`, `locked_until`, `last_login_at`, `mfa_enabled` columns

### New Environment Variables

```env
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL
DB_ENCRYPTION_KEY  (openssl rand -hex 32)
```

See `docs/DATABASE-IMPLEMENTATION.md` for full setup instructions.

### v1.1.0 Backward Compatibility

Fully backward compatible. Without `DB_NAME` set, all behavior is identical to `v1.0.0`.

---

## v1.0.0 — Client Management Module (Major Release)

### Release Overview

Major release completing Phase 1 of the full client management suite. Implements comprehensive client CRUD operations with full UI integration, audit logging, and OpenAPI documentation.

### Release Features

#### API Enhancements

- `GET /v1/clients/{id}` — Retrieve single client with tenant-scoped access audit logging
- `DELETE /v1/clients/{id}` — Soft-delete (archive) client by setting status to inactive
- `PATCH /v1/clients/{id}` — Full client update with validation and appointment name sync
- All endpoints include tenant-scope enforcement, RBAC checks, and audit trail recording

#### React Components

- `ClientForm.jsx` — Reusable form component for create/edit workflows with validation
- `ClientModal.jsx` — Modal wrapper with backdrop and form integration
- Enhanced `WorkspaceGrid.jsx` — Edit/delete buttons on client list with real-time refresh

#### UI Features

- "New Client" button in Clients panel
- Inline edit on client name (opens modal with pre-populated data)
- Delete (archive) button with confirmation dialog
- Live client list with loading, error, and empty states
- Automatic refresh after add/edit/delete mutations

#### Documentation

- Updated OpenAPI specification with full `/v1/clients/{id}` path documentation
- Added `UpdateClientRequest` schema for PATCH operations
- Documented all status codes, request/response formats, and RBAC requirements

### Breaking Changes

None — fully backward compatible. Extends existing client functionality without modifying previous endpoints.

### Performance Improvements

- Form submission with client-side validation before API calls
- Optimistic UI updates with fallback error states
- Efficient refresh mechanism using state triggers
- Soft-delete prevents data loss while preserving referential integrity

### v1.0.0 Bug Fixes

- Previous build/serving issues resolved with Vite configuration
- Stale bundle issues mitigated with cache control headers

For a detailed feature breakdown, see `docs/RELEASE_1.0.0.md`.
For current implementation history, see `docs/PRE-BETA-DEVELOPMENT.md`.

## Initial Scope

This repository starts with the product and architecture foundation required before feature coding:

- product requirements and release scope
- domain model and permissions model
- architecture decision records
- initial API contracts
- HIPAA-ready security and compliance baseline
- monorepo structure for web, API, worker, shared packages, infrastructure, and operations

## Repository Layout

- `docs/` product, architecture, contracts, and compliance documents
- `apps/web/` responsive web application
- `apps/api/` HTTP API and tenant-aware application services
- `apps/worker/` background jobs for reminders, document processing, and audit support
- `packages/domain/` shared domain types and business concepts
- `infra/` infrastructure-as-code assets
- `ops/` operational runbooks and launch readiness procedures

## Technical Direction

The initial implementation follows a modular monolith approach with clear domain boundaries:

- one practice per tenant
- role-based access control and strict tenant scoping
- relational system of record for operational and clinical data
- encrypted object storage for documents and generated files
- immutable audit trail for PHI-sensitive actions
- responsive web-first product before native mobile apps

## Next Build Steps

1. Scaffold the web, API, and worker applications.
2. Implement tenant, staff, and client identity boundaries.
3. Build audit logging and permission enforcement before feature expansion.
4. Add practice administration, intake, scheduling, and chart workflows incrementally.

## Local Run

- Install dependencies:
  - `npx pnpm@10.7.0 install`
- Start API:
  - `npx pnpm@10.7.0 --filter @faith/api start`
- Start web (auto-builds bundled client first):
  - `npx pnpm@10.7.0 --filter @faith/web start`
- Start worker:
  - `npx pnpm@10.7.0 --filter @faith/worker start`

## Verification

- Step 12 API workflow validation:
  - `node ops/step12-validate.mjs`
- Focused security regression coverage:
  - `node ops/security-regression.mjs`
- High-value browser journeys with Playwright:
  - `npx playwright test tests/e2e/high-value-journeys.spec.mjs`
- Launch-readiness browser audits for accessibility and performance:
  - `npx playwright test tests/e2e/launch-readiness.spec.mjs`

## Telemetry & Performance

- Node services use OpenTelemetry initialization from `packages/telemetry/src/node.js`.
- Browser experience metrics use OpenTelemetry + `web-vitals` from `packages/telemetry/src/browser.js`.
- Health probe endpoints:
  - `GET /health`
  - `GET /health/live`
  - `GET /health/ready`
- API telemetry summary endpoint:
  - `GET /v1/telemetry/summary`
- Frontend telemetry ingestion endpoint:
  - `POST /v1/telemetry/events`
- API telemetry summary now includes:
  - `summary.overall`
  - `summary.frontend`
  - `summary.surfaces`
- `exportedViaOtel` is `true` when any of these are configured:
  - `OTEL_EXPORTER_OTLP_ENDPOINT`
  - `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
  - `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`
- Web proxy telemetry summary endpoint:
  - `GET /telemetry/summary`
- Browser vitals ingestion endpoint:
  - `POST /v1/telemetry/vitals`
- Dedicated OTEL health metrics:
  - `faith.service.health_status`
  - `faith.service.dependency.health_status`
  - `faith.service.healthcheck.duration`
  - `faith.service.healthcheck.total`
- Dedicated UI monitoring metrics:
  - `faith.ui.screen.view`
  - `faith.ui.screen.load.duration`
  - `faith.ui.screen.active.duration`
  - `faith.ui.interaction.duration`
  - `faith.ui.action.total`
  - `faith.ui.validation.error.total`
  - `faith.ui.empty_state.view.total`
  - `faith.ui.error.total`
  - `faith.ui.fetch.duration`
  - `faith.ui.fetch.error.total`

To export traces/metrics to an OTLP backend, set one or more environment variables before startup:

- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`

## Language / Translation Studio

UI copy is keyed and managed through `@faith/i18n` with runtime locale APIs:

- List/create locales:
  - `GET /v1/i18n/locales`
  - `POST /v1/i18n/locales`
- Load/save catalog:
  - `GET /v1/i18n/catalog?locale=<code>`
  - `PATCH /v1/i18n/catalog/<code>`
- Generate draft translations:
  - `POST /v1/i18n/translate`

If `GOOGLE_TRANSLATE_API_KEY` is set, draft translations are generated via Google Translate API.
If not set, the system generates safe prefixed placeholders (for example, `[es] ...`) so teams can still refine text manually.
