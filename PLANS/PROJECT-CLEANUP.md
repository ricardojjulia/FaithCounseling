# Project Cleanup Plan

**Created:** 2026-04-01  
**Status:** Pending execution  
**Priority:** High — pre-beta hygiene pass

---

## Overview

Full audit of the monorepo to remove backup files, stale agent copies, Python cache artifacts, orphaned test results, and historical docs that have been superseded by several major versions. Also covers missing `.gitignore` entries and duplicate virtual environments.

---

## 1. Backup Files — DELETE

| File | Reason |
|------|--------|
| `apps/web/src/app.js.bak` | Manual backup, 3,044 lines — superseded by current `app.js`; not tracked intentionally |

**Action:** `rm apps/web/src/app.js.bak`

---

## 2. Python Cache Artifacts — DELETE + GITIGNORE

`__pycache__` directories are compiled bytecode that should never be committed.

| Path | Note |
|------|------|
| `agents/translation_guardian/__pycache__/` | 4 `.pyc` files currently tracked by git (showing in `git status`) |

**Actions:**
1. `rm -rf agents/translation_guardian/__pycache__`
2. Add to `.gitignore`:
   ```
   __pycache__/
   *.pyc
   *.pyo
   .venv/
   .venv311/
   ```

---

## 3. Duplicate Agent Directory — CONSOLIDATE

Two copies of `translation_guardian` exist with diverging content:

| Location | State |
|----------|-------|
| `agents/translation_guardian/` | Active development copy — has newer `server.py`, `tools.py`, `README.md` |
| `.github/agents/translation_guardian/` | Stale copy — older versions of the same files |

**Decision:** `agents/` is the source of truth; `.github/agents/translation_guardian/` is the stale copy.

**Action:** `rm -rf .github/agents/translation_guardian/`

> Note: The `.github/agents/` folder holds `.agent.md` definition files — those are kept. Only the mirrored Python implementation subdirectory is removed.

---

## 4. Duplicate Virtual Environment — REMOVE ONE

| Path | Python Version | Used By |
|------|---------------|---------|
| `.venv/` | Python 3.9.6 | Unknown — no active references found |
| `.venv311/` | Python 3.11.15 | `translation_guardian` (cpython-311.pyc confirms 3.11) |

**Decision:** Keep `.venv311/`, remove `.venv/`. Confirm nothing references `.venv` before deleting.

**Action:** `rm -rf .venv/` (after confirming no scripts reference it)

Both should be added to `.gitignore` (see item 2 above). Neither should ever be committed.

---

## 5. Test Result Artifacts — DELETE

`test-results/` is already gitignored (`test-results/*`) but artifacts accumulate locally.

| Path | Size | Content |
|------|------|---------|
| `test-results/high-value-journeys-high-v-908a9-correctly-recorded-offering/` | ~660 KB | Screenshots + video from a past test failure |
| `test-results/translation-challenge/` | ~2.2 MB | Translation test screenshots |

**Action:** `rm -rf test-results/high-value-journeys-* test-results/translation-challenge/`  
Keep `test-results/.last-run.json` (explicitly preserved by `.gitignore`).

---

## 6. Old Release Summary Docs — ARCHIVE OR DELETE

Current version is **v5.5.0**. Release summaries before v5.0.0 are more than 5 major versions behind and no longer relevant for day-to-day development.

| File | Verdict |
|------|---------|
| `docs/RELEASE_1.0.0.md` | DELETE — superseded by summary below |
| `docs/RELEASE_3.0.6.md` | DELETE — superseded |
| `docs/v1.0.0-RELEASE-SUMMARY.md` | DELETE |
| `docs/v3.0.6-RELEASE-SUMMARY.md` | DELETE |
| `docs/v4.7.0-RELEASE-SUMMARY.md` | DELETE |
| `docs/v5.0.0-RELEASE-SUMMARY.md` | KEEP — major milestone boundary |
| `docs/v5.2.0-RELEASE-SUMMARY.md` through `v5.5.0-RELEASE-SUMMARY.md` | KEEP — recent history |

**Action:** Delete 4 pre-v5.0 release files.

---

## 7. Agent Run Logs in docs/ — REVIEW

These are dated one-off run logs from agent execution sessions, not formal documentation.

| File | Date | Verdict |
|------|------|---------|
| `docs/AGENT-RUN-2026-03-29.md` | 2026-03-29 | DELETE — ephemeral run log |
| `docs/SECURITY-RUN-2026-03-28.md` | 2026-03-28 | DELETE — ephemeral run log |
| `docs/TRANSLATION-GUARDIAN-ES-RUN-2026-03-30.md` | 2026-03-30 | DELETE — ephemeral run log |
| `docs/UI-BASELINE-AGENT-RUN-2026-03-30.md` | 2026-03-30 | DELETE — ephemeral run log |
| `docs/OPERATIONS-DASHBOARD-IMPLEMENTATION-LOG-2026-03-30.md` | 2026-03-30 | REVIEW — may contain decisions worth keeping |

**Action:** Delete the 4 clearly ephemeral files. Review the operations log for any decisions to extract before deleting.

---

## 8. Untracked New File — COMMIT OR DISCARD

| File | Status |
|------|--------|
| `.github/agents/language-agent.agent.md` | Untracked, ready to commit |

**Action:** Review and commit if this agent definition is complete, otherwise discard.

---

## 9. Empty Placeholder Directories — EVALUATE

| Path | Content |
|------|---------|
| `infra/` | `.gitkeep` only |
| `ops/runbooks/` | `.gitkeep` only |
| `packages/domain/` | `.gitkeep` + empty `package.json` |

**Decision:** Leave these unless there is no roadmap item that will populate them. The `.gitkeep` pattern signals intentional future use. Flag for deletion only if the corresponding roadmap items (PLANS/) have been cancelled.

---

## Execution Order

1. **Update `.gitignore`** — prevents re-accumulation of cache/venv files
2. **Delete `__pycache__`** — untrack + remove compiled bytecode  
3. **Delete `app.js.bak`** — remove backup file
4. **Remove `.github/agents/translation_guardian/`** — remove stale agent copy
5. **Remove old release summary docs** (pre-v5.0)
6. **Remove agent run logs** (after reviewing ops log)
7. **Confirm and remove `.venv/`** — after checking for references
8. **Clean `test-results/`** artifacts
9. **Commit `language-agent.agent.md`** if ready
10. **Commit all deletions** in a single cleanup commit

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Git-tracked cache files | 4 `.pyc` files | 0 |
| Duplicate agent dirs | 2 | 1 |
| Stale release docs | 4+ files | 0 |
| Ephemeral run logs | 4 files | 0 |
| `.gitignore` coverage | Missing venv/pycache | Complete |
| Disk (local, approx.) | ~130+ MB recoverable | Cleaned |
