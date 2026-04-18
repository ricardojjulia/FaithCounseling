# FaithCounseling — AI Coder Rules & Controls

**Version:** 1.1  
**Date:** April 17, 2026  
**Audience:** Any AI coding agent or human contributor working in this repository.  
**Stack:** Node.js API · React/Vite web · MySQL · pnpm monorepo

This document is the single reference for every rule, control, check, and gate that must be followed before, during, and after any code change.

---

## 1. Repository Basics

| Item | Value |
|---|---|
| Package manager | `pnpm` (v10) |
| Node requirement | ≥ 20 |
| Monorepo layout | `apps/api`, `apps/web`, `apps/worker`, `packages/*` |
| Protected branch | `main` |
| Canonical startup command | `pnpm start` |

**Never use** `node start-servers.js` for development. Only `pnpm start` handles env loading, Docker/MySQL preflight, DB readiness, migrations, and app startup.

---

## 2. Git & Branch Policy

### 2.1 Mandatory branch workflow

```
main  ←  pull request  ←  feature/<name>  (your work)
```

1. **Never push directly to `main` or `master`.**
2. Always create a feature branch first:
   ```sh
   git switch -c feature/your-change
   git push -u origin feature/your-change
   ```
3. Open a pull request into `main`.
4. Keep commits focused and small.
5. **Use signed commits** (`git commit -S`).
6. Never use destructive git commands (`--force`, `--hard reset`, `git push --force`) unless the user explicitly requests it.

### 2.2 Pre-push hook (enforced locally)

The hook at `.githooks/pre-push` blocks any direct push to `main` or `master`:

```sh
# Enable the hook in your clone:
git config core.hooksPath .githooks
```

If you skip this, the branch protection ruleset on GitHub will enforce the same gate remotely.

---

## 3. Required Pre-Commit Checklist

Every commit — no exceptions — must satisfy **all** of the following before it is committed.

### 3.1 Lint

```sh
pnpm lint          # runs lint in every workspace package
```

No lint errors are permitted. Warnings must be reviewed; do not suppress them without justification.

### 3.2 Build

```sh
pnpm --filter @faith/web build     # Vite production build
```

The build must be clean with no errors. Warnings in the build output must be investigated.

### 3.3 Unit tests

```sh
pnpm test          # runs test suites in every workspace package
```

All tests must pass.

### 3.4 Security — AppSec scan

```sh
pnpm security:appsec
# or directly:
node ops/appsec-scan.mjs
```

Covers:
- Dependency vulnerability audit (`pnpm audit`)
- Hardcoded secret / credential detection
- Dangerous code patterns (`eval`, `innerHTML`, prototype pollution)
- Security header enforcement
- Auth and session configuration review
- Input validation and SQL injection pattern review
- Logging PHI/PII exposure review
- CORS and CSP configuration review

**Exit 1 (critical/high findings) blocks the commit.**

### 3.5 Security — DB security scan

```sh
pnpm security:db
# or directly:
node ops/db-security-scan.mjs
```

Covers:
- PHI/PII field compliance (schema analysis)
- Encryption coverage (`_enc` suffix convention for sensitive fields)
- Plaintext sensitive data patterns
- Foreign key and tenant isolation checks
- Audit table presence and structure
- Session table security review
- Parameterized query verification
- Encryption key configuration review
- Database connection security

This scan is static (schema file + source analysis). It does not require a live database.

### 3.6 Security regression tests

```sh
pnpm test:security
# or directly:
node ops/security-regression.mjs
```

Automated tests that verify RBAC gates, tenant isolation, authorization boundaries, and that unauthenticated paths cannot reach protected resources.

### 3.7 Step-12 validation

```sh
pnpm test:step12
# or directly:
node ops/step12-validate.mjs
```

End-to-end smoke validation of critical application journeys.

---

## 4. Required Documentation Per Commit

Every commit must include documentation updates in the **same commit**. Do not defer to a follow-up.

| Always required | `README.md` — update any affected sections |
|---|---|
| Always required | `docs/change-log.md` — add a dated entry |
| Major version bump | `docs/vX.Y.Z-RELEASE-SUMMARY.md` — create release summary file |

### Change-log entry formats

