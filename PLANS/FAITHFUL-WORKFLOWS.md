# Faithful Workflows — Coding Plan & File-by-File Implementation Plan

**Date:** 2026-03-31
**Target version:** 5.5.0 (minor — new counselor-facing feature page)
**Status:** Planning

---

## Feature Overview

A counselor-facing three-panel workspace that reviews each client's clinical data and surfaces prioritized, explainable, actionable care recommendations using a hybrid deterministic-rules + template-rationale engine. Faith-integrated guidance is clearly labeled optional. The page is already registered in the sidebar under the `faith` nav key.

---

## Architectural Decisions

### 1. No React Flow / third-party graph library
The bundle is already 544 KB (minified). Adding ReactFlow would add ~180 KB. Instead, the workflow canvas is built with **Mantine Paper nodes + SVG connector lines** — a vertical DAG layout where nodes stack downward with category-colored connectors drawn in an SVG overlay. This is fully sufficient for a linear/branching counselor workflow (not an arbitrary free-form diagram).

### 2. Hybrid recommendation engine — deterministic first, template rationale
The rules engine is a pure client-side JS module. Each rule is a named function that inspects structured client data and emits zero or more `Recommendation` objects. No LLM is called; rationale strings are generated from templates interpolated with actual data values. This keeps recommendations fully auditable ("rule X fired because PHQ-9 = 18 > threshold 15").

AI rationale integration (Phase 3) is reserved for a POST to a future `/v1/workflows/rationale` endpoint, which the API can delegate to an LLM. Until then, template rationale is used.

### 3. Three-panel layout
```
┌─────────────────────────────────────────────────────────────────────┐
│ [Safety Banner — always visible]                                     │
├──────────────┬─────────────────────────────┬────────────────────────┤
│ Client List  │   Workflow Canvas            │  Detail Drawer         │
│ (280 px)     │   (flex-1)                  │  (360 px, slide-in)    │
│              │                              │                        │
│  Ranked by   │  ● Client Snapshot          │  [selected node]       │
│  urgency     │      │                       │  Why surfaced          │
│              │  ● Safety / Escalation      │  Evidence snippets     │
│  Each row:   │      │                       │  Clinical relevance    │
│  - Name      │  ● Clinical Cautions        │  Faith relevance       │
│  - Urgency   │      │                       │  Cautions              │
│  - # recs    │  ● Session Focus            │  Actions               │
│  - Top chips │      │                       │                        │
│  - Dx summary│  ● Homework                 │                        │
│  - Last seen │      │                       │                        │
│  - Trend     │  ● Spiritual Care           │                        │
│              │      │                       │                        │
│              │  ● Coordination / Admin      │                        │
│              │      │                       │                        │
│              │  ● Monitoring               │                        │
└──────────────┴─────────────────────────────┴────────────────────────┘
```

### 4. Data loading strategy
- Client list: already available from `App.jsx` `clientsData.items` prop
- Per-client enriched data: fetched lazily when a client is selected
  - `GET /v1/clients/:id` (demographics, status)
  - `GET /v1/clients/:id/diagnoses`
  - `GET /v1/clients/:id/progress-notes`
  - `GET /v1/clients/:id/treatment-plan`
  - `GET /v1/clients/:id/faith-profile`
  - `GET /v1/forms/client-overview` (assessment scores)
  - `GET /v1/appointments?clientId=:id` (attendance)
- All enriched data is cached in a `clientDataCache` Map keyed by clientId
- Ranking/urgency scoring for the client list is computed from `clientsData.items` alone (fields available at list level), then re-scored once enriched data loads

### 5. Recommendation categories and node colors
| Category | Key | Color |
|---|---|---|
| Immediate Safety / Escalation | `safety` | red |
| Clinical Cautions | `clinical_caution` | orange |
| Session Focus | `session_focus` | blue |
| Homework / Between-session | `homework` | cyan |
| Relationship / Family / Systems | `relationship` | indigo |
| Spiritual / Christian opportunities | `spiritual` | grape |
| Coordination / Admin | `coordination` | gray |
| Monitoring / Reassessment | `monitoring` | teal |

### 6. Confidence and priority scores
- `priority`: 1–10 integer (10 = most urgent)
- `confidence`: 0.0–1.0 float, displayed as percentage
- Both are computed by the rules engine, not randomized
- Priority ordering within the canvas: safety always first, then by score descending

---

## Domain Types (JSDoc)

