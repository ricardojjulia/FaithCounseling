# Translation Guardian Agent

Translation Guardian is a Microsoft Agent Framework HTTP agent for safe localization rollout and translation challenge testing.

## What it does

- Executes the in-app locale rollout workflow end-to-end:
  - logs in to the application
  - creates the locale via app APIs
  - applies translation settings
  - runs auto-translation generation
  - verifies main-screen language switch behavior
- Bootstraps a target locale from English without removing keys when needed.
- Updates locale settings so translation behavior is explicit and reversible.
- Validates translation integrity:
  - missing and extra keys
  - untranslated/blank values
  - placeholder token mismatches (for example `{name}`)
- Compares translated terms against an accepted glossary for the language.
- Runs a live browser challenge:
  - logs in
  - applies locale where available
  - collects visible UI text
  - flags rejected or missing accepted terminology
- Adds a one-call language agent flow for create/review:
  - `run_language_agent(language_or_locale, mode="create_or_review")`
  - confirms required settings variables and translation config fields are present
  - verifies locale label and active locale wiring
  - traverses app views and linked pages to ensure language switch applies across screens
  - uses counseling-aware defaults (`tone: pastoral`, `useGlossary: true`)

## Files

- Agent entrypoint: `agents/translation_guardian/server.py`
- Tools: `agents/translation_guardian/tools.py`
- Config: `agents/translation_guardian/config.py`
- Glossary data: `agents/translation_guardian/data/glossaries/es.json`

## Setup

Python requirement: 3.10 or later.

If you are on macOS with system Python 3.9, use the Docker run path below to avoid local Python upgrades.

1. Create a Python virtual environment inside the repo.
2. Install dependencies:

```bash
pip install -r agents/translation_guardian/requirements.txt
python -m playwright install chromium
```

1. Configure environment variables (copy from `.env.example`).

### Model configuration

Preferred (Foundry):

- `FOUNDRY_PROJECT_ENDPOINT`
- `FOUNDRY_MODEL_DEPLOYMENT_NAME`

Fallback (OpenAI):

- `OPENAI_API_KEY`
- optional `OPENAI_MODEL` (default `gpt-4.1-mini`)

## Run (HTTP server mode)

```bash
python -m agents.translation_guardian.server
```

## Run with Docker (recommended in this repo)

From repo root:

```bash
pnpm agent:translation:build
pnpm agent:translation:run
```

The HTTP endpoint is exposed on `http://127.0.0.1:8098` by default.

If needed, override the host port:

```bash
TRANSLATION_GUARDIAN_PORT=8088 pnpm agent:translation:run
```

To run detached and tail logs:

```bash
pnpm agent:translation:run:detached
pnpm agent:translation:logs
```

To stop all compose services started by this profile:

```bash
pnpm agent:translation:down
```

## Recommended evaluation flow

Preferred one-call flow:

1. `run_language_agent(language_or_locale, mode="create_or_review")`

Expanded validation flow:

For each locale:

1. `prepare_locale_in_application(language_or_locale, base_url, login_email, login_password)`
2. `evaluate_locale_integrity(locale)`
3. `evaluate_accepted_terms(locale)`
4. `build_translation_challenge_dataset(locale)`
5. `run_browser_translation_challenge(locale, base_url, login_email, login_password)`

`prepare_locale_in_application` accepts either language names (`"spanish"`) or locale codes (`"es"`).

## Notes

- The agent is designed to avoid destructive localization changes.
- Source locale (`en`) is never modified.
- Locale generation defaults to safe copy fallback to avoid UI breakage while translators iterate.