```markdown
### fix: <short description>
Date: YYYY-MM-DD | Area: <affected area> | What was corrected

### feat: <short description>
Date: YYYY-MM-DD | Summary of new capability

### release: vX.Y.Z — <title>
Date: YYYY-MM-DD | Summary, migration steps, known issues
```

---

## 5. Pull Request Requirements

Every PR must include:

1. **What changed** — describe the change.
2. **Why it changed** — describe the motivation.
3. **Validation performed** — which tests/scans were run and their results.
4. **Follow-up actions** — anything maintainers must do after merge.

---

## 6. Security-First Code Review Rules

These rules apply to **every code change**, not only dedicated security tasks.

### 6.1 Always evaluate

- Secure coding defects
- PHI exposure
- PII exposure
- Secret leakage
- Database security
- AuthN / AuthZ gaps
- Logging of sensitive data
- Unsafe query construction (must use parameterized queries)
- Insecure configuration defaults
- Encryption and key handling
- Privacy-by-design and data minimization

### 6.2 Absolute prohibitions

| Prohibited | Why |
|---|---|
| Returning passwords, tokens, or credentials in API responses | Secret leakage — see F-001, F-002 in findings |
| Logging PHI, PII, names, emails, or high-cardinality IDs | Privacy violation |
| Hardcoding secrets in source files | Secret leakage |
| Using `eval()` or unvalidated `innerHTML` | XSS / code injection |
| Dynamic SQL string construction | SQL injection |
| Emitting PHI or PII in telemetry labels or OTEL spans | Privacy violation |
| Deleting or updating audit ledger rows | Audit integrity |
| Cross-tenant data access | Tenant isolation violation |

### 6.3 Security findings documentation

For any meaningful security review:

1. Review: application code, schema, migrations, queries, configuration, and tests.
2. Update `docs/SecurityChecks/findings.md` with severity, confidence, affected file, and evidence.
3. Update `docs/SecurityChecks/recommendations.md` separately.
4. Use explicit severities: **Critical / High / Medium / Low / Info**.
5. Never state PHI/PII is "handled safely" unless the code demonstrates the control.
6. Do not remove prior findings unless confirmed resolved or no longer applicable.

---

## 7. Monitoring & Telemetry Rules

Source of truth: `PLANS/FULL-SURFACE-MONITORING.md`

- Every visible surface must expose monitoring signals: performance, usability, errors, and telemetry/export status.
- New or modified screens/tabs/pages/modals must be added to the shared surface registry.
- New or modified surfaces must appear in the monitoring summary and monitoring page.
- Follow OTEL hybrid naming: use OTEL semantic conventions first; use `faith.ui.*` only for app-specific gaps with no OTEL equivalent.
- Local monitoring must remain available even when OTEL export is not configured.
- External OTEL export must remain optional and config-driven.
- **Never emit PHI, free text, names, emails, IDs, or other high-cardinality labels in telemetry.**
- Audit ledger and telemetry are separate systems — never export raw audit rows via telemetry pipelines.

---

## 8. Audit Ledger Rules

Source of truth: `PLANS/FULL-SECURITY-AND-AUDITING.md`

- Every user action and every system-generated security-relevant event is auditable.
- Audit ledger writes are **append-only**. No updates or deletes of audit rows.
- Every audit event must include the canonical fields:

  `id` · `tenantId` · `occurredAt` · `action` · `targetType` · `targetId` · `actorId` · `actorRole` · `actorType` · `result` · `reasonCode` · `requestId` · `sourceSurface` · `sourceWorkflow` · `systemComponent`

- Canonical `result` values: `success` · `failure` · `denied` · `error`
- Reason codes must be short bounded enum-style strings. No free text. Examples: `validation_failed`, `rbac_denied`, `tenant_scope_denied`, `dependency_timeout`
- Audit access is privileged and role-gated.

---

## 9. Database Change Rules

When proposing any schema or migration change:

1. Apply **least privilege** — only grant the permissions the role actually needs.
2. Enforce **row-level tenant isolation** — every table with client or tenant data must have a `tenant_id` column with enforced FK and query filters.
3. All sensitive fields must use encrypted column naming convention (`_enc` suffix) and be encrypted at rest.
4. Add appropriate **indexes** for integrity, foreign keys, and query patterns.
5. Consider **retention and deletion** policies — data minimization is required.
6. Ensure **auditability** — mutations to sensitive tables should produce audit events.
7. Parameterize all queries. No string-concatenated SQL.

