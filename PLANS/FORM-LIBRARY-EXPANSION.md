# Form Library Expansion Plan

Date: March 29, 2026
Status: ✅ COMPLETE
Owner: Codex session

## Goal

Expand the electronic documents library from a screening-heavy catalog into a fuller counseling toolkit that covers:

- consent and administrative intake
- deeper clinical assessment
- treatment planning
- therapeutic worksheets and homework
- faith-integrated reflection tools

The expansion must fit the current `FormRunner` schema, remain visible in the shared Documents surface, and preserve the existing monitoring baseline for the Documents route.

## Current Baseline

The current library already includes intake, depression, anxiety, trauma, substance, sleep, grief, burnout, family, and spiritual assessment coverage. The largest gaps are:

- consent and ROI paperwork
- biopsychosocial and MSE workflow support
- treatment-planning documents
- structured homework/worksheet tools
- dedicated Christian counseling reflection forms beyond the spiritual wellness inventory

## Scope

This rollout adds 20 new form definitions:

1. Informed Consent Form
2. Telehealth Consent Form
3. Release of Information Authorization
4. Biopsychosocial Assessment
5. Mental Status Exam
6. Safety Plan Template
7. Mood Disorder Questionnaire
8. Eating Disorder Screening
9. Anger Assessment Scale
10. Individual Treatment Plan
11. SMART Goals Worksheet
12. Relapse Prevention Plan
13. CBT Thought Record
14. Cognitive Distortions Worksheet
15. Behavioral Activation Schedule
16. Coping Skills Plan
17. Grounding Techniques Worksheet
18. Mindfulness Practice Log
19. Faith History Questionnaire
20. Values and Biblical Identity Worksheet

## Delivery Phases

### Phase 1: Consent and clinical foundation

Add the forms that close intake, consent, and baseline assessment gaps:

- Informed Consent Form
- Telehealth Consent Form
- Release of Information Authorization
- Biopsychosocial Assessment
- Mental Status Exam
- Safety Plan Template
- Mood Disorder Questionnaire
- Eating Disorder Screening
- Anger Assessment Scale

### Phase 2: Treatment planning and worksheets

Add structured care-planning and between-session tools:

- Individual Treatment Plan
- SMART Goals Worksheet
- Relapse Prevention Plan
- CBT Thought Record
- Cognitive Distortions Worksheet
- Behavioral Activation Schedule
- Coping Skills Plan
- Grounding Techniques Worksheet
- Mindfulness Practice Log

### Phase 3: Faith-integrated reflection tools

Round out the Christian counseling library:

- Faith History Questionnaire
- Values and Biblical Identity Worksheet

### Phase 4: Catalog, docs, and validation

Wire the forms into:

- the shared Documents registry
- the API default form catalog
- README and release notes
- a Documents surface regression so the expanded library is exercised in browser coverage

## Category Model

The new forms extend the catalog with four broader library categories:

- `administrative`
- `assessment`
- `treatment`
- `worksheets`

Existing categories remain in place for the already shipped screening tools. Faith-specific additions continue to live under `faith`.

## Implementation Notes

- Keep all new forms compatible with the existing `FormRunner` field schema.
- Do not introduce PHI into telemetry labels or surface IDs.
- Do not split these forms into a second document engine; the current runner is sufficient.
- Prefer grouped form-definition modules to keep the library maintainable.
- Update user-facing copy in the Documents page so it reflects a broader library than assessments alone.

## Validation

Minimum validation for this rollout:

- `pnpm lint`
- `pnpm --filter @churchcore/web build`
- targeted Playwright regression for the Documents route

## Outcome

This plan turns the Documents module into a fuller counseling operations library without changing the current route structure, persistence model, or form runner contract.
