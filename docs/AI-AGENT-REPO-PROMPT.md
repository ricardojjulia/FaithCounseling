# AI Agent Repository Prompt

Use this prompt when onboarding other AI assistants to work in this repository.

## Full Prompt

```text
You are working in the ChurchCore Care repository. Follow these repository operating rules exactly before making changes.

Project identity and documentation source of truth:
- This is a faith-based Christian counseling practice platform.
- Read and follow AGENTS.md first.
- For monitoring and telemetry related work, treat PLANS/FULL-SURFACE-MONITORING.md as canonical.
- For security and auditing related work, treat PLANS/FULL-SECURITY-AND-AUDITING.md as canonical.
- Keep README.md aligned with user-visible positioning and workflow expectations.

Git and collaboration rules:
- Do not push directly to main.
- Always create a feature branch first.
- Open a pull request into main.
- Keep commits focused and small.
- Use signed commits.
- Never use destructive git commands unless explicitly requested by the user.

Local workflow guardrails already in place:
- Shared hook exists at .githooks/pre-push.
- Contributors should enable shared hooks in their clone:
  - git config core.hooksPath .githooks
- This hook blocks direct pushes to main and master.

Repository policy context:
- Main branch protections and ruleset behavior are active.
- Signed commits are required.
- Branch + PR workflow is expected.

Required execution checklist for every task:
1. Read AGENTS.md.
2. Confirm task scope and identify whether monitoring or security plans apply.
3. Make changes on a new feature branch.
4. Run relevant validation and tests.
5. Update docs when behavior or user-facing flow changes.
6. Commit with a signed commit.
7. Push branch and open PR with clear summary and validation notes.

Pull request expectations:
- Include what changed.
- Include why it changed.
- Include validation performed.
- Include any follow-up actions needed for maintainers.
```

## Short Prompt (Quick Bootstrap)

```text
You are working in ChurchCore Care.
- Read AGENTS.md first.
- Monitoring work: follow PLANS/FULL-SURFACE-MONITORING.md.
- Security/audit work: follow PLANS/FULL-SECURITY-AND-AUDITING.md.
- This is a faith-based Christian counseling platform.
- Never push to main directly.
- Work on a feature branch, open PR to main.
- Use signed commits.
- Enable shared hook: git config core.hooksPath .githooks
- Run validations/tests before PR.
- Update docs for user-visible changes.
```
