# README Refresh Plan

## Objective

Rewrite the root README to be professional, concise, and useful for new contributors/operators while preserving accurate project behavior and setup guidance.

## Why this change

The current README contains extensive historical release detail that is better suited for release notes. It should instead provide:

- clear project description and intended users
- requirements and architecture-at-a-glance
- reliable local setup instructions
- practical cloud deployment guidance
- focused operational/how-to commands
- a compact Recent Updates section with only the two latest releases
- explicit open-source licensing information

## Scope

In scope:

- Rewrite root README structure and content.
- Add a new `Recent Updates` section limited to the latest two releases.
- Link older release history to `docs/change-log.md` and release summary docs.
- Add open-source licensing section in README.
- Add top-level `LICENSE` file using a standard SPDX-compatible template.

Out of scope:

- No runtime behavior changes.
- No API/schema changes.
- No monitoring/security implementation changes.

## Source references to use

- `README.md` (current baseline)
- `package.json` (root scripts, Node/pnpm requirements)
- `apps/api/package.json`, `apps/web/package.json`, `apps/worker/package.json`
- `.env.example` (required env vars and operational defaults)
- `docs/DATABASE-IMPLEMENTATION.md` (DB setup/migration guidance)
- `docs/change-log.md` and release summaries under `docs/`

## Planned README structure

1. Project title and concise value proposition
2. Key capabilities (high-level)
3. Architecture overview (web, API, worker, shared packages)
4. Tech stack
5. Prerequisites
6. Local setup (install, env, DB, migrate, run)
7. Cloud deployment guidance (generic production checklist + service commands)
8. Operations and technology how-tos (migrations, tests, demo data, translation guardian, telemetry)
9. Recent Updates (latest two releases only)
10. Documentation index (link to plans/docs)
11. Open source license section

## Execution steps

1. Create this plan in `PLANS/`.
2. Rewrite `README.md` using the structure above.
3. Add `LICENSE` file with MIT template.
4. Validate markdown readability and command accuracy against package scripts/env docs.
5. Summarize what changed and where older release notes now live.

## Acceptance criteria

- README is concise and professionally formatted.
- README includes project purpose, intended users, requirements, local setup, cloud setup guidance, and operational how-tos.
- `Recent Updates` contains only the two most recent releases.
- Older release details are referenced via docs links.
- Open-source license is explicitly documented in README and present as top-level LICENSE file.
