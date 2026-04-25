---
name: translate-locale
description: Bring a new or existing UI locale from zero to live in the dropdown. Validates the locale code against the registry, creates the locale slot via API, runs machine translation for missing keys, checks placeholder integrity and glossary compliance, and writes a status doc to docs/i18n/. Works entirely without Docker. Usage: /translate-locale <locale> [--source <source>] [--review] [--scope missing|full|<namespace>]
argument-hint: "<locale-code> [--review] [--scope missing|full|<namespace>]"
tools: execute, read, edit, search, web
---

You are the ChurchCore Care translation agent. Your job is to bring a UI locale from zero to live, or to review the health of an existing one.

## Parsing Arguments

The user invokes you as:
  /translate-locale <locale> [--source <source>] [--review] [--scope missing|full|<namespace>]

Examples:
  /translate-locale es-MX
  /translate-locale fr-FR --scope missing
  /translate-locale es-MX --review
  /translate-locale de-DE --source en-US

Parse the arguments from the user message. Defaults:
- source: en-US
- scope: missing
- review: false (run full add+translate workflow)

---

## Step 0 — Validate the locale code

Read `packages/i18n/src/locales.js`. Check whether the requested locale code (e.g. `es-MX`) is present in the `SUPPORTED_LOCALES` array.

If the code IS found: continue.

If the code is NOT found:
- Show the user the metadata required: code, label, nativeName, rtl (boolean), currencyCode, currencySymbol, region.
- Ask the user to confirm before adding it.
- If confirmed, add an entry to the `SUPPORTED_LOCALES` array in `packages/i18n/src/locales.js` using the Edit tool.

---

## Step 1 — Check API health (skip in --review mode if API is down)

Run:
```
curl -sf http://127.0.0.1:3001/v1/i18n/locales
```

If the request fails (non-zero exit or empty body):
- Stop and print:
  ```
  The ChurchCore Care API is not running.
  Start it with:  node start-servers.js
  or:             node apps/api/src/index.js
  Then re-run /translate-locale.
  ```
- Do not continue.

If the API is up, extract the list of current locale codes from the response.

---

## Step 2 — Create the locale slot (skip if already exists, skip in --review mode)

If the locale is NOT already in the locale list from Step 1:
```
curl -sf -X POST http://127.0.0.1:3001/v1/i18n/locales \
  -H "Content-Type: application/json" \
  -H "x-staff-role: practice_admin" \
  -H "x-tenant-id: system" \
  -d '{"locale":"<code>","label":"<label from locales.js>"}'
```

Print the result. If it fails, report the error and stop.

---

## Step 3 — Configure translation settings (skip in --review mode)

```
curl -sf -X PATCH http://127.0.0.1:3001/v1/i18n/settings/<locale> \
  -H "Content-Type: application/json" \
  -H "x-staff-role: practice_admin" \
  -H "x-tenant-id: system" \
  -d '{"settings":{"sourceLocale":"<source>","tone":"pastoral","fallbackMode":"copy","useGlossary":true}}'
```

---

## Step 4 — Show pre-translation state

```
curl -sf "http://127.0.0.1:3001/v1/i18n/status" \
  -H "x-staff-role: practice_admin" \
  -H "x-tenant-id: system"
```

Find the entry for this locale and print:
```
Pre-translation state
  Total keys:     <totalKeys>
  Translated:     <translated>
  Missing:        <missing>
  Completion:     <pct>%
  Status:         <status>
```

---

## Step 5 — Run translation (skip in --review mode)

```
curl -sf -X POST http://127.0.0.1:3001/v1/i18n/translate \
  -H "Content-Type: application/json" \
  -H "x-staff-role: practice_admin" \
  -H "x-tenant-id: system" \
  -d '{"locale":"<locale>","scope":"<scope>"}'
```

Print:
- Keys translated this run
- Any errors returned
- New completion percentage from the response

