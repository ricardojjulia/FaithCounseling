# Agent Catalog

This directory contains reusable VS Code Chat agents for ChurchCore Care.

Use these files as the system prompt or agent definition for focused repo work. Pick the smallest agent that matches the job instead of defaulting to the broadest sweep.

## Available Agents

### [Counselor](/Users/rjulia/ChurchCore Care/.github/agents/counselor.agent.md)

Clinical and counseling workflow agent for intake, treatment planning, assessments, safety screening, progress review, and faith-integrated session work inside the product.

Use when you need to simulate or review counselor-facing workflows.

### [Daily Office Manager](/Users/rjulia/ChurchCore Care/.github/agents/daily-office-manager.agent.md)

Full daily operations agent that traverses manager, admin, counselor, and client workflows, finds failures in the running website, fixes them, and reruns validation.

Use when you need a broad daily readiness sweep across practice operations.

### [Manager Counselor Client Triage](/Users/rjulia/ChurchCore Care/.github/agents/manager-counselor-client-triage.agent.md)

Faster multi-role triage agent focused on the most important daily workflows and access boundaries across manager, counselor, and client experiences.

Use when you want a quicker pass than the full office-manager sweep.

### [Playwright Self-Healing QA](/Users/rjulia/ChurchCore Care/.github/agents/playwright-self-healing-qa.agent.md)

Browser-first autonomous QA agent that uses Playwright to reproduce issues, repair them in code, retest, and continue through regression flows.

Use when the priority is end-to-end browser validation and automated repair loops.

### [Security Compliance Guardian](/Users/rjulia/ChurchCore Care/.github/agents/security-compliance-guardian.agent.md)

Security and compliance agent for auth, sessions, RBAC, tenant isolation, PHI/PII handling, injection testing, browser and API AppSec analysis, audit protection, and strict HIPAA/GDPR-oriented engineering review. It is instructed to fix confirmed critical security issues immediately when a safe in-repo remediation is feasible.

Use when you need a full security sweep or targeted security hardening.

### [Web Repair Engineer](/Users/rjulia/ChurchCore Care/.github/agents/web-repair-engineer.agent.md)

General autonomous repair agent for getting the application running, stable, and usable through build, run, debug, and validation loops.

Use when the app is broken and you want a broad engineering repair pass without a narrower business persona.

### [Translation Guardian](/Users/rjulia/ChurchCore Care/.github/agents/translation_guardian/)

Translation quality and safety agent. Audits i18n catalogs for missing keys, untranslated fallbacks, glossary violations, raw key leakage, and completeness across all supported locales (en, es, fr, pt). Integrates with the `packages/i18n` base catalog and the API-served locale override files under `apps/api/data/i18n/`.

Use when adding new i18n keys, onboarding a new locale, or verifying that a localization pass left no raw-key fallbacks in the UI.

```bash
# From repo root
pnpm agent:translation:build
pnpm agent:translation:run
```

The service listens on `http://127.0.0.1:8098` by default.

### [Language Agent](/Users/rjulia/ChurchCore Care/.github/agents/language-agent.agent.md)

Language rollout and validation agent that always takes a language argument, verifies required locale configuration variables, validates active locale and label wiring, and checks that language switching applies across app views and linked screens. Uses counseling-aware and Christian counseling-aware translation quality rules.

Use when creating or reviewing any locale and you want one pass that covers config readiness, key integrity, accepted terminology, and cross-surface language application.

### [Demo Dataset Finalizer](/Users/rjulia/ChurchCore Care/.claude/agents/demo-dataset-finalizer.md)

Deterministic demo data reset agent. Validates and restores the canonical 10-client dataset for the `system` tenant after tests pass. Runs `pnpm demo:verify` and `pnpm demo:finalize`, confirms all invariants, and reports credentials. Scoped exclusively to `ops/demo-dataset/` — does not touch application code or run browser tests.

Use when you need to reset the demo environment to a known state after security, E2E, and launch-readiness tests have passed.

Recommended flow:
```bash
pnpm test:security && pnpm test:e2e && pnpm test:launch-readiness && pnpm demo:finalize
```

## Startup Policy

For any agent in this catalog that needs to boot the application locally:

- Use `pnpm start` from the repository root.
- Do not use `node start-servers.js` for normal startup.
- `pnpm start` is the canonical path because it loads `.env`, verifies Docker/MySQL readiness, runs migrations when configured, and then starts API and web services.

## Notes

- Security and auditing work must follow [FULL-SECURITY-AND-AUDITING.md](/Users/rjulia/ChurchCore Care/PLANS/FULL-SECURITY-AND-AUDITING.md).
- UI, monitoring, telemetry, health, and workflow coverage must follow [FULL-SURFACE-MONITORING.md](/Users/rjulia/ChurchCore Care/PLANS/FULL-SURFACE-MONITORING.md).
- If you add a new agent to this directory, add it to this catalog in the same session.
