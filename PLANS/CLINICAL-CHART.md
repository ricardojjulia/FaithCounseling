# Clinical Chart — Implementation Plan

**Date:** 2026-03-30
**Status:** In Progress
**Goal:** Wire the "Clinical Chart" sidebar nav item to a fully functional clinical documentation page — session notes, internal notes, treatment plan, progress tracking, and homework.

---

## Problem Statement

The `clinical` nav item exists in the sidebar and has full i18n and telemetry support, but currently falls through to `showFallbackWorkspace` — it renders nothing. The database tables (`progress_notes`, `treatment_plans`), API route handlers, and query layer are fully implemented. Only the UI is missing and the API lacks a PATCH route for individual note updates.

---

## What Already Exists (Do Not Rebuild)

| Layer | What's Done |
|---|---|
| DB schema | `progress_notes`, `treatment_plans` tables with PHI encryption |
| API GET/POST | `/v1/clients/:id/progress-notes` — list + create notes |
| API GET/PUT | `/v1/clients/:id/treatment-plan` — get + upsert plan |
| DB queries | `listProgressNotes`, `createProgressNote`, `updateProgressNote`, `getTreatmentPlan`, `createTreatmentPlan`, `updateTreatmentPlan` |
| Domain enums | `progressNoteTypes`, `treatmentPlanStatuses` |
| i18n | `nav.clinical`, `topbar.clinical.title`, `topbar.clinical.subtitle` |
| Homework data | `form_assignments` — GET `/v1/forms/assignments?clientId=X` |
| Progress data | `form_submissions` — GET `/v1/forms/submissions?clientId=X` (includes scores) |

---

## Architecture Decision

**Standalone page** (not a ClientDetail tab). The nav item fires a top-level route (`currentView === 'clinical'`) so users can access charting without first navigating to a specific client. A client picker lives at the top of the page to select the client in context — same pattern used in DocumentsStudioTab.

---

## Scope of Changes

### New Files

```
apps/web/src/components/ClinicalChart/
  ClinicalChartPage.jsx         — main shell: client picker + 5 inner tabs
  tabs/SessionNotesTab.jsx      — clinical session notes (create/view/sign/lock)
  tabs/InternalNotesTab.jsx     — private counselor notes (editable, never locked)
  tabs/TreatmentPlanTab.jsx     — goals + interventions editor with status/versioning
  tabs/ProgressTab.jsx          — assessment score history from form_submissions
  tabs/HomeworkTab.jsx          — form assignments view as between-session homework
```

### Modified Files

| File | Change |
|---|---|
| `packages/domain/src/index.js` | Add `'internal_note'` to `progressNoteTypes` |
| `packages/i18n/src/index.js` | Add chart tab + note type i18n keys |
| `apps/api/src/index.js` | Add PATCH `/v1/clients/:id/progress-notes/:noteId` route for note updates + sign/lock |
| `apps/web/src/App.jsx` | Add `showClinical`, import `ClinicalChartPage`, render it |

---

## API Additions

### PATCH `/v1/clients/:id/progress-notes/:noteId`

**Purpose:** Update draft note content, or sign & lock a note.
**Enforcement:** Once `locked = 1`, all subsequent PATCH calls return 409 (note is locked).
**Payload:**
```json
{
  "noteType": "progress_note",
  "summary": "...",
  "interventions": ["..."],
  "locked": true,
  "signedBy": "counselor name"
}
```
**Route detection:** `pathname.startsWith('/v1/clients/') && pathname.includes('/progress-notes/') && !pathname.endsWith('/progress-notes')`

---

## UI Structure

```
ClinicalChartPage
├── Header: "Clinical Chart" title + subtitle
├── Client Selector (Select dropdown — required to use any tab)
└── Tabs (disabled until client selected)
    ├── Session Notes
    │   ├── New Note button → inline composer
    │   │   ├── Note type selector (Intake / Progress / Treatment Plan Review / Discharge)
    │   │   ├── Summary textarea (required)
    │   │   ├── Interventions (repeating text inputs, up to 10)
    │   │   ├── Save Draft  |  Sign & Lock
    │   └── Notes list (newest first)
    │       ├── Draft notes: editable + sign/lock button
    │       └── Locked notes: read-only badge + signed timestamp
    │
    ├── Internal Notes
    │   ├── New internal note composer
    │   └── Notes list (always editable, never locked)
    │       └── Tags: Risk / Family dynamics / Spiritual concerns
    │
    ├── Treatment Plan
    │   ├── Status selector (Draft / Active / On Hold / Completed)
    │   ├── Goals list (add/remove/edit each goal string)
    │   ├── Interventions list (add/remove/edit)
    │   ├── Review cadence + last reviewed date
    │   └── Save Plan button
    │
    ├── Progress
    │   ├── Scored instruments timeline (PHQ-9, GAD-7, PCL-5, BAI, AUDIT, ISI, RSES, OCI-R)
    │   ├── Per-instrument: score history newest→oldest with severity band badge
    │   └── Unscored forms shown as submission timestamps
    │
    └── Homework
        ├── Pending form assignments for this client
        └── Completed form assignments with submission date
```

---

## Compliance Notes

- Draft notes: fully editable, no lock.
- Signed & locked notes: `locked = 1`, `signed_by`, `signed_at` set. API enforces immutability (409 on subsequent PATCH/mutation).
- Internal notes: `note_type = 'internal_note'`, never locked, full audit trail, excluded from legal clinical record exports.
- All content stored encrypted via existing `encrypt()` / `decrypt()` layer.
- All mutations emit audit events (`chart.progress_note.*`, `chart.treatment_plan.*`).

---

## Out of Scope (Future)

- Rich text editor (TinyMCE/Tiptap) — @mantine/tiptap not in dependencies; Textarea used instead
- Per-goal progress scores over time — requires new `treatment_plan_goal_progress` table
- Note versioning history viewer — requires `progress_note_versions` table
- Attachments/file upload
- Homework assign-new-form from chart tab (use Workspace Studio → Documents)
- SOAP structured note body columns (subjective/objective/assessment/plan) — requires schema migration
- Appointment linkage on notes — requires `appointment_id` FK on `progress_notes`