```js
/**
 * @typedef {Object} Recommendation
 * @property {string} id           — unique id (rule name + client id)
 * @property {string} category     — one of the 8 category keys
 * @property {string} title
 * @property {string} summary      — 1–2 sentence summary
 * @property {string} rationale    — full explanation (template or AI)
 * @property {string[]} evidence   — data snippets that triggered this rule
 * @property {number} priority     — 1–10
 * @property {number} confidence   — 0–1
 * @property {string[]} cautions   — optional clinical caution notes
 * @property {string[]} actions    — list of action key strings
 * @property {string|null} faithNote — optional faith-integrated note (never required)
 * @property {'pending'|'complete'|'deferred'|'hidden'} status
 * @property {string|null} orderedAfter — id of recommendation this should follow
 */

/**
 * @typedef {Object} ClientWorkflowData
 * @property {Object} client
 * @property {Object[]} diagnoses
 * @property {Object[]} progressNotes
 * @property {Object|null} treatmentPlan
 * @property {Object|null} faithProfile
 * @property {Object[]} appointments
 * @property {Object[]} assessments   — scored form submissions
 * @property {'loading'|'ready'|'error'} status
 */

/**
 * @typedef {Object} ClientRankEntry
 * @property {string} clientId
 * @property {string} displayName
 * @property {number} urgencyScore   — 0–100
 * @property {'critical'|'high'|'moderate'|'routine'} urgencyLevel
 * @property {number} recommendationCount
 * @property {string[]} topReasonChips   — max 3 short reason labels
 * @property {string} diagnosisSummary   — e.g. "MDD, GAD"
 * @property {string|null} lastActivityDate
 * @property {'improving'|'stable'|'declining'|'unknown'} trend
 */
```

---

## Rules Engine Design

### Rule categories and triggers

**Safety rules** (`safetyRules.js`)
- `rule_safety_phq9_severe`: PHQ-9 ≥ 20 (severe) → immediate escalation node
- `rule_safety_phq9_si`: PHQ-9 item 9 ≥ 2 → safety planning node
- `rule_safety_pcl5_high`: PCL-5 ≥ 51 → trauma crisis protocol
- `rule_safety_no_show_series`: 3+ consecutive no-shows → welfare check
- `rule_safety_risk_note`: Progress note contains risk keywords → flag

**Clinical caution rules** (`clinicalRules.js`)
- `rule_clinical_phq9_worsening`: Last 2 PHQ-9 scores increasing → review
- `rule_clinical_gad7_high`: GAD-7 ≥ 15 → medication coordination flag
- `rule_clinical_no_treatment_plan`: No active treatment plan → create one
- `rule_clinical_stale_treatment_plan`: Plan not reviewed in >90 days → review
- `rule_clinical_no_progress_notes_30d`: No note in 30+ days for active client
- `rule_clinical_diagnosis_without_goal`: Diagnosis with no corresponding treatment goal

**Session focus rules** (`sessionRules.js`)
- `rule_session_goal_overdue`: Treatment goal target date passed without completion
- `rule_session_homework_incomplete`: Assigned homework not submitted
- `rule_session_assessment_pending`: Assigned assessment not completed

**Homework rules** (`homeworkRules.js`)
- `rule_homework_no_between_session`: No homework assigned in last 2 sessions
- `rule_homework_journal_suggestion`: PHQ or GAD elevated → suggest journaling

**Spiritual rules** (`spiritualRules.js`) — ALL OPTIONAL
- `rule_spiritual_has_faith_profile`: Faith profile exists → spiritual care node available
- `rule_spiritual_integration_requested`: Client opted in to faith integration → suggest biblical integration modality
- `rule_spiritual_grief`: Grief diagnosis + faith background → offer faith-based grief support (labeled optional)

**Coordination rules** (`coordinationRules.js`)
- `rule_coordination_insurance_needed`: No insurance on file for active client
- `rule_coordination_referral_pending`: Open referral with no follow-up note
- `rule_coordination_church_referral_available`: Faith profile + referral coordination available

**Monitoring rules** (`monitoringRules.js`)
- `rule_monitoring_reassess_90d`: No assessment in 90+ days
- `rule_monitoring_discharge_candidate`: Goals met + completed status → consider discharge planning

### Rule scoring
Each rule exports a `score` function:
```js
export function rulePhq9Severe(clientData) {
  const latest = getLatestScore(clientData.assessments, 'PHQ-9');
  if (!latest || latest.score < 20) return null;
  return {
    priority: 10,
    confidence: 1.0,
    evidence: [`PHQ-9 score: ${latest.score} (severe range ≥20)`, `Scored on: ${latest.date}`],
    // ...
  };
}
```

