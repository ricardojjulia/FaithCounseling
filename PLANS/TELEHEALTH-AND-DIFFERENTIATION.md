# TELEHEALTH AND PRODUCT DIFFERENTIATION

**Status:** Planning
**Prepared:** April 17, 2026
**Target start:** April 18, 2026
**Initiative:** FaithCounseling-meet integration + competitive differentiation feature set

---

## Purpose

This plan captures the next major product iteration for FaithCounseling: integrating the
pre-built FaithCounseling-meet (Jitsi fork) telehealth layer and shipping the product
differentiation features that make FaithCounseling the only purpose-built platform for
Christian counseling practices.

Billing and medical payment processing are explicitly out of scope. This platform is
positioned for faith-based counseling practices that operate on self-pay, sliding-scale,
or church-sponsored care models.

---

## Background

A competitive market analysis (see `docs/market-analysis-faithcounseling.md`) confirmed:

- Zero commercial competitors in the Christian counseling EHR niche.
- SimplePractice, TherapyNotes, and Therabill are all secular; none carry faith-integrated
  clinical workflows.
- The $24K/month revenue target requires approximately 200–250 active practices — 0.5%
  penetration of the AACC's 50,000 member base. Break-even is 5–6 practices.
- The single largest feature gap vs. SimplePractice is **built-in telehealth**.

The FaithCounseling-meet fork (`ricardojjulia/FaithCounseling-meet`) is already 80%
integrated — the hard work is done. This plan executes the remaining steps.

---

## Phase 1 — FaithCounseling-meet Integration

**Goal:** Counselors and clients can launch a HIPAA-appropriate video session directly
from the scheduling page, without leaving the platform.

### 1.1 — Infrastructure decision (do first)

Choose between two telehealth hosting strategies:

| Option | Cost | Complexity | Recommendation |
|---|---|---|---|
| **8x8 JaaS** (Jitsi as a Service) | ~$0.04/min/participant | Low — API key only, no infra | **MVP/launch** |
| **Self-hosted Jitsi** (docker-compose from fork) | ~$35–50/month GCP VM | Medium — Prosody, JVB, nginx | Scale milestone (200+ active practices) |
| **meet.jit.si** (public) | Free | Zero | Dev/smoke-test only — not HIPAA |

**Decision:** Use JaaS for launch. The `useJitsiApi.js` hook in the fork already uses the
Jitsi External API — JaaS uses the identical API. At 200 practices averaging 20
sessions/month, the cost is ~$16K/month; at that point, migrate to self-hosted.

**Action:** Create a JaaS account at `https://jaas.8x8.vc`, obtain an App ID, and set
`JITSI_DOMAIN=8x8.vc`.

### 1.2 — Database migration

Run the migration from the fork:

```bash
mysql -u faith_app -p faith_counseling < \
  /path/to/FaithCounseling-meet/integration/db-migration.sql
```

This adds `video_room_id VARCHAR(255)` to the `appointments` table. The room ID is
generated once per appointment on first session join and persisted thereafter.

> Write a proper numbered migration file into `apps/api/src/db/migrations/` following the
> existing migration pattern. Do not run the SQL directly.

### 1.3 — API route

Copy `integration/api-video-session.js` from the fork to `apps/api/src/routes/` and
register it in `apps/api/src/index.js`.

Route: `POST /api/v1/appointments/:id/video-session`

- Validates the caller has access to the appointment (counselor or assigned client only).
- Generates a JWT: counselor gets `moderator: true`, client gets `moderator: false`.
- Tokens expire in 2 hours.
- Generates a unique random room name on first call; persists it in `video_room_id`.
- Responds with `{ roomName, token, domain }`.

**Security requirements:**
- Authorization check: the requesting user must be either the counselor on the appointment
  or the client linked to the appointment. Deny all others (403).
- Never expose `JITSI_APP_SECRET` in any response body or log.
- Log a `video_session.started` event to the audit ledger (see
  `PLANS/FULL-SECURITY-AND-AUDITING.md`).

