# DEMO DATA RESILIENCY

**Status:** Approved implementation plan
**Prepared:** March 30, 2026
**Scope:** Demo dataset finalization, DB reset workflow, verification, docs
**Security baseline:** [PLANS/FULL-SECURITY-AND-AUDITING.md](FULL-SECURITY-AND-AUDITING.md)

## Purpose

Define the canonical human-testing dataset and the deterministic workflow that restores it after engineering validation is complete.

This plan exists so demo and human-testing sessions always start from the same known state instead of inheriting drift from smoke tests, security runs, exploratory QA, or feature-specific agents.

## Non-Negotiable Rules

- The finalizer runs only after all testing, smoke testing, and session/security validation are complete.
- The finalizer must be deterministic and idempotent.
- The finalizer must target mutable demo data only.
- The finalizer must never delete or rewrite `audit_events`.
- The finalizer must clear live auth/session rows so human testing starts clean.
- The finalizer must fail closed: if verification fails, rollback the transaction and report failure.
- The canonical dataset for the `system` tenant must always be the same in identity, structure, and coverage.

## Canonical Dataset

### Staff

Allowed visible counselor accounts:

- `Ricardo Julia`
- `Mercy Robles`

Additional allowed non-counselor account:

- one practice-admin login for operator access

No other counselor-role staff may remain after finalization.

### Clients

The canonical demo set contains exactly 10 clients.

Each client must have:

- core client row
- lifecycle row
- address row
- phone row
- contact row
- insurance row
- referring provider row
- diagnosis row
- medication row
- allergy row
- clinical history row
- faith profile row
- legal/guardian row
- portal account
- portal profile
- consent record
- intake packet
- treatment plan

### Scheduling And Charting

Each client must have five appointments total:

- one past `scheduled`
- one past `completed`
- one past `completed` with a linked `progress_note`
- two future `scheduled`

Dates may be generated relative to the run date so the appointments always remain in the past, but the pattern must remain fixed.

### Forms

Each client must have the canonical default signup forms attached:

- `ShortIntakeForm`
- `InformedConsentForm`
- `AnxietyAssessment`
- `PHQ9`

Each client must also have demo submissions for those same forms.

### Financial Coverage

The canonical dataset must include:

- offerings for a subset of clients
- paid billing rows for a smaller subset of clients

This is required so human testing can validate both the Offerings surface and the billing/reporting paths without manual setup.

## Operating Model

The demo dataset workflow is a final-stage data finalizer, not a freeform seed script and not an LLM-generated cleanup routine.

Required entry points:

- `pnpm demo:apply`
- `pnpm demo:verify`
- `pnpm demo:finalize`

Expected use:

1. Run fix validation and smoke/security/session coverage.
2. Run `pnpm demo:finalize`.
3. Hand the environment to human testers only after the finalizer reports success.

## Implementation Contract

The implementation must:

- run in DB mode only
- use a transaction
- remove mutable demo rows for the `system` tenant
- rebuild the canonical tenant/practice/location rows needed for human testing
- rebuild the canonical staff rows and credentials
- rebuild the canonical client rows and all dependent records
- seed form catalog defaults and portal settings required by the dataset
- seed offerings and billing rows required by the dataset
- delete active `sessions`, `portal_sessions`, and `portal_password_resets`
- verify exact invariants before commit

The implementation must not:

- modify `audit_events`
- create ad hoc extra users or clients
- freestyle SQL outside the finalizer workflow
- leave partial state behind on failure

## Verification Requirements

The verifier must confirm:

- exact staff count
- exact counselor count
- exact counselor names
- exact client count
- exact client ids
- exact appointment count
- exact linked progress-note count
- exact default-form assignment count
- exact default-form submission count
- every client has all default form assignments
- every client has all default form submissions
- exact offering count
- exact invoice count
- exact payment count
- exact portal-account count
- exact portal-profile count
- zero active staff sessions
- zero active portal sessions

## Security And Compliance Constraints

- Follow the security baseline in [PLANS/FULL-SECURITY-AND-AUDITING.md](FULL-SECURITY-AND-AUDITING.md).
- Do not export audit rows through telemetry.
- Do not place PHI in telemetry labels or operational logs.
- Keep audit and demo-reset concerns separate.
- If the finalizer later gains audit instrumentation, it must use canonical audit result semantics: `success`, `failure`, `denied`, `error`.

## Source Of Truth

The code implementation for this plan lives under:

- `ops/demo-dataset/manifest.mjs`
- `ops/demo-dataset/common.mjs`
- `ops/demo-dataset/apply.mjs`
- `ops/demo-dataset/verify.mjs`
- `ops/demo-dataset/finalize.mjs`

This plan is the durable product/operations contract for that workflow.