### Urgency scoring for client list ranking
```
urgencyScore = 0
  + (hasPhq9Severe ? 40 : 0)
  + (hasPhq9SI ? 35 : 0)
  + (hasConsecutiveNoShows ? 20 : 0)
  + (hasWorseningAssessment ? 15 : 0)
  + (noTreatmentPlan ? 10 : 0)
  + min(recommendationCount * 2, 10)
  → clamped to 0–100
```
Urgency level:
- 70–100: critical (red)
- 40–69: high (orange)
- 20–39: moderate (yellow)
- 0–19: routine (gray)

---

## Safety Rules (Non-Negotiable)

These are enforced in the renderer, not just the rules engine:

1. Safety nodes are always rendered first regardless of order
2. If `urgencyLevel === 'critical'`, the safety banner shows a distinct critical-state warning
3. `spiritual` category nodes are always rendered with an "(Optional)" chip and muted styling
4. No spiritual node can have priority > any safety or clinical node for the same client
5. AI rationale, when integrated, is post-processed to strip any language implying symptoms are faith-related
6. All action outputs (session agendas, notes, messages) include a watermark: "AI-assisted draft — requires counselor review before use"

---

## Implementation Phases

### Phase 1: Page Shell + Mock UI (THIS PLAN — execute first)
Deliverables:
- Three-panel layout (responsive: collapses to tabs on mobile)
- Client list panel with mock urgency ranking
- Workflow canvas with static mock nodes
- Detail drawer (slide-in) with mock recommendation details
- Safety banner
- All UI states: loading, empty, error, no-client-selected
- Wire to real `clientsData.items` for the client list (names + basic info)
- App.jsx routing for `showFaith`

### Phase 2: Domain Models + Rules Engine Scaffolding
Deliverables:
- `engine/types.js` — JSDoc types
- `engine/rules/` — one file per rule category
- `engine/scoreClient.js` — urgency scorer
- `engine/runWorkflow.js` — orchestrator that calls all rules and returns sorted recommendations
- `engine/mockData.js` — 5 mock clients with rich data + expected workflow outputs (documented)
- Unit tests for each rule

### Phase 3: Real Data + AI Rationale
Deliverables:
- `useClientWorkflowData.js` hook — fetches and caches enriched client data
- Wire rules engine to real API data
- Implement optional AI rationale via `POST /v1/workflows/rationale` (API stub)
- Template rationale fallback when AI endpoint unavailable

### Phase 4: Action Persistence + Backend Wiring ✅ COMPLETE (2026-04-01)

Delivered in commit `8f60c57` / PR #6.

**Database:**

- `workflow_recommendation_states` table — upsert-based, one row per rule per client, auto-expiry (hidden: 30 days, deferred: until chosen date), PHI-encrypted notes column, tenant-isolated via FK cascade

**API:**

- `POST /v1/workflows/recommendations/state` — upsert a counselor action
- `GET  /v1/workflows/recommendations/state?clientId=` — load persisted states on client select
- `DELETE /v1/workflows/recommendations/state/:id` — undo defer/hide
- Audit events on all three; `notes_enc` excluded from audit payload (PHI)
- `faithfulWorkflowCounts` in operations summary now excludes clients with all-dismissed states

**Frontend:**

- `FaithWorkflowsPage.jsx` — fetches persisted states alongside clinical data; merges into `runWorkflow()` output via `applyPersistedStates()`; posts changes optimistically
- `RecommendationDrawer.jsx` — mark complete, defer (date picker), hide, and reopen wired; safety-locked recs (priority ≥ 9) cannot be hidden/deferred
- `engine/contentTemplates.js` (new) — static template library for all 7 content actions: session agenda, note prep, verse suggestions, prayer prompt, CBT exercise, journal prompt, follow-up message draft

### Phase 5: Testing + Safety Hardening + Performance
**Status: ✅ COMPLETE**

Deliverables:
- ✅ **Rules engine integration tests** — `engine/runWorkflow.test.mjs` (51 tests, all green)
  - Covers all 5 mock clients: Emma (critical), Marcus (high), Priya (moderate), David (routine), Sarah (discharge)
  - Tests: category presence/absence, safety rule fires, ruleId correctness, no duplicate IDs, sort order, safety lock invariant, null safety, idempotency, required field shapes