**Install dependency:**
```bash
cd apps/api && pnpm add jsonwebtoken
```

### 1.4 — React hook and modal

Copy from the fork into the monorepo:

| Source | Destination |
|---|---|
| `integration/useJitsiApi.js` | `apps/web/src/lib/useJitsiApi.js` |
| `integration/VideoSessionModal.jsx` | `apps/web/src/components/VideoSessionModal.jsx` |

The hook manages the Jitsi External API iframe lifecycle (init, event handlers, cleanup).
The modal wraps it in a Mantine `Modal` with a loading state and error handling.

### 1.5 — Scheduling page wire-up

In `SchedulingPage.jsx` (or the appointment row component):

1. Import `VideoSessionModal`.
2. Add `const [videoApptId, setVideoApptId] = useState(null)`.
3. Add a "Join Video Session" button to the appointment row actions (show only when
   appointment status is `scheduled` or `in_progress` and a time window of ±15 min).
4. Mount `<VideoSessionModal opened={videoApptId !== null} appointmentId={videoApptId} onClose={() => setVideoApptId(null)} />` at the bottom of the component.

### 1.6 — i18n keys

Add to all locale files in `packages/i18n/`:

```json
"scheduling.joinVideo": "Join Video Session",
"scheduling.startVideo": "Start Video Session",
"video.sessionEnded": "Session ended",
"video.loadingSession": "Connecting to session…",
"video.sessionError": "Could not start video session."
```

### 1.7 — Environment variables

Add to root `.env` and document in `.env.example`:

```
JITSI_DOMAIN=8x8.vc             # or meet.faithcounseling.app for self-hosted
JITSI_APP_ID=<jaas-app-id>
JITSI_APP_SECRET=<jaas-api-key>
VITE_JITSI_DOMAIN=8x8.vc
```

Store the secret in GCP Secret Manager for production (not in `.env` committed to the
repo).

### 1.8 — Audit ledger hook-up

Extend `api-video-session.js` to write events to the audit ledger per
`PLANS/FULL-SECURITY-AND-AUDITING.md`:

| Event | When |
|---|---|
| `video_session.started` | Token issued; session room joined |
| `video_session.ended` | Jitsi `readyToClose` event received via External API |

No PHI in the event payload — log `appointment_id`, `user_id`, `role` (counselor/client),
and timestamp only.

### Phase 1 Acceptance Criteria

- [ ] A counselor can click "Join Video Session" on a scheduled appointment
- [ ] A new browser tab or in-page modal opens the FaithCounseling-meet Jitsi room
- [ ] The client receives a session link (email or portal) and can join as a non-moderator
- [ ] No one without a valid JWT can enter the room (enforced by JaaS or self-hosted Prosody)
- [ ] Session start/end events appear in the audit log
- [ ] Works in all supported locales

---

## Phase 2 — Faith-Integrated Clinical Differentiation

**Goal:** Deepen the features that secular platforms cannot replicate without alienating
their existing user base.

### 2.1 — Scripture reference field on session notes

Add an optional `scripture_reference` field to the session note form (Clinical Chart →
Session Notes tab). Free text with a suggested format: `John 3:16`, `Psalm 23:1-4`.

No lookup API needed for v1 — counselors type it manually. Indexed for search in a future
version.

### 2.2 — Prayer and spiritual practice tracking

Extend the Progress Notes tab to include a "Spiritual Practices" section with:

- Checkboxes: Prayer journaling, Scripture reading, Church attendance, Small group,
  Spiritual direction, Fasting, Sabbath practice
- Free text: "Spiritual goals this week"

These are additive fields on the existing progress note schema — nullable, not required.

### 2.3 — Faith background on intake / client profile

Extend the client profile (ClientData schema) with a `faith_profile` section if not
already present:

- Denomination / tradition (free text or dropdown with common options)
- Church affiliation (free text)
- Faith integration preference: `integrated`, `sensitive`, `neutral`
- Spiritual genogram (text note field, v1)