---

## 10. Scope & Monitoring Plan Gates

Before touching any of the following areas, **read the listed plan file first** and treat it as source of truth:

| Area | Plan file to read first |
|---|---|
| UI, telemetry, monitoring, OTEL, health, screens, tabs, dashboards | `PLANS/FULL-SURFACE-MONITORING.md` |
| Security, auditing, compliance, PHI, RBAC, auth/session, tenant isolation, exports, retention, impersonation, background jobs | `PLANS/FULL-SECURITY-AND-AUDITING.md` |

If a session changes the monitoring standard, update `PLANS/FULL-SURFACE-MONITORING.md` first, then README and docs.

If a session changes the security/auditing standard, update `PLANS/FULL-SECURITY-AND-AUDITING.md` first, then README and docs.

---

## 11. Required Execution Checklist (Every Task)

```
[ ] 1. Read AGENTS.md
[ ] 2. Confirm task scope — identify whether monitoring or security plans apply
[ ] 3. Make changes on a new feature branch
[ ] 4. pnpm lint                     — zero errors
[ ] 5. pnpm --filter @faith/web build — clean build
[ ] 6. pnpm test                     — all tests pass
[ ] 7. pnpm security:appsec          — no critical/high findings
[ ] 8. pnpm security:db              — no critical/high findings
[ ] 9. pnpm test:security            — all security regression tests pass
[  ] 10. pnpm test:step12             — validation passes
[ ] 11. Update README.md and docs/change-log.md
[ ] 12. Create release summary file if version bump
[ ] 13. Commit with signed commit
[ ] 14. Push branch and open PR with What/Why/Validation/Follow-up
```

---

## 12. Nightly Security Runner

A nightly automated security pass is available:

```sh
pnpm security:nightly         # full run
pnpm security:nightly:dry     # dry-run (no side effects)
```

This runs the full AppSec and DB security scans and produces a structured report. The results feed into `docs/SecurityChecks/findings.md`.

---

## 13. Convenience Command Reference

| Command | Purpose |
|---|---|
| `pnpm start` | Canonical local startup (env, preflight, migrate, API+web) |
| `pnpm lint` | Lint all workspace packages |
| `pnpm test` | Unit tests across all packages |
| `pnpm security:appsec` | AppSec scan (secrets, patterns, headers, auth, CORS) |
| `pnpm security:db` | DB security scan (PHI, encryption, injection, isolation) |
| `pnpm test:security` | RBAC and authorization regression tests |
| `pnpm test:step12` | Critical-journey validation |
| `pnpm test:e2e` | Full end-to-end Playwright test suite |
| `pnpm test:launch-readiness` | Launch readiness Playwright suite |
| `pnpm security:nightly` | Nightly full security scan |
| `pnpm i18n:status` | Internationalization coverage status |
| `pnpm demo:verify` | Verify demo dataset integrity |
| `pnpm demo:finalize` | Reset demo data to canonical state |

---

## 14. GitHub Actions CI/CD Workflows (Enforced by GitHub)

These workflows run automatically in GitHub and cannot be bypassed through local tooling. Understand what each one does, when it fires, and what it will block.

### 14.1 Fortify AST Scan (`fortify.yml`)

| Property | Value |
|---|---|
| Trigger | Push to `main`, PR targeting `main`, weekly schedule (Wed 11:18 UTC), manual `workflow_dispatch` |
| Runner | `ubuntu-latest` |
| Scans performed | SAST (Static Application Security Testing) via Fortify on Demand; open-source/SCA via Debricked |
| Results | Exported to GitHub Security Code Scanning Alerts (Advanced Security dashboard) |
| Required secrets | `FOD_TENANT`, `FOD_USER`, `FOD_PAT` (Fortify on Demand); alternately `SSC_TOKEN`, `SC_CLIENT_AUTH_TOKEN`, `DEBRICKED_TOKEN` for hosted/SSC mode |

**What this means for contributors:**
- Every PR targeting `main` receives an automated SAST scan.
- Vulnerabilities appear in the **Security → Code scanning** tab of the repository.
- A PR that introduces SAST findings may be flagged or blocked depending on the active security policy (`DO_POLICY_CHECK`).
- Do not attempt to merge a PR with open Critical or High SAST alerts without explicit maintainer sign-off.