- ✅ **Production bug fixes discovered by tests**:
  - `monitoringRules.js` — `buildOverdueRec` crash: `data` not in scope (fixed: param added)
  - `safetyRules.js` — `'SI'` keyword matched substring in common words like "assigned", "transition", "consistent" (fixed: word-boundary regex for short abbreviations)
- ✅ **Telemetry events** wired in `FaithWorkflowsPage.jsx`:
  - `recommendations_surfaced` (with `with_safety`/`no_safety` signal) — fired on client selection
  - `client_selected` — fired on left-panel client click
  - `recommendation_opened` — fired when recommendation drawer opens
  - `recommendation_${status}` — fired on status change (complete, defer, hide)
  - `action_${actionType}` — fired on content action button click
  - Zero PHI emitted: only category names and count bands in telemetry attrs
- UI regression tests and performance review deferred to Phase 6 (browser automation required for full panel interaction tests)

---

## File-by-File Implementation Plan

### New files

```
apps/web/src/components/FaithWorkflows/
├── FaithWorkflowsPage.jsx           — main three-panel shell + data orchestration
├── ClientRankList.jsx               — left panel: ranked client list with urgency UI
├── WorkflowCanvas.jsx               — center panel: vertical DAG node graph (SVG lines)
├── WorkflowNode.jsx                 — individual recommendation node card
├── RecommendationDrawer.jsx         — right panel: detail drawer for selected node
├── SafetyBanner.jsx                 — always-visible safety disclaimer banner
├── engine/
│   ├── types.js                     — JSDoc type definitions
│   ├── mockData.js                  — 5 sample mock clients + expected outputs
│   ├── scoreClient.js               — urgency scoring from lightweight client fields
│   ├── runWorkflow.js               — orchestrator: calls all rules, sorts output
│   └── rules/
│       ├── safetyRules.js           — PHQ-9 severe, SI, PCL-5, no-show, risk notes
│       ├── clinicalRules.js         — worsening scores, stale plan, no notes
│       ├── sessionRules.js          — overdue goals, incomplete homework
│       ├── homeworkRules.js         — between-session homework suggestions
│       ├── spiritualRules.js        — optional faith-integrated suggestions
│       ├── coordinationRules.js     — insurance, referrals, admin
│       └── monitoringRules.js       — reassessment, discharge planning
```

### Modified files

| File | Change |
|------|--------|
| `apps/web/src/App.jsx` | Add `showFaith`, `import FaithWorkflowsPage`, render condition |
| `packages/i18n/src/index.js` | Add `workflow.*` keys |
| `packages/domain/src/index.js` | Add `workflowCategories`, `workflowActionTypes` enums |
| `docs/change-log.md` | v5.5.0 entry |

### No API changes in Phase 1
Phase 1 uses mock data. Phase 3 adds a `POST /v1/workflows/rationale` stub.

---

## Mock Clients + Expected Workflow Outputs

### Client 1: "Emma R." — Critical urgency
- PHQ-9 = 22 (severe), item 9 = 3 (active SI)
- 2 consecutive no-shows
- No safety plan documented
- Active MDD diagnosis, no matching treatment goal
- Faith: Methodist, has faith profile
**Expected workflow:**
1. [SAFETY] Immediate safety assessment (priority 10, confidence 1.0)
2. [SAFETY] Safety plan creation needed (priority 10, confidence 1.0)
3. [CLINICAL] Treatment goal missing for MDD (priority 8, confidence 0.9)
4. [COORDINATION] Welfare check — missed 2 consecutive sessions (priority 8, confidence 0.95)
5. [SPIRITUAL — optional] Faith-integrated crisis support available (priority 2, confidence 0.7)

### Client 2: "Marcus T." — High urgency
- PHQ-9 trending up (12→16→18 over 3 sessions)
- GAD-7 = 15
- Treatment plan not reviewed in 95 days
- 1 pending homework assignment (thought record)
**Expected workflow:**
1. [CLINICAL] PHQ-9 worsening trend — review treatment approach (priority 8, confidence 0.85)
2. [CLINICAL] Stale treatment plan — 95 days since review (priority 7, confidence 1.0)
3. [CLINICAL] GAD-7 high — consider medication consultation (priority 6, confidence 0.8)
4. [SESSION] Pending homework — thought record not submitted (priority 5, confidence 1.0)
5. [MONITORING] PHQ-9 reassessment recommended at next session (priority 4, confidence 0.9)

