# I18N System Rewrite

**Status:** Planning
**Prepared:** April 9, 2026
**Initiative:** ChurchCore Care Internationalization System Rewrite
**Stack:** Node.js API, React/Mantine web, MySQL, `packages/i18n`, Python Translation Guardian agent, Claude Code skill

---

## Executive Summary

The ChurchCore Care platform's i18n system is a hand-rolled, single-file translation catalog that conflates three distinct concepts — the language a person speaks, the locale used to format dates and currency, and a faith/pastoral terminology register — under a single 2-letter code. The result is a system that looks functional from the outside but is operationally broken: `fr` and `pt` are empty stubs that break the UI when selected, there is no plural support, all currency is hardcoded to `en-US`/USD even for non-English sessions, and the server has no authoritative knowledge of a user's locale. Every locale operation relies entirely on client-side localStorage.

This rewrite addresses the entire stack — from the `packages/i18n` shared package up through the API, database schema, frontend context, and developer tooling — in six sequenced phases. Each phase is independently releasable, and Phase 0 ships in one PR to immediately stop the breakage that non-admin users currently experience when selecting French or Portuguese from the locale dropdown.

The most significant new deliverable is a Claude Code skill (`/translate-locale`) that replaces the Docker-only Translation Guardian workflow for day-to-day locale authoring. The Guardian agent remains as the deep browser-validation backstop; the skill is the fast CLI path that any engineer can invoke from their terminal to bring a new locale from zero to live in under five minutes, without starting Docker.

---

## Problem Statement

### What is broken today

1. **Dead locales in the dropdown** — `fr.json` and `pt.json` contain only `{"__label": "French"}` and `{"__label": "Portuguese"}` respectively. Any user who selects either locale in `TopBar.jsx` receives an empty catalog; every `t()` call falls through to the raw key string (e.g. `"nav.clients"` renders literally). The dropdown shows them to all users with no warning.

2. **No BCP 47 locale codes** — The system uses bare 2-letter ISO 639-1 codes (`en`, `es`). There is no way to distinguish `es-MX` from `es-ES`, no regional date or currency variant, and no groundwork for future expansion. The `_LOCALE_PATTERN` regex in `agents/translation_guardian/tools.py` does accept `pt-BR` style codes, but the JS side (`i18n-store.js`, `i18nContext.jsx`) has no concept of them.

3. **No pluralization** — `formatMessage()` in `packages/i18n/src/index.js` does only `{placeholder}` string replacement. Messages like `counselorHome.priority.urgentNotesDetail` (`'{count} clients have crossed...'`) always render `count` as a raw number string regardless of whether count is 1. There is no `one`/`other` plural form anywhere in the system.

4. **Currency and dates are hardcoded** — `OfferingsPage.jsx` and `OfferingsTab.jsx` call `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` with a hardcoded locale and currency. `ClinicalHistoryTab.jsx` calls `toLocaleDateString('en-US', ...)` explicitly. These render wrong numbers and symbols for any non-US locale.

5. **Locale is not on the session or server** — `i18nContext.jsx` reads from `localStorage` only. The API has no `Accept-Language` parsing and no server-authoritative locale concept. `clients.language_preference` stores a bare 2-letter code and the column is named ambiguously — it conflates "what language this person speaks" with "what UI locale to render."

6. **Translation Guardian is Docker-only** — The only structured path to adding a locale is `agent:translation:run`, which launches a Docker container running a Python Playwright agent. There is no CLI-native path, no Claude Code skill, and no way to invoke the integrity checks without Docker.

7. **Translation state is entirely opaque** — `calculateCompletion()` in `i18n-store.js` simply counts override keys vs. total key count. It does not distinguish machine-translated from human-reviewed keys, does not track stale keys (source changed but translation not updated), and does not expose this metadata through the API in a structured way.

8. **`faith_language_preferences` is named as if it is a language setting** — Its `integration_level`, `include_prayer_language`, and `include_scripture_refs` fields have nothing to do with locale or content language. The naming confusion bleeds into API audit events (`faith.language_preference.upsert`) and makes the three-way distinction between content language, UI locale, and faith register impossible to explain to a new engineer.

---

## Definitions — The Four Concepts

These terms must be used consistently in all code, database columns, API fields, comments, and documentation after Phase 1.

**Content Language** (`contentLanguage`): The natural language in which a person communicates or in which a piece of content is authored. A BCP 47 primary language subtag or full tag: `en`, `es`, `fr`, `pt`, `zh-Hant`. Stored on `clients.content_language` (replacing `language_preference`), `specialties.content_languages` (replacing bare `languages` JSON), and `practices.default_content_language`. Not a formatting directive — does not control how numbers or dates render.