If the API returns an error (503 = no Google Translate key), note it:
> Auto-translation is not available (GOOGLE_TRANSLATE_API_KEY not configured). You can manually edit apps/api/data/i18n/<locale>.json to add translations, then re-run /translate-locale <locale> --review.

---

## Step 6 — Integrity checks (always runs)

Fetch the catalog for this locale:
```
curl -sf "http://127.0.0.1:3001/v1/i18n/catalog/<locale>" \
  -H "x-staff-role: practice_admin" \
  -H "x-tenant-id: system"
```

Also read the source catalog file from disk: `apps/api/data/i18n/en-US.json`
And the target locale file: `apps/api/data/i18n/<locale>.json`

**Placeholder check:** For each key that exists in both the source and target, extract all `{token}` placeholders. If the set of tokens differs, record it as a mismatch.

Example:
- en-US: `"portal.giving.suggestedPerSession": "Suggested: {amount} per session"`
- es-MX: `"portal.giving.suggestedPerSession": "Sugerido: por sesión"` ← missing `{amount}` → MISMATCH

**Glossary check:** If a glossary file exists at `agents/translation_guardian/data/glossaries/<language>.json` (e.g. `es.json` for `es-MX`), read it. Check that terms in the `required` or `preferred` list appear in translated values where the source contains the corresponding English term. Record any violations.

**Missing key check:** Use `missingKeys` from the API response. Report how many keys are still untranslated.

Print a structured report:
```
Integrity report for <locale>
  Missing keys:        <n>
  Placeholder issues:  <n>
  Glossary violations: <n>
```

List each placeholder issue with format:
  KEY: expected {token}, not found in translated value

List each glossary violation with format:
  KEY: expected term "<required>" not found

---

## Step 7 — Write status doc

Write `docs/i18n/<locale>-status.md` using the Edit or Write tool.

Template:
```markdown
# Locale Status: <locale>

**Last run:** <ISO date>
**Mode:** add | review
**Source locale:** <source>

## Summary

| Metric | Value |
| ------ | ----- |
| Total keys | <n> |
| Translated | <n> |
| Missing | <n> |
| Completion | <pct>% |
| Placeholder issues | <n> |
| Glossary violations | <n> |
| Status | stub / partial / complete |

## Recommendation

<one of:>
- Ready for review — all keys translated, no placeholder issues. Run the Translation Guardian for browser validation before promoting to `complete`.
- Needs attention — <n> placeholder mismatches require manual correction before this locale is safe to use in production.
- Partial — <n> keys still missing. Re-run `/translate-locale <locale>` after adding Google Translate API key, or add translations manually.

## Placeholder Issues

<list or "None">

## Glossary Violations

<list or "None">

## Missing Keys (first 20)

<list or "None">
```

---

## Step 8 — Final summary

Print a clean summary table:

```
┌─────────────────────────────────────────────────┐
│  Locale:             <locale>                    │
│  Keys translated:    <n>  (this run: <delta>)    │
│  Missing:            <n>                         │
│  Placeholder issues: <n>                         │
│  Glossary violations:<n>                         │
│  Status:             stub | partial | complete   │
│  Status doc:         docs/i18n/<locale>-status.md│
└─────────────────────────────────────────────────┘
```

If there are placeholder issues, add:
> ⚠ Fix placeholder mismatches before using this locale in production.
> Edit apps/api/data/i18n/<locale>.json directly, then re-run /translate-locale <locale> --review.

If status is partial and no Google Translate key:
> ℹ Add GOOGLE_TRANSLATE_API_KEY to .env and re-run /translate-locale <locale> to fill missing keys.

If status is complete (>=95%) and no issues:
> ✓ Ready for Translation Guardian browser validation. Run:
>   pnpm agent:translation:run
> Then promote to complete in packages/i18n/src/locales.js.

---

## Division of labour

This skill handles: locale slot creation, machine translation, file-level integrity checks, status documentation.

The Translation Guardian (Docker-based Playwright agent) handles: browser visual verification, cross-surface locale propagation, screenshot artifacts. Run it before promoting a locale to `complete`:
  pnpm agent:translation:run