### Client 3: "Priya K." — Moderate urgency
- Active, PHQ-9 = 9 (mild), stable
- No assessments in 95 days
- No progress notes in 35 days
- Has active treatment plan with 1 overdue goal
- Faith: Hindu (no faith integration)
**Expected workflow:**
1. [CLINICAL] No progress note in 35 days (priority 6, confidence 1.0)
2. [MONITORING] Reassessment overdue — 95 days (priority 5, confidence 1.0)
3. [SESSION] Treatment goal overdue: "Reduce avoidance behaviors" (priority 5, confidence 0.9)
4. [COORDINATION] Insurance not on file (priority 3, confidence 1.0)

### Client 4: "David L." — Routine
- Stable, PHQ-9 = 6, GAD-7 = 4
- Active plan reviewed 20 days ago
- Progress notes up to date
- Faith: Baptist, opted in to faith integration, faith profile complete
- No homework in last 2 sessions
**Expected workflow:**
1. [HOMEWORK] No between-session homework in 2 sessions (priority 4, confidence 0.9)
2. [SPIRITUAL — optional] Biblical integration modality available (priority 3, confidence 0.8)
3. [SPIRITUAL — optional] Suggest Scripture journaling exercise (priority 2, confidence 0.75)

### Client 5: "Sarah M." — Discharge candidate
- Goals met (3/3), status: completing, PHQ-9 = 4
- No active concerns
- Last reviewed 14 days ago
**Expected workflow:**
1. [MONITORING] Discharge planning — all goals met (priority 4, confidence 0.85)
2. [COORDINATION] Closing summary note recommended (priority 3, confidence 0.9)
3. [SPIRITUAL — optional] Offer transition/blessing prayer if appropriate (priority 1, confidence 0.6)

---

## Action Buttons — Phase 4 Spec

| Action Key | Label | Category where shown |
|---|---|---|
| `generate_session_agenda` | Generate Session Agenda | session_focus |
| `generate_note_prep` | Progress Note Prep | session_focus, clinical_caution |
| `suggest_verses` | Suggest Bible Verses | spiritual |
| `create_prayer_prompt` | Prayer Prompt | spiritual |
| `create_cbt_exercise` | CBT / Grounding Exercise | homework, session_focus |
| `create_journal_prompt` | Journaling Prompt | homework |
| `draft_followup_message` | Draft Follow-up Message | coordination, monitoring |
| `add_reminder_task` | Add Reminder | any |
| `create_treatment_plan_update` | Treatment Plan Update Draft | clinical_caution |
| `mark_complete` | Mark Complete | any |
| `defer` | Defer | any |
| `hide` | Hide | any |

All generated text outputs display: `⚠ AI-assisted draft — final judgment belongs to the counselor`

---

## Unresolved Risks / Assumptions

1. **No LLM integration yet** — Rationale is template-based in Phase 1–2. Phase 3 assumes a future API endpoint. Templates are clinically reviewed before ship.

2. **Assessment score shape** — The `assessments` from `GET /v1/forms/client-overview` may return raw scores or severity bands. Rules engine must handle both shapes gracefully. Need to confirm schema before Phase 3.

3. **Progress note keyword extraction for risk signals** — Rule `rule_safety_risk_note` requires scanning note text for risk keywords. PHI concern: this happens client-side (already decrypted in API response). No note text leaves the browser.

4. **Faith profile availability** — `GET /v1/clients/:id/faith-profile` endpoint exists in API route table but its response shape is unconfirmed. Spiritual rules must gracefully degrade if faith profile returns 404 or empty.

5. **Client list urgency scoring without enriched data** — Initial ranking uses only fields available in `GET /v1/clients` list (status, highTouchpoint, last activity). Full urgency scoring requires per-client enriched data. Solution: show preliminary ranking immediately, re-sort after enriched data loads.

6. **Performance with 100+ clients** — Left panel list can be virtualized using `@mantine/core` ScrollArea + manual offset rendering if needed. Not needed for Phase 1.

7. **Canvas layout for many recommendations** — If a client has 10+ recommendations, the vertical canvas becomes very long. Phase 1 keeps a fixed max-height with scroll. Phase 5 evaluates collapsible category sections.

8. **Persistence of action status (complete/deferred/hidden)** — Phase 1 stores status in React state only (lost on page refresh). Phase 4 evaluates persisting to `localStorage` keyed by `tenantId:clientId:ruleId`.

9. **No "AI suggestions replace crisis protocol"** — This must be enforced at the renderer level. Safety nodes must never be hideable or deferrable when `priority >= 9`.

---

## Safety Checklist (Pre-Ship)