**UI Locale** (`uiLocale`): A full BCP 47 locale tag (`en-US`, `es-MX`, `fr-FR`, `pt-BR`) that controls which translation catalog loads and how the UI formats dates, numbers, and currency via `Intl.*` APIs. Stored on `staff_members.preferred_ui_locale`, `clients.preferred_ui_locale` (new), and `tenants.default_ui_locale` (new). Resolved server-side per request: `user.preferred_ui_locale` → `tenant.default_ui_locale` → `en-US`.

**Faith/Pastoral Register** (`faithRegister`): A layer of terminology preferences — pastoral vs clinical tone, whether to include prayer language, scripture references, and preferred faith terminology — that is orthogonal to both content language and UI locale. Controlled by the `faith_language_preferences` table, which will be renamed `faith_pastoral_registers` in Phase 1 to eliminate the word "language" from a non-language concern. API routes change from `/v1/faith/language-preferences` to `/v1/faith/pastoral-register`.

**Translation Catalog Locale** (`catalogLocale`): A full BCP 47 tag that identifies a translation catalog on disk (`apps/api/data/i18n/en-US.json`, `es-MX.json`, etc.). Each catalog locale maps 1-to-1 to a UI locale. The canonical list of supported catalog locales lives in `packages/i18n/src/locales.js` (new file created in Phase 2).

---

## Non-Goals

The following are explicitly out of scope for this rewrite:

- Server-side rendering or SSR locale hydration (the app is a client-side SPA).
- Full ICU MessageFormat syntax (only CLDR plural rules are needed; full ICU adds 40 KB to the bundle).
- RTL layout implementation (adding the `dir` attribute and data model is in scope; full RTL CSS is post-Phase 4 work).
- Automatic locale detection from browser `navigator.language` (the user makes an explicit choice; auto-detection is a future enhancement).
- Machine translation of all 740 keys for `fr-FR` and `pt-BR` at human-review quality (Phase 6 brings them to `partial` status, not `complete`).
- Replacing the Google Translate API integration with another provider.
- Multi-locale content authoring (clinical notes in Spanish while UI renders in English simultaneously).
- Per-portal-client locale selection (portal clients inherit the practice's `default_ui_locale` for now).

---

## Phase 0 — Stop the Bleeding

**Goal:** Hide stub locales from non-admin users so selecting French or Portuguese does not break the UI. One PR, no schema changes, no breaking API changes.

### Tasks

**`apps/api/src/lib/i18n-store.js`**
- Add a `status` field to the return value of `listLocales()`. Compute `status` as: `complete` (completion >= 95%), `partial` (completion >= 20%), `stub` (completion < 20%, non-source locale), `source` (the canonical source locale — currently `en`).
- Add `isStub: true` for any locale where `status === 'stub'`.

**`apps/api/src/index.js`** (the `GET /v1/i18n/locales` handler)
- Return the enriched locale list including the `status` and `isStub` fields. No new columns or schema changes.

**`apps/web/src/lib/i18nContext.jsx`**
- In the locale list normalizer, filter out any locale with `isStub: true` unconditionally. (Admin toggle to show stubs is Phase 4 work.)
- If the user's stored localStorage locale is a stub, fall back to `en` silently and update localStorage.

### Phase 0 Success Criteria

- Selecting any locale from the dropdown never renders raw i18n key strings in the UI.
- `fr` and `pt` do not appear in the dropdown for non-admin users.
- Existing `en` and `es` behavior is unchanged.

---

## Phase 1 — Definitional Cleanup and Locale Code Standardization

**Goal:** Establish the four-concept vocabulary everywhere. Rename columns and API routes. Migrate locale codes from bare 2-letter to full BCP 47 throughout. No behavior changes for end users.

### Database Schema Changes

```sql
-- 1. Rename language_preference → content_language on clients.
ALTER TABLE clients
  CHANGE COLUMN language_preference
    content_language VARCHAR(35) NULL DEFAULT 'en';

-- 2. Add preferred_ui_locale to clients (separate from content language).
ALTER TABLE clients
  ADD COLUMN preferred_ui_locale VARCHAR(35) NULL DEFAULT NULL
  AFTER content_language;

-- 3. Add preferred_ui_locale to staff_members.
ALTER TABLE staff_members
  ADD COLUMN preferred_ui_locale VARCHAR(35) NULL DEFAULT NULL
  AFTER bio_enc;

-- 4. Add default_ui_locale to tenants.
ALTER TABLE tenants
  ADD COLUMN default_ui_locale VARCHAR(35) NOT NULL DEFAULT 'en-US'
  AFTER plan_type;

-- 5. Add default_content_language to practices.
ALTER TABLE practices
  ADD COLUMN default_content_language VARCHAR(35) NOT NULL DEFAULT 'en'
  AFTER timezone;

-- 6. Create faith_pastoral_registers as the renamed table.
--    Data is copied; old table kept for one release cycle.
CREATE TABLE IF NOT EXISTS faith_pastoral_registers (
  id                      VARCHAR(64)  NOT NULL,
  tenant_id               VARCHAR(64)  NOT NULL,
  practice_id             VARCHAR(64),
  integration_level       VARCHAR(64)  NOT NULL DEFAULT 'moderate',
  explicit_faith_language TINYINT(1)   NOT NULL DEFAULT 1,
  include_prayer_language TINYINT(1)   NOT NULL DEFAULT 1,
  include_scripture_refs  TINYINT(1)   NOT NULL DEFAULT 1,
  preferred_terminology   VARCHAR(255),
  updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                          ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_faith_pastoral_register_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO faith_pastoral_registers SELECT * FROM faith_language_preferences;
```

All of the above are implemented as `addColumnIfMissing()` / `addTableIfMissing()` calls in `apps/api/src/db/migrate.js` using the established pattern. `schema.sql` is updated in parallel to reflect the final target state for fresh installs.

### `packages/i18n/src/index.js` changes

- Change `defaultLocale` from `'en'` to `'en-US'`.
- Change `localeLabels` keys from `{ en, es, fr, pt }` to `{ 'en-US': 'English (United States)', 'es-MX': 'Español (México)', 'fr-FR': 'Français (France)', 'pt-BR': 'Português (Brasil)' }`.
- Update `normalizeLocaleCode()` to preserve BCP 47 casing: `en-US` stays `en-US`, not `en-us` (region subtags are uppercase by convention).

### `apps/api/data/i18n/` — File Migration

- Rename on disk: `en.json` → `en-US.json`, `es.json` → `es-MX.json`, `fr.json` → `fr-FR.json`, `pt.json` → `pt-BR.json`.
- Add a startup migration step in `i18n-store.js` `createI18nStore()` that detects old 2-letter filenames and renames them automatically on first boot. Existing deployments are not broken by a server restart.

### `apps/api/src/index.js` changes

- Row mappers (`dbRowToClient()`, `dbRowToClientSummary()`) rename `languagePreference` → `contentLanguage` and expose the new `preferredUiLocale` field.
- Line 2495 `language_preference = ?` → `content_language = ?`.
- Add `preferredUiLocale` to staff and client read/write mappers.
- Routes `/v1/faith/language-preferences` → add 301 redirect to `/v1/faith/pastoral-register`. Add new route group at `/v1/faith/pastoral-register` that reads/writes from `faith_pastoral_registers`.
- `GET /v1/i18n/locales` → return BCP 47 codes.

### `apps/web/src/lib/i18nContext.jsx` changes

- On read from localStorage: if the stored value is a bare 2-letter code (`en`, `es`, `fr`, `pt`), map it to the canonical BCP 47 code and write it back. This one-time silent migration handles existing browser sessions.

### `agents/translation_guardian/config.py` changes

- `SOURCE_LOCALE = "en-US"` (was `"en"`).
- `_KNOWN_LOCALE_ALIASES` — add full BCP 47 lowercase aliases: `"en-us": "en-US"`, `"es-mx": "es-MX"`, etc.

### `ops/reset-language-settings.mjs` changes

- Update all hardcoded locale references from bare 2-letter codes to BCP 47.
- Remove direct reference to `defaultLocale = 'en'` from `packages/i18n`; use `'en-US'` directly.

### Phase 1 Success Criteria

- All four locale concepts are consistently named: `contentLanguage`, `uiLocale`, `faithRegister`, `catalogLocale`.
- The database has `clients.content_language`, `clients.preferred_ui_locale`, `staff_members.preferred_ui_locale`, `tenants.default_ui_locale`, `practices.default_content_language`.
- Locale codes in localStorage, API responses, and file names are full BCP 47 tags.
- `/v1/faith/language-preferences` returns 301 to `/v1/faith/pastoral-register`.
- No visible UI behavior change for end users.

---

## Phase 2 — `packages/i18n` Rewrite

**Goal:** Add pluralization, `Intl.*` formatting utilities, catalog metadata, and the canonical locale registry.

### New file: `packages/i18n/src/locales.js`

Single source of truth for all supported UI locales. Each entry shape:

```js
// {
//   code: 'en-US',                 // BCP 47 locale tag
//   label: 'English (United States)',
//   nativeName: 'English',
//   rtl: false,
//   currencyCode: 'USD',
//   currencySymbol: '$',
//   region: 'us',
// }
```

Define entries for: `en-US`, `es-MX`, `fr-FR`, `pt-BR`. The `rtl` field is `false` for all four initial locales. Future RTL locales can be added without code changes.

`packages/i18n/package.json` — add an `exports` field exposing `./src/locales.js` and `./src/plural.js` as named entry points.

### New file: `packages/i18n/src/plural.js`

Lightweight plural rule engine using native `Intl.PluralRules`. No polyfill needed — modern browsers support it natively.

```js
// API contract (not executable code):
// selectPluralForm(locale, count) → 'one' | 'other' | 'zero' | 'few' | 'many'
```

### Plural key convention

Use sibling keys with `_one` and `_other` suffixes rather than full ICU MessageFormat. The updated `formatMessage()` checks: if `values.count !== undefined`, look for `key_one` (when `selectPluralForm(locale, count) === 'one'`) or `key_other`. If neither exists, use the base key. This is a safe, additive convention — existing keys with no `_one` variant continue to work exactly as before.

Example additions to `baseMessages` in Phase 2 (non-exhaustive):

```js
'counselorHome.priority.urgentNotesDetail_one':
  '1 client has crossed the one-week note threshold.',
'tasks.notes.daysWithoutNote_one': '1 day without a completed note',
'dashboard.schedule.appointments_one': 'appointment',
```

### New formatting utilities in `packages/i18n/src/index.js`

**`formatDate(date, style, locale)`** — wraps `Intl.DateTimeFormat`. Style options: `'short'`, `'medium'`, `'long'`, `'time'`, `'datetime'`.

**`formatNumber(n, opts, locale)`** — wraps `Intl.NumberFormat`. Passes through `opts`.

**`formatCurrency(cents, locale)`** — looks up `currencyCode` from `locales.js` for the given locale, divides cents by 100, then calls `Intl.NumberFormat(locale, { style: 'currency', currency })`. No external dependency.

### Updated `buildLocaleCatalog(overrides, locale)`

Now returns enriched metadata alongside messages:

```js
// Return shape (contract):
// {
//   locale: 'es-MX',
//   messages: { ...mergedFlatKeys },
//   missingKeys: ['key.a', 'key.b'],
//   machineTranslatedKeys: ['key.c'],
//   humanReviewedKeys: [],
//   completionPct: 52,
//   namespaceCompletion: { auth: 100, nav: 80, chart: 45, ... }
// }
```

This requires the override JSON files to carry a parallel `__meta` object tracking translation origin per key. The auto-translate workflow writes `__meta.machineTranslated[key] = true` for every key it produces. A future human review workflow writes `__meta.humanReviewed[key] = true`. The `__meta` object is stripped before the catalog is sent to the client.

The `__label` and `__meta` structure in locale JSON files:

```json
{
  "__label": "Español (México)",
  "__meta": {
    "machineTranslated": { "nav.clients": true },
    "humanReviewed": {},
    "lastTranslatedAt": "2026-04-09T00:00:00Z"
  },
  "nav.clients": "Clientes"
}
```

### Namespacing (catalog organization)

The 740-key flat object is restructured into namespace groups in the source. The keys themselves do not change — the grouping is organizational only. At build time, `baseMessages` is merged back to a flat shape so all existing callers continue to work.

Namespaces: `auth`, `nav`, `header`, `topbar`, `chart`, `counselorHome`, `tasks`, `sidebar`, `metrics`, `panels`, `careFlow`, `buttons`, `scheduling`, `priority`, `compliance`, `dashboard`, `clients`, `billing`, `faith`, `portal`, `offerings`, `forms`, `documents`, `studio`, `common`.

### Phase 2 Success Criteria

- `t('counselorHome.priority.urgentNotesDetail', { count: 1 })` returns the `_one` form.
- `formatCurrency(500, 'es-MX')` returns locale-correct currency display.
- `buildLocaleCatalog` returns `missingKeys`, `completionPct`, and `namespaceCompletion`.
- All existing callers that use `formatMessage(messages, key, values)` continue to work without changes.
- No new npm dependencies added to `packages/i18n` (uses native `Intl.*` only).

---

## Phase 3 — Backend (`apps/api`) Changes

**Goal:** Server-authoritative locale resolution, updated i18n store, new API endpoints. Depends on Phase 1 (schema) and Phase 2 (catalog metadata).

### `apps/api/src/lib/i18n-store.js` — Full Rewrite

- Load locale files using BCP 47 filenames (`en-US.json`, `es-MX.json`).
- `listLocales()` returns full locale metadata from `packages/i18n/src/locales.js` merged with computed status.
- `getCatalog(locale)` calls updated `buildLocaleCatalog()` and returns the full metadata object.
- `autoTranslate(locale, options)` accepts `{ scope: 'missing' | 'full' | namespaceName }`. When `scope: 'missing'`, only translates keys present in `missingKeys`. After translation, writes `__meta.machineTranslated` entries.
- New `deleteLocale(locale)` — removes the JSON file and settings entry; rejects if locale is `source` or `complete`.
- New `getStatus()` — returns the aggregate completion report across all locales and namespaces.

### `apps/api/src/index.js` — i18n Route Changes

**Existing routes — updated:**

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/v1/i18n/locales` | Returns BCP 47 codes; adds `status`, `rtl`, `nativeName`, `namespaceCompletion`, `completionPct` |
| `GET` | `/v1/i18n/catalog` | `?locale=en-US`; response gains `missingKeys`, `machineTranslatedKeys`, `humanReviewedKeys`, `namespaceCompletion` |
| `PATCH` | `/v1/i18n/catalog/:locale` | `:locale` is BCP 47; write path updates `__meta` |
| `GET/PATCH` | `/v1/i18n/settings/:locale` | `:locale` is BCP 47; shape unchanged |
| `POST` | `/v1/i18n/translate` | Body gains `scope: 'missing' \| 'full' \| string`; default `'missing'` |

**New routes:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/v1/i18n/locales` | `practice_admin` | Create a new locale slot; validates against `locales.js` registry |
| `DELETE` | `/v1/i18n/locales/:locale` | `practice_admin` | Remove a stub or draft locale; returns 409 if `complete` or `source` |
| `GET` | `/v1/i18n/status` | `practice_admin` | Aggregate completion: `{ locales: [...], totalKeys, generatedAt }` |

**Faith routes — renamed (with backward-compat 301):**

| Old Route | New Route |
|-----------|-----------|
| `GET /v1/faith/language-preferences` | `GET /v1/faith/pastoral-register` |
| `PATCH /v1/faith/language-preferences` | `PATCH /v1/faith/pastoral-register` |

### New file: `apps/api/src/lib/locale-resolver.js`

`resolveRequestLocale(request, session, tenantRow)` — resolution priority:

1. `staff_members.preferred_ui_locale` (from session)
2. `Accept-Language` header — first token matched against supported catalog locales by full tag or primary subtag
3. `tenants.default_ui_locale`
4. `'en-US'`

This resolved locale is used by API responses that include locale-sensitive formatted strings (e.g., date strings in `GET /v1/operations/summary`). It does not override the client's locale selection for catalog loading.

### Backward Compatibility Notes

- `GET /v1/i18n/locales` response must include both `locale` (old field name) and `code` (new) as aliases during the Phase 3-4 transition, because `i18nContext.jsx` reads `item?.locale ?? item?.code`. Drop `locale` alias in Phase 4.
- Audit events for i18n mutations keep their existing names; only locale values in the payload change from `'es'` to `'es-MX'`.
- New audit event: `i18n.locale.delete` for the DELETE endpoint.

### Phase 3 Success Criteria

- `GET /v1/i18n/locales` returns full BCP 47 metadata including `status`, `rtl`, `namespaceCompletion`.
- `GET /v1/i18n/status` returns aggregate completion across all catalog locales.
- `POST /v1/i18n/translate` with `scope: 'missing'` skips already-translated keys.
- `DELETE /v1/i18n/locales/fr-FR` removes the stub and it disappears from the dropdown.
- `resolveRequestLocale()` correctly prefers `preferred_ui_locale` → `Accept-Language` → tenant default.

---

## Phase 4 — Frontend Rewrite

**Goal:** Locale-aware `i18nContext`, RTL groundwork, hardcoded `en-US` currency/date fixes, admin stub toggle. Depends on Phase 2 (formatting utils) and Phase 3 (enriched API).

### `apps/web/src/lib/i18nContext.jsx` — Full Rewrite

**Context value shape — new fields added:**

```js
// {
//   locale: 'es-MX',
//   localeMetadata: { code, label, nativeName, rtl, currencyCode, ... },
//   messages: { ...flatKeys },
//   locales: [{ code, label, nativeName, status, completionPct }],
//   loading: false,
//   t: (key, values) => string,           // plural-aware
//   formatDate: (date, style) => string,  // Intl.DateTimeFormat
//   formatNumber: (n, opts) => string,    // Intl.NumberFormat
//   formatCurrency: (cents) => string,    // locale-aware currency
//   setLocale: async (code) => void,
//   refreshLocales: async () => void,
// }
```

**`<html>` attribute wiring** — on every locale switch:

```js
document.documentElement.setAttribute('lang', locale);   // e.g. 'es-MX'
document.documentElement.setAttribute('dir', metadata.rtl ? 'rtl' : 'ltr');
```

This is the RTL groundwork: the attribute is wired and correct even though no RTL CSS exists yet.

**Locale filtering by status:**

Filter out `status: 'stub'` entries unless the current user has `practice_admin` or `platform_admin` role. Admin users see stub locales marked with a `[stub]` badge in the dropdown.

**Fallback behavior:**

If the stored localStorage locale resolves to a stub or unknown code after Phase 1 migration, fall back to `en-US` and update localStorage silently.

### `apps/web/src/components/TopBar.jsx` changes

Upgrade the `<Select>` to use Mantine's `renderOption` to show:
- Native name as primary label.
- Completion percentage badge for non-complete locales: `[52%]` in a muted color.
- `[stub]` badge for stub locales (admin-only view).

### Fix all hardcoded locale/currency calls

Each of these files calls `Intl` or `toLocaleString` with a hardcoded locale or USD. After Phase 4 they use `formatCurrency(cents)` or `formatDate(date, style)` from `useI18n()`:

- `apps/web/src/components/Offerings/OfferingsPage.jsx`
- `apps/web/src/components/WorkspaceStudio/tabs/OfferingsTab.jsx`
- `apps/web/src/components/Portal/ClientPortalPage.jsx`
- `apps/web/src/components/ClientDetail/tabs/ClinicalHistoryTab.jsx` (`'en-US'` hardcoded in `toLocaleDateString`)
- `apps/web/src/components/SchedulingPage.jsx`
- `apps/web/src/components/CounselorMaintenance.jsx`
- `apps/web/src/components/WorkspaceStudio/tabs/PortalTab.jsx`
- `apps/web/src/components/WorkspaceStudio/tabs/DocumentsStudioTab.jsx`

Pattern: replace `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)` with `formatCurrency(cents)`. Replace `new Date(x).toLocaleString()` with `formatDate(x, 'datetime')`.

### Phase 4 Success Criteria

- Switching to `es-MX` sets `<html lang="es-MX" dir="ltr">`.
- Offering amounts render in locale-correct currency format when non-`en-US` locale is active.
- Stub locales are hidden from regular users; admins see them with completion badges.
- `useI18n()` exposes `formatDate`, `formatNumber`, `formatCurrency`.

---

## Phase 5 — Claude Code Skill and Translation Guardian Integration

**Goal:** Ship a `/translate-locale` Claude Code skill that brings a new locale from zero to live without Docker. Depends on Phase 2 (catalog metadata) and Phase 3 (new API endpoints).

### The Skill: `/translate-locale`

**File:** `.claude/agents/translate-locale.md`

The skill is a Claude Code agent definition following the same frontmatter format as existing agents in this repo.

**Invocation signatures:**

| Command | Behavior |
|---------|----------|
| `/translate-locale es-MX` | Full add-or-refresh workflow |
| `/translate-locale es-MX --source en-US` | Explicitly set source locale |
| `/translate-locale es-MX --review` | Integrity checks only, no translation |
| `/translate-locale es-MX --scope missing` | Translate only missing keys |
| `/translate-locale es-MX --scope nav` | Translate only the `nav` namespace |

**Agent tools required:** `execute` (curl calls), `read` (locale JSON files), `edit` (locales.js, status docs), `search` (placeholder pattern checks). Does not need `web` or `agent`.

**Add mode workflow (default):**

1. **Validate the locale code.** Read `packages/i18n/src/locales.js`. Verify the requested code is in the canonical supported locales list. If not, ask the user whether to register it (shows what metadata is needed: label, nativeName, rtl, currencyCode, region). If confirmed, update `locales.js`.

2. **Check API health.** `GET /v1/i18n/locales`. If the API is not running, surface a clear error: `"The ChurchCore Care API must be running. Start it with node start-servers.js"`.

3. **Create the locale slot.** `POST /v1/i18n/locales` with `{ locale: 'es-MX', label: 'Español (México)' }`. If already exists, skip and continue.

4. **Configure translation settings.** `PATCH /v1/i18n/settings/es-MX` with `{ sourceLocale: 'en-US', tone: 'pastoral', fallbackMode: 'copy', useGlossary: true }`.

5. **Check current state.** `GET /v1/i18n/status` → display pre-translation summary: total keys, translated, missing, completionPct.

6. **Run translation.** `POST /v1/i18n/translate` with `{ locale: 'es-MX', scope: 'missing' }`. Wait and display result: keys translated, any errors.

7. **Run integrity checks.** `GET /v1/i18n/catalog/es-MX`. Parse `missingKeys`. Read `en-US.json` and `es-MX.json` from disk and run placeholder extraction: extract all `{token}` names from each source key and the corresponding translated key; flag mismatches. If a glossary exists for this locale (`agents/translation_guardian/data/glossaries/es.json`), check that accepted terms appear and rejected terms do not. Report:
   - Keys translated this run
   - Keys still missing
   - Placeholder mismatches (key name, expected `{x}`, found `{y}`)
   - Glossary violations

8. **Write status doc.** Write `docs/i18n/{locale}-status.md` with: run date, keys translated, missing keys, placeholder issues, glossary violations, recommendation (ready for review / needs human review).

9. **Print summary table:**

   ```
   Locale:            es-MX
   Keys translated:   312  (this run: 210)
   Missing:           0
   Placeholder issues: 2   (see docs/i18n/es-MX-status.md)
   Status:            partial — ready for human review
   ```

**Review mode (`--review`):**

Steps 1, 2 are lightweight (just validate the code). Steps 3, 4, 6 are skipped. Steps 5, 7, 8, 9 run. Safe to run repeatedly.

### Translation Guardian — Revised Role

The Guardian (`agents/translation_guardian/`) is the deep browser-validation backstop. It requires Docker and Playwright. It is not replaced by the skill.

**Division of responsibility:**

| Concern | `/translate-locale` skill | Translation Guardian |
|---------|--------------------------|---------------------|
| Create locale slot | Yes | Yes |
| Machine translate missing keys | Yes | Yes |
| Placeholder integrity (file-level) | Yes | Yes |
| Glossary term check (file-level) | Yes | Yes |
| Browser visual verification | No | Yes |
| Cross-surface locale propagation check | No | Yes |
| Screenshot artifacts | No | Yes |
| Docker required | No | Yes |

**When to use each:**

- Use the Claude Code skill for day-to-day locale authoring and quick re-checks during development.
- Use the Translation Guardian before a locale is promoted from `partial` to `complete`, and as part of CI/CD for locales declared `complete`.

### `package.json` — new scripts

```json
"i18n:status": "node ops/i18n-status.mjs",
"i18n:translate": "node ops/translate-locale.mjs"
```

Add `ops/i18n-status.mjs` — queries `GET /v1/i18n/status` and prints a formatted table of locale completion. Add `ops/translate-locale.mjs` — the Node.js CLI equivalent of the skill's translate workflow, callable without Claude Code.

### Phase 5 Success Criteria

- `/translate-locale es-MX` runs to completion in a terminal with no Docker, produces `docs/i18n/es-MX-status.md`, and the locale is immediately live in the dropdown.
- `/translate-locale es-MX --review` does not call the translate API and reports integrity state.
- The skill surfaces a clear error and recovery instruction if the API is not running.
- The Translation Guardian's `run_language_agent` tool continues to work against BCP 47 codes.

---

## Phase 6 — Complete es-MX, Promote fr-FR and pt-BR

**Goal:** Bring `es-MX` from ~50% to `complete`. Bring `fr-FR` and `pt-BR` to at least `partial` (>= 20%) using the skill.

### Tasks

**`es-MX`:**
- Run `/translate-locale es-MX --scope missing` to fill translation gaps from the `es` → `es-MX` migration.
- Run `/translate-locale es-MX --review` to identify placeholder issues.
- Fix placeholder mismatches by hand (expected to be a small set from the old system's naming drift).
- Run Translation Guardian `run_language_agent("es-MX", mode="review")` for browser validation.
- Promote to `complete` in `locales.js` when `completionPct >= 95` and Guardian passes.

**`fr-FR`:**
- Run `/translate-locale fr-FR` (full add + translate).
- Locale goes to `partial` status and appears in the dropdown with a completion badge.
- Run `/translate-locale fr-FR --review`; fix top 20 priority issues.

**`pt-BR`:**
- Same workflow as `fr-FR`.

**`docs/i18n/` status docs:**

| File | Contents |
|------|----------|
| `docs/i18n/en-US-status.md` | Source locale, 100% complete, no issues |
| `docs/i18n/es-MX-status.md` | Generated by Phase 5 skill, updated by Phase 6 human review |
| `docs/i18n/fr-FR-status.md` | Generated by Phase 6 skill run |
| `docs/i18n/pt-BR-status.md` | Generated by Phase 6 skill run |

### Phase 6 Success Criteria

- `es-MX` reaches `complete` status (>= 95% key coverage, no placeholder mismatches, Translation Guardian pass).
- `fr-FR` and `pt-BR` reach `partial` status (>= 20%) and appear in the dropdown with completion badges.
- All four locales have a status doc in `docs/i18n/`.
- `npm run agent:translation:run` against any of the four locales returns `status: pass` or `status: warn`.

---

## Implementation Notes

### Backward compatibility across phases

- `packages/i18n` `baseMessages` flat export must not change shape until Phase 4 ships.
- `GET /v1/i18n/locales` response must include both `locale` (old) and `code` (new) as aliases during the Phase 3-4 transition. Drop `locale` alias in Phase 4.
- The `apps/api/data/i18n/` file rename (Phase 1) is handled by `i18n-store.js` startup migration, not a manual deployment step.
- The localStorage locale code migration (2-letter → BCP 47) is done silently on first read in Phase 1.

### The `__meta` object

Each locale JSON file carries a top-level `__meta` field:

```json
{
  "__label": "Español (México)",
  "__meta": {
    "machineTranslated": { "nav.clients": true, "chart.note.newNote": true },
    "humanReviewed": {},
    "lastTranslatedAt": "2026-04-09T00:00:00Z"
  },
  "nav.clients": "Clientes",
  "chart.note.newNote": "Nueva nota"
}
```

`stripMeta()` in `i18n-store.js` strips `__label` and `__meta` before the catalog is sent to the client.

### Plural key convention

Use sibling keys (`key`, `key_one`, `key_other`) rather than full ICU MessageFormat. `formatMessage()` checks: if `values.count !== undefined`, use `Intl.PluralRules(locale).select(count)` to pick the right sibling. If no sibling exists, use the base key. Existing keys with no `_one` variant are unaffected.

---

## Overall Success Criteria

After all six phases:

1. No user ever sees a raw i18n key string rendered in the UI regardless of locale selection.
2. All locale codes in the database, API, localStorage, and file system are full BCP 47 tags.
3. `t('key', { count: 1 })` returns grammatically correct singular forms in all supported locales.
4. `formatCurrency(500)` returns locale-correct currency display for all four locales.
5. The `<html>` element has correct `lang` and `dir` attributes at all times.
6. A new engineer can run `/translate-locale de-DE` from the CLI and have a working machine-translated German locale live in the dropdown within five minutes, without Docker.
7. `fr-FR` and `pt-BR` are at `partial` status and appear in the dropdown with completion badges.
8. `es-MX` is at `complete` status.
9. `faith_pastoral_registers` is clearly named as a theology/register concern — not a language concern — in all code, schema, and documentation.
10. The Translation Guardian agent works against BCP 47 codes with `SOURCE_LOCALE = "en-US"`.

---

## Critical Files

| File | Phase | Role |
|------|-------|------|
| `packages/i18n/src/index.js` | 1, 2 | Core package rewrite; plural, formatting, catalog metadata |
| `packages/i18n/src/locales.js` | 2 | New — canonical locale registry |
| `packages/i18n/src/plural.js` | 2 | New — plural rule engine |
| `apps/api/src/lib/i18n-store.js` | 3 | BCP 47, `__meta`, namespace completion, `deleteLocale`, `getStatus` |
| `apps/api/src/lib/locale-resolver.js` | 3 | New — server-authoritative locale resolution |
| `apps/api/src/db/migrate.js` | 1 | Five new column migrations + `faith_pastoral_registers` table |
| `apps/api/src/db/schema.sql` | 1 | Updated for fresh installs |
| `apps/api/src/index.js` | 1, 3 | Route changes, row mapper renames, new i18n endpoints, faith route redirect |
| `apps/web/src/lib/i18nContext.jsx` | 0, 1, 4 | Stub filtering, BCP 47 migration, full rewrite with formatting |
| `apps/web/src/components/TopBar.jsx` | 4 | Completion badges, admin stub toggle |
| `apps/web/src/components/Offerings/OfferingsPage.jsx` | 4 | Remove hardcoded `'en-US'` currency |
| `apps/web/src/components/WorkspaceStudio/tabs/OfferingsTab.jsx` | 4 | Same |
| `apps/web/src/components/ClientDetail/tabs/ClinicalHistoryTab.jsx` | 4 | Remove hardcoded `'en-US'` date |
| `apps/web/src/components/SchedulingPage.jsx` | 4 | Remove hardcoded date formatting |
| `agents/translation_guardian/config.py` | 1 | `SOURCE_LOCALE`, BCP 47 alias map |
| `agents/translation_guardian/tools.py` | 1 | Locale pattern, alias resolution |
| `.claude/agents/translate-locale.md` | 5 | New — Claude Code skill |
| `ops/translate-locale.mjs` | 5 | New — Node.js CLI equivalent |
| `ops/i18n-status.mjs` | 5 | New — locale completion status reporter |
| `ops/reset-language-settings.mjs` | 1 | Update BCP 47 codes throughout |
| `docs/i18n/` | 5, 6 | New directory — per-locale status docs |