The `faith_integration_preference` field gates how session templates are presented to the
counselor.

### 2.4 — Christian counseling intake templates

Add at minimum two pre-built intake templates to the form library:

1. **Faith-integrated adult intake** — includes spiritual history, faith background,
   prayer consent, and pastoral referral source.
2. **Pre-marital Christian counseling intake** — includes faith background for both
   partners, church affiliation, faith goals for marriage.

Templates should be non-destructive additions to the existing form library. Follow the
pattern established in `PLANS/FORM-LIBRARY-EXPANSION.md`.

### 2.5 — DSM-5-TR + Christian counseling reference

The app already has `docs/DSM5-TR.md`. Surface it contextually:

- In the session note form, when a counselor selects a diagnosis code, show a one-line
  description and a flag if Christian integration considerations exist.
- This is a UI-only change with no external API calls. The reference data ships with the
  app.

### Phase 2 Acceptance Criteria

- [ ] Scripture reference field saves and renders on session note read view
- [ ] Spiritual practices checklist saves with the progress note
- [ ] Faith profile fields visible and editable on the client profile page
- [ ] Two pre-built intake templates available in the form library
- [ ] Faith integration preference influences the default session template selected

---

## Phase 3 — Supervision Workflow Enhancement

**Goal:** Support the licensed supervisor + intern counselor relationship that is common
in Christian counseling programs (Liberty, Regent, Wheaton, etc.).

### 3.1 — Cosigning / supervisor review on session notes

A session note authored by an intern-level user (role: `counselor_intern`) must be
co-signed by a licensed supervisor before the note is locked.

Workflow:
1. Intern submits a session note for review.
2. Supervisor receives a notification and sees a "Pending Cosign" queue in their
   dashboard.
3. Supervisor reviews and cosigns (or returns with comments).
4. Cosigned note is locked; all subsequent reads show both the intern and supervisor
   signature with timestamps.

Audit event: `session_note.cosigned` — log intern ID, supervisor ID, appointment ID,
timestamp.

### 3.2 — Supervisor client visibility

A supervisor assigned to an intern should be able to view (read-only) all of that
intern's client records and session notes. This is a scoped permission, not a role
elevation — it does not grant the supervisor access to clients assigned to other
counselors in the same practice.

Implement as a relationship table: `supervisor_assignments (supervisor_id, intern_id,
practice_id, created_at)`.

### 3.3 — Supervision session type

Add `supervision` as an appointment type in the scheduling system, distinct from client
sessions. Supervision sessions do not have a client attached but are logged for CE/license
renewal tracking.

### Phase 3 Acceptance Criteria

- [ ] Intern-authored notes have a "Submit for Review" action instead of "Lock"
- [ ] Supervisor sees pending cosign queue in the operations dashboard
- [ ] Cosigned notes display both signatures
- [ ] Supervisor can read (not write) intern's client records
- [ ] Supervision appointment type is bookable and appears separately in scheduling view

---

## Phase 4 — SaaS Multi-Tenant Infrastructure

**Goal:** Enable FaithCounseling to be deployed as a SaaS with per-practice isolated
databases, tenant provisioning, and the Platform Admin app.

> This phase is a pre-requisite for commercial launch. It is separate from the product
> features above and may be worked in parallel by a different track.

### 4.1 — Per-tenant DB pool registry

Replace the single-DB singleton in `apps/api/src/db/pool.js` with a per-tenant pool
registry (`apps/api/src/db/pools.js`).

Architecture:
- Tenant is identified by subdomain (`{slug}.faithcounseling.com`) parsed from the
  `Host` header.
- Each tenant maps to an isolated Cloud SQL instance.
- Pool registry is a `Map<tenantSlug, mysql2Pool>` lazily initialized on first request.
- Add a middleware (`apps/api/src/middleware/tenant.js`) that resolves tenant, sets
  `req.tenantDb`, and 404s on unknown slugs.

### 4.2 — Tenant provisioning API

