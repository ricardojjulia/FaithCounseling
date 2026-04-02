# INTAKE PREVIEW

**Status:** Proposed implementation plan
**Prepared:** April 2, 2026
**Branch baseline:** `main`

## Product Call

The underlying idea is strong, but the original framing is too aggressive for a counseling platform.

We should not build a profiling engine that makes race, sex, education, geography, or speculative causality conclusions from intake data. That would create privacy, bias, and trust problems immediately.

We should build a safer and still differentiated feature:

- a counselor-only `Intake Preview`
- shown before the first held session
- based on explicit submitted intake content, structured portal profile data, and scored assessments
- framed as `reported context`, `screening signals`, `care route hypotheses`, and `review prompts`

## Goal

Help a counselor walk into a first session better prepared without pretending the system already knows the client.

## Eligible Use Case

The preview is available only when:

- intake documentation is complete or reviewed
- the client has not yet had a held session

Future scheduled appointments are allowed. The preview is intended to support those pre-session handoffs.

## Explicit Non-Goals

- no protected-trait inference
- no geography-based profiling
- no education-level inference
- no socioeconomic inference
- no speculative causality
- no final diagnosis generation
- no automatic chart writes
- no client-facing preview

## Safe Output Contract

The preview payload should contain:

- eligibility summary
- intake completion status
- explicit reported context:
  - age band
  - pronouns or gender identity only if explicitly provided
  - marital or household context if explicitly provided
  - occupation or education only if explicitly provided
  - faith background or integration preference if explicitly provided
  - location context limited to reported city/state or state only
- presenting concerns:
  - primary concern
  - secondary concerns
  - reported duration or onset
  - reported severity
  - daily impact summary
- reported contributors:
  - precipitating events
  - stressors
  - what helps
  - prior attempts
- screening signals:
  - scored assessments already on file
  - prior treatment or hospitalization disclosures
  - self-harm or suicide screening responses
  - prior diagnoses only as `reported prior diagnoses`
- care route hypotheses:
  - bounded suggestions such as anxiety support, trauma review, couples work, grief support, sleep support, substance-use screening, faith-integrated counseling
- areas to assess:
  - short clinician prompts, not conclusions
- explicit disclaimer:
  - AI-assisted support only
  - final clinical judgment belongs to the counselor
  - crisis situations require immediate human intervention

## API Shape

Add:

- `GET /v1/clients/:id/intake-preview`

Behavior:

- tenant-scoped and object-scoped through the same authorized-client resolver used by client detail routes
- returns `eligible: false` plus reasons when the client does not qualify
- returns only bounded structured fields when eligible
- emits audit event `client.intake_preview.read`

## UI Placement

Add a new counselor/staff tab on client detail:

- `Intake Preview`

Behavior:

- loads only on tab view
- shows structured cards, not dense raw JSON or free-text dump
- prominently labels route suggestions as provisional
- shows empty or ineligible state when the client has prior held sessions or incomplete intake

## Monitoring

New visible surface:

- `client.intake_preview`

Required telemetry:

- surface view
- load duration
- active duration
- fetch success/failure
- empty/ineligible state exposure

No client content or free text may appear in telemetry.

## Implementation Phases

### Phase 1

- define synthesis guardrails
- implement preview API
- add in-memory seed coverage for one eligible pre-session client
- add API tests for auth and eligibility

### Phase 2

- add client-detail tab
- register the new monitored surface
- show structured preview cards and disclaimer
- update docs

## Validation

- API route tests for allow/deny behavior
- API route tests for eligible and ineligible states
- web build
- manual review of the client-detail tab for:
  - eligible client
  - client with prior sessions
  - incomplete intake client

## Follow-Up

- support DB-backed richer extraction from additional intake forms
- optionally link review prompts into charting or scheduling handoff actions
- add a counselor acknowledgement state if the team wants explicit first-session prep review tracking
