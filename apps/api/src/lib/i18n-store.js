import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  baseMessages,
  buildLocaleCatalog,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  LOCALE_MAP,
  LEGACY_ALIASES,
  resolveLocaleCode,
  listMessageKeys,
} from '../../../../packages/i18n/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localeDir = path.join(__dirname, '../../data/i18n');
const settingsFile = path.join(localeDir, 'settings.json');

// ---------------------------------------------------------------------------
// Namespace groupings for per-namespace completion reporting
// ---------------------------------------------------------------------------
const NAMESPACES = {
  auth:         (k) => k.startsWith('auth.'),
  nav:          (k) => k.startsWith('nav.'),
  header:       (k) => k.startsWith('header.'),
  topbar:       (k) => k.startsWith('topbar.'),
  chart:        (k) => k.startsWith('chart.'),
  counselorHome:(k) => k.startsWith('counselorHome.'),
  tasks:        (k) => k.startsWith('tasks.'),
  sidebar:      (k) => k.startsWith('sidebar.'),
  panels:       (k) => k.startsWith('panels.'),
  careFlow:     (k) => k.startsWith('careFlow.'),
  scheduling:   (k) => k.startsWith('scheduling.'),
  priority:     (k) => k.startsWith('priority.'),
  compliance:   (k) => k.startsWith('compliance.'),
  dashboard:    (k) => k.startsWith('dashboard.'),
  clients:      (k) => k.startsWith('clients.'),
  billing:      (k) => k.startsWith('billing.'),
  faith:        (k) => k.startsWith('faith.'),
  telehealth:   (k) => k.startsWith('telehealth.'),
  portal:       (k) => k.startsWith('portal.'),
  offerings:    (k) => k.startsWith('offerings.'),
  forms:        (k) => k.startsWith('forms.'),
  documents:    (k) => k.startsWith('documents.'),
  studio:       (k) => k.startsWith('studio.') || k.startsWith('workspace.'),
  common:       () => true, // catch-all
};

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------
export async function createI18nStore() {
  await mkdir(localeDir, { recursive: true });

  // Phase 1: rename legacy 2-letter locale files to BCP 47 on first boot
  await migrateLegacyLocaleFiles();

  const overridesByLocale = {};
  const settingsByLocale = await readSettings();

  // Load all registered locales from the canonical registry
  for (const { code } of SUPPORTED_LOCALES) {
    overridesByLocale[code] = await readLocaleOverrides(code);
  }

  // Also pick up any extra locale files that exist on disk but aren't in the registry
  // (e.g. a locale added via the API before the registry was updated)
  for (const [legacyCode, bcp47Code] of Object.entries(LEGACY_ALIASES)) {
    if (!overridesByLocale[bcp47Code]) {
      overridesByLocale[bcp47Code] = await readLocaleOverrides(bcp47Code);
    }
    // Ensure settings default to BCP 47 keys
    if (settingsByLocale[legacyCode] && !settingsByLocale[bcp47Code]) {
      settingsByLocale[bcp47Code] = settingsByLocale[legacyCode];
    }
  }

  // -------------------------------------------------------------------------
  // Public store API
  // -------------------------------------------------------------------------
  return {
    listLocales() {
      return [...new Set([DEFAULT_LOCALE, ...Object.keys(overridesByLocale)])].map((locale) => {
        const meta = LOCALE_MAP[locale] ?? null;
        const overrides = overridesByLocale[locale] ?? {};
        const completion = calculateCompletion(overrides);
        const namespaceCompletion = calculateNamespaceCompletion(overrides);
        const isSource = locale === DEFAULT_LOCALE;
        const status = isSource ? 'source'
          : completion >= 95 ? 'complete'
          : completion >= 20 ? 'partial'
          : 'stub';

        return {
          locale,
          code: locale,
          label: overrides.__label ?? meta?.label ?? locale.toUpperCase(),
          nativeName: meta?.nativeName ?? locale,
          rtl: meta?.rtl ?? false,
          currencyCode: meta?.currencyCode ?? 'USD',
          completion,
          namespaceCompletion,
          status,
          isStub: status === 'stub',
        };
      });
    },

    async ensureLocale(locale, label) {
      const code = resolveLocaleCode(locale);
      if (!overridesByLocale[code]) {
        overridesByLocale[code] = {};
      }
      if (label) overridesByLocale[code].__label = label;
      if (!settingsByLocale[code]) {
        settingsByLocale[code] = defaultTranslationSettings();
        await writeSettings(settingsByLocale);
      }
      await writeLocaleOverrides(code, overridesByLocale[code]);
      return this.getCatalog(code);
    },

    async deleteLocale(locale) {
      const code = resolveLocaleCode(locale);
      if (code === DEFAULT_LOCALE) {
        throw new Error('Cannot delete the source locale.');
      }
      const overrides = overridesByLocale[code] ?? {};
      const completion = calculateCompletion(overrides);
      if (completion >= 95) {
        throw new Error(`Cannot delete a complete locale (${code}). Demote it first.`);
      }
      delete overridesByLocale[code];
      delete settingsByLocale[code];
      await writeSettings(settingsByLocale);
      try {
        await unlink(path.join(localeDir, `${code}.json`));
      } catch { /* already gone */ }
    },

    getCatalog(locale) {
      const code = resolveLocaleCode(locale);
      const overrides = overridesByLocale[code] ?? {};
      const clean = stripMeta(overrides);
      const meta = LOCALE_MAP[code] ?? null;
      const allKeys = listMessageKeys();
      const missingKeys = allKeys.filter((k) => !(k in clean));
      const machineTranslatedKeys = Object.keys(overrides.__meta?.machineTranslated ?? {});
      const humanReviewedKeys = Object.keys(overrides.__meta?.humanReviewed ?? {});
      const completion = calculateCompletion(overrides);
      const namespaceCompletion = calculateNamespaceCompletion(overrides);

      return {
        locale: code,
        code,
        label: overrides.__label ?? meta?.label ?? code.toUpperCase(),
        nativeName: meta?.nativeName ?? code,
        messages: buildLocaleCatalog(clean),
        baseMessages,
        completion,
        namespaceCompletion,
        missingKeys,
        machineTranslatedKeys,
        humanReviewedKeys,
      };
    },

    async saveCatalog(locale, messages) {
      const code = resolveLocaleCode(locale);
      const current = overridesByLocale[code] ?? {};
      const next = { ...current, ...messages };
      overridesByLocale[code] = next;
      await writeLocaleOverrides(code, next);
      return this.getCatalog(code);
    },

    async autoTranslate(locale, translator, options = {}) {
      const code = resolveLocaleCode(locale);
      const settings = this.getSettings(code);
      const sourceCode = resolveLocaleCode(settings.sourceLocale ?? DEFAULT_LOCALE);
      const sourceCatalog = this.getCatalog(sourceCode).messages;
      const scope = options.scope ?? 'missing';

      // Determine which keys to translate
      const currentOverrides = stripMeta(overridesByLocale[code] ?? {});
      let keysToTranslate;
      if (scope === 'full') {
        keysToTranslate = listMessageKeys();
      } else if (scope === 'missing') {
        keysToTranslate = listMessageKeys().filter((k) => !(k in currentOverrides));
      } else {
        // Scope is a namespace name
        const nsFn = NAMESPACES[scope];
        keysToTranslate = nsFn
          ? listMessageKeys().filter((k) => nsFn(k) && !(k in currentOverrides))
          : listMessageKeys().filter((k) => !(k in currentOverrides));
      }

      const sourceMessages = keysToTranslate.reduce((acc, key) => {
        acc[key] = sourceCatalog[key] ?? baseMessages[key];
        return acc;
      }, {});

      const generated = await translator({ locale: code, settings, messages: sourceMessages });

      // Tag each generated key as machine-translated in __meta
      const existingMeta = overridesByLocale[code]?.__meta ?? { machineTranslated: {}, humanReviewed: {} };
      const nextMeta = {
        ...existingMeta,
        machineTranslated: { ...existingMeta.machineTranslated },
        lastTranslatedAt: new Date().toISOString(),
      };
      for (const key of Object.keys(generated)) {
        nextMeta.machineTranslated[key] = true;
        delete nextMeta.humanReviewed[key]; // re-translation clears human review flag
      }

      const merged = { ...generated, __meta: nextMeta };
      return this.saveCatalog(code, merged);
    },

    getStatus() {
      const localeList = this.listLocales();
      const totalKeys = listMessageKeys().length;
      return {
        locales: localeList.map(({ code, label, completion, status, namespaceCompletion }) => ({
          code,
          label,
          completion,
          status,
          namespaceCompletion,
        })),
        totalKeys,
        generatedAt: new Date().toISOString(),
      };
    },

    getSettings(locale) {
      const code = resolveLocaleCode(locale);
      return { ...defaultTranslationSettings(), ...(settingsByLocale[code] ?? {}) };
    },

    async saveSettings(locale, settings) {
      const code = resolveLocaleCode(locale);
      settingsByLocale[code] = { ...defaultTranslationSettings(), ...settings };
      await writeSettings(settingsByLocale);
      return this.getSettings(code);
    },
  };
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

async function migrateLegacyLocaleFiles() {
  for (const [legacy, bcp47] of Object.entries(LEGACY_ALIASES)) {
    const oldPath = path.join(localeDir, `${legacy}.json`);
    const newPath = path.join(localeDir, `${bcp47}.json`);
    try {
      await readFile(newPath, 'utf8');
      // New file already exists — skip
    } catch {
      try {
        await readFile(oldPath, 'utf8');
        await rename(oldPath, newPath);
        console.log(`[i18n-store] Migrated ${legacy}.json → ${bcp47}.json`);
      } catch {
        // Old file doesn't exist either — nothing to do
      }
    }
  }

  // Also migrate legacy settings keys (e.g. "en" → "en-US")
  const settingsByLocale = await readSettings();
  let dirty = false;
  for (const [legacy, bcp47] of Object.entries(LEGACY_ALIASES)) {
    if (settingsByLocale[legacy] && !settingsByLocale[bcp47]) {
      settingsByLocale[bcp47] = settingsByLocale[legacy];
      delete settingsByLocale[legacy];
      dirty = true;
    }
  }
  if (dirty) await writeSettings(settingsByLocale);
}

async function readLocaleOverrides(locale) {
  try {
    const file = await readFile(path.join(localeDir, `${locale}.json`), 'utf8');
    return JSON.parse(file);
  } catch {
    return {};
  }
}

async function writeLocaleOverrides(locale, messages) {
  await writeFile(
    path.join(localeDir, `${locale}.json`),
    JSON.stringify(messages, null, 2),
  );
}

async function readSettings() {
  try {
    const file = await readFile(settingsFile, 'utf8');
    return JSON.parse(file);
  } catch {
    return {};
  }
}

async function writeSettings(settingsByLocale) {
  await writeFile(settingsFile, JSON.stringify(settingsByLocale, null, 2));
}

function stripMeta(messages) {
  const clone = { ...messages };
  delete clone.__label;
  delete clone.__meta;
  return clone;
}

function calculateCompletion(messages = {}) {
  const translatedKeys = Object.keys(stripMeta(messages)).length;
  const total = listMessageKeys().length;
  if (total === 0) return 100;
  return Math.round((translatedKeys / total) * 100);
}

function calculateNamespaceCompletion(messages = {}) {
  const clean = stripMeta(messages);
  const allKeys = listMessageKeys();
  const result = {};

  for (const [ns, matchFn] of Object.entries(NAMESPACES)) {
    if (ns === 'common') continue;
    const nsKeys = allKeys.filter(matchFn);
    if (nsKeys.length === 0) continue;
    const translated = nsKeys.filter((k) => k in clean).length;
    result[ns] = Math.round((translated / nsKeys.length) * 100);
  }
  return result;
}

function defaultTranslationSettings() {
  return {
    sourceLocale: DEFAULT_LOCALE,
    tone: 'pastoral',
    fallbackMode: 'copy',
    useGlossary: true,
    glossary: {},
  };
}