An internal provisioning endpoint (Platform Admin only, not customer-facing) that:

1. Creates a new Cloud SQL instance for the tenant.
2. Runs migrations against the new instance.
3. Seeds default data (admin user, default practice settings).
4. Registers the tenant in the master tenants table.

### 4.3 — Platform Admin app

A minimal internal React app at `tenantadmin.faithcounseling.com` used by the FaithCounseling
team to manage tenant lifecycle:

- Create / suspend / delete practices
- View tenant health, last active, usage metrics
- Trigger manual migrations
- Impersonation (audit-logged, time-limited) per `PLANS/FULL-SECURITY-AND-AUDITING.md`

This is an internal tool — it does not need to be polished for customer use.

### 4.4 — Billing model scaffolding (infrastructure only, no payment processing)

Track plan tier per tenant: `solo`, `practice`, `group`, `enterprise` in the master
tenants table. This drives feature gates (e.g., max counselors, supervision workflows,
advanced reporting). No payment processing integration.

### Phase 4 Acceptance Criteria

- [ ] A request to `{slug}.faithcounseling.com` routes to the correct isolated DB
- [ ] An unknown slug returns 404, not a DB error
- [ ] Provisioning API creates a working tenant with admin user in < 5 minutes
- [ ] Platform Admin app can list, create, and suspend tenants
- [ ] Plan tier controls at least one feature gate (e.g., max counselors)

---

## Sequencing and Priority

| Phase | Priority | Dependency | Estimated effort |
|---|---|---|---|
| **Phase 1** — Telehealth integration | **P0** | JaaS account | 1–2 days |
| **Phase 2** — Faith differentiation | P1 | Phase 1 (independent) | 3–5 days |
| **Phase 3** — Supervision | P2 | Phase 2 (schema extension) | 4–6 days |
| **Phase 4** — SaaS infra | P1 (parallel track) | None | 2–3 weeks |
| **Time Tracking** — Clinical hour & licensure tracking | P1 | Phase 3 (supervisor_assignments) for verification; Phase 1 for sync | See `TIME-TRACKING-COUNSELORS.md` |

Phases 1–3 can be delivered on a single instance (current architecture) before Phase 4
multi-tenancy is needed. Phase 4 is required before selling to external practices.

---

## Security and Compliance Notes

- All PHI fields added in Phase 2 must be AES-256-GCM encrypted at rest per the
  existing pattern in `apps/api/src/lib/encrypt.js`.
- Video session JWT secrets must be stored in GCP Secret Manager, not in `.env`.
- Supervisor read access in Phase 3 requires RBAC checks — never relax role guards at the
  middleware layer.
- All new audit events must follow the canonical semantics (`success`, `failure`,
  `denied`, `error`) from `PLANS/FULL-SECURITY-AND-AUDITING.md`.
- No PHI, free text, names, IDs, or session content may appear in telemetry.

---

## Related Plans

- [`PLANS/FULL-SECURITY-AND-AUDITING.md`](FULL-SECURITY-AND-AUDITING.md) — audit event
  semantics; impersonation; tenant isolation requirements
- [`PLANS/TIME-TRACKING-COUNSELORS.md`](TIME-TRACKING-COUNSELORS.md) — clinical hour and
  licensure tracking; Phase 3 of this plan (supervisor_assignments) is a dependency for
  the supervision verification phase of time tracking
- [`PLANS/CHURCH-MANAGEMENT-MINISTRY-INTEGRATION.md`](CHURCH-MANAGEMENT-MINISTRY-INTEGRATION.md) —
  future church referral and care team integration (Phase 5, not covered here)
- [`docs/market-analysis-faithcounseling.md`](../docs/market-analysis-faithcounseling.md) —
  competitive analysis and SaaS pricing model that drives the prioritization above
- [`docs/cloud-implementation.md`](../docs/cloud-implementation.md) — GCP SaaS
  architecture spec; per-tenant Cloud SQL provisioning detail for Phase 4