- [ ] Safety nodes are always rendered first
- [ ] Safety nodes with priority ≥ 9 cannot be hidden or deferred
- [ ] Spiritual nodes are always labeled "(Optional)"
- [ ] No spiritual node has priority > any safety/clinical node for same client
- [ ] No rationale text implies symptoms are caused by weak faith
- [ ] AI-generated content is watermarked as requiring counselor review
- [ ] Safety banner is visible on all states of the page
- [ ] Spiritual suggestions are absent if client has no faith profile or did not opt in
- [ ] No demographic inference beyond what is explicitly in the client record

---

## i18n Keys to Add

```js
// Workflow page
'workflow.title': 'Faithful Workflows'
'workflow.subtitle': 'Counselor-facing care recommendations — review before acting'
'workflow.safetyBanner': 'Recommendations are AI-assisted and supportive only. Final clinical judgment belongs to the counselor. Crisis situations require immediate human intervention.'
'workflow.selectClient': 'Select a client to view their workflow'
'workflow.noClients': 'No clients available'
'workflow.loading': 'Loading workflow...'
'workflow.error': 'Unable to load workflow data'
'workflow.aiDisclaimer': 'AI-assisted draft — requires counselor review before use'
'workflow.optional': 'Optional'

// Category labels
'workflow.category.safety': 'Safety / Escalation'
'workflow.category.clinical_caution': 'Clinical Cautions'
'workflow.category.session_focus': 'Session Focus'
'workflow.category.homework': 'Homework'
'workflow.category.relationship': 'Relationship / Family'
'workflow.category.spiritual': 'Spiritual Care'
'workflow.category.coordination': 'Coordination'
'workflow.category.monitoring': 'Monitoring'

// Urgency levels
'workflow.urgency.critical': 'Critical'
'workflow.urgency.high': 'High'
'workflow.urgency.moderate': 'Moderate'
'workflow.urgency.routine': 'Routine'

// Node fields
'workflow.node.priority': 'Priority'
'workflow.node.confidence': 'Confidence'
'workflow.node.evidence': 'Evidence'
'workflow.node.rationale': 'Rationale'
'workflow.node.cautions': 'Cautions'
'workflow.node.faithNote': 'Faith Integration (Optional)'

// Actions
'workflow.action.sessionAgenda': 'Session Agenda'
'workflow.action.notePrep': 'Note Prep'
'workflow.action.suggestVerses': 'Bible Verses'
'workflow.action.prayerPrompt': 'Prayer Prompt'
'workflow.action.cbtExercise': 'CBT Exercise'
'workflow.action.journalPrompt': 'Journal Prompt'
'workflow.action.followupMessage': 'Follow-up Message'
'workflow.action.addReminder': 'Add Reminder'
'workflow.action.treatmentPlanUpdate': 'Plan Update'
'workflow.action.markComplete': 'Mark Complete'
'workflow.action.defer': 'Defer'
'workflow.action.hide': 'Hide'

// Drawer fields
'workflow.drawer.whySurfaced': 'Why This Was Surfaced'
'workflow.drawer.clinicalRelevance': 'Clinical Relevance'
'workflow.drawer.faithRelevance': 'Faith Integration'
'workflow.drawer.cautions': 'Cautions'
'workflow.drawer.suggestedOrder': 'Suggested Order'
'workflow.drawer.docConsiderations': 'Documentation Considerations'
'workflow.drawer.trend.improving': 'Improving'
'workflow.drawer.trend.stable': 'Stable'
'workflow.drawer.trend.declining': 'Declining'
'workflow.drawer.trend.unknown': 'Unknown trend'
```

---

## Implementation Order (Phase 1 — this session)

1. Add i18n keys + domain enums
2. `engine/types.js` — JSDoc types
3. `engine/mockData.js` — 5 mock clients + expected outputs
4. `engine/rules/safetyRules.js` + `engine/scoreClient.js` (enough to rank mock clients)
5. `engine/runWorkflow.js` — orchestrator (Phase 1: only safety + clinical + spiritual rules)
6. `SafetyBanner.jsx`
7. `WorkflowNode.jsx`
8. `RecommendationDrawer.jsx`
9. `WorkflowCanvas.jsx`
10. `ClientRankList.jsx`
11. `FaithWorkflowsPage.jsx` — assemble all panels
12. Wire App.jsx
13. Build + version bump 5.5.0 + commit

Full rules engine (all 7 rule files) + real data wiring → Phase 2 / next session.