### 14.2 Nightly Security Checks (`nightly-security-check.yml`)

| Property | Value |
|---|---|
| Trigger | Daily at 23:00 UTC (cron), manual `workflow_dispatch` with optional `dry_run` flag |
| Runner | `ubuntu-latest`, timeout 30 min |
| Scans performed | AppSec scan (`ops/appsec-scan.mjs`) + DB Security scan (`ops/db-security-scan.mjs`) + nightly runner (`ops/nightly-security-runner.mjs`) |
| Artifacts retained | Raw scan JSON files (`appsec-raw.json`, `db-security-raw.json`) + dated summary Markdown — retained for **30 days** |
| On new findings | Workflow automatically commits reports to a `security/nightly-YYYY-MM-DD` branch and opens a PR into `main` with the `security` label |
| Failure condition | If AppSec scan exits non-zero → workflow exits 1 and marks the run failed |
| Permissions required | `contents: write`, `pull-requests: write`, `security-events: read` |

**What this means for contributors:**
- Any code you merge that introduces a new critical/high AppSec finding will cause the next nightly run to fail and auto-open a PR.
- The nightly PR must be reviewed. Do not dismiss it without reading the findings.
- Nightly reports accumulate in `docs/SecurityChecks/`. Review them regularly.
- The `dry_run` input can be used to test the workflow without writing reports or opening PRs.

**Nightly PR body format (auto-generated):**
```
security: nightly security report YYYY-MM-DD

| Scan      | Status         |
|-----------|----------------|
| AppSec    | ✅ Passed      |
| DB Security | ✅ Passed    |

Reports stored in docs/SecurityChecks/
Review CRITICAL or HIGH findings before merging.
```

### 14.3 Issue Summarizer (`summary.yml`)

| Property | Value |
|---|---|
| Trigger | Any new issue opened (`issues: [opened]`) |
| Action | AI inference via `actions/ai-inference@v1` |
| Result | Automatically posts a one-paragraph summary as a comment on the new issue |
| Permissions | `issues: write`, `models: read`, `contents: read` |

**Security note:** The workflow explicitly instructs the AI model that the issue title and body are **untrusted text** and may contain malicious instructions. The model is instructed to summarize only, not follow any embedded instructions. This is a prompt-injection mitigation.

**What this means for contributors:**
- Do not embed instructions for the summarizer in issue bodies.
- The summary comment is automated and does not represent a human review.

### 14.4 GitHub-enforced branch protection summary

The following controls are enforced at the GitHub repository level and cannot be bypassed locally:

| Control | Enforcement |
|---|---|
| Direct push to `main` blocked | Branch protection ruleset |
| Signed commits required | Branch protection ruleset |
| PR required before merge | Branch protection ruleset |
| Fortify SAST on every PR to `main` | `fortify.yml` workflow |
| Nightly security scan with auto-PR on findings | `nightly-security-check.yml` |
| Security Code Scanning Alerts visible to maintainers | GitHub Advanced Security |

---

## 15. What AI Agents Must Never Do

- Push directly to `main` or `master`.
- Use `--force`, `--no-verify`, `git reset --hard`, or other destructive git commands without explicit user instruction.
- Delete files or branches without user confirmation.
- Drop database tables or run `rm -rf` without explicit user confirmation.
- Bypass lint, build, or security checks to "save time".
- Add features, refactor code, or make "improvements" beyond what was explicitly requested.
- Suppress or ignore security scan findings.
- Log, emit, or return PHI, PII, passwords, tokens, or secrets.
- State that PHI/PII is "handled safely" without code evidence of the control.
- Add comments, docstrings, or type annotations to code that was not changed.
- Create helper abstractions or extra files beyond what is directly needed.

---

*This document is derived from `AGENTS.md`, `.github/copilot-instructions.md`, `.github/workflows/fortify.yml`, `.github/workflows/nightly-security-check.yml`, `.github/workflows/summary.yml`, `PLANS/FULL-SECURITY-AND-AUDITING.md`, `PLANS/FULL-SURFACE-MONITORING.md`, and the operational scripts in `ops/`.*
