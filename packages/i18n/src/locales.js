/**
 * Canonical registry of supported UI locales.
 *
 * Each entry is the single source of truth for:
 *   - BCP 47 locale tag (code)
 *   - Human-readable labels
 *   - RTL flag (for <html dir="..."> wiring)
 *   - Default currency for formatCurrency()
 *   - Region identifier
 *
 * To add a new locale, append an entry here. All other system
 * components (i18n-store, i18nContext, the /translate-locale skill)
 * read from this list.
 */

export const SUPPORTED_LOCALES = Object.freeze([
  {
    code: 'en-US',
    label: 'English (United States)',
    nativeName: 'English',
    rtl: false,
    currencyCode: 'USD',
    currencySymbol: '$',
    region: 'us',
  },
  {
    code: 'es-MX',
    label: 'Spanish (Mexico)',
    nativeName: 'Español',
    rtl: false,
    currencyCode: 'MXN',
    currencySymbol: '$',
    region: 'mx',
  },
  {
    code: 'fr-FR',
    label: 'French (France)',
    nativeName: 'Français',
    rtl: false,
    currencyCode: 'EUR',
    currencySymbol: '€',
    region: 'fr',
  },
  {
    code: 'pt-BR',
    label: 'Portuguese (Brazil)',
    nativeName: 'Português',
    rtl: false,
    currencyCode: 'BRL',
    currencySymbol: 'R$',
    region: 'br',
  },
]);

/** Map of BCP 47 code → locale metadata for O(1) lookups. */
export const LOCALE_MAP = Object.freeze(
  Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l.code, l])),
);

/** Default UI locale tag. */
export const DEFAULT_LOCALE = 'en-US';

/** Legacy 2-letter code → BCP 47 alias map for backward-compat migration. */
export const LEGACY_ALIASES = Object.freeze({
  en: 'en-US',
  es: 'es-MX',
  fr: 'fr-FR',
  pt: 'pt-BR',
});

/**
 * Resolve a locale code to its canonical BCP 47 form.
 * Handles legacy 2-letter codes, case normalization, and unknown codes.
 *
 * @param {string} code
 * @returns {string} canonical BCP 47 code, or DEFAULT_LOCALE as fallback
 */
export function resolveLocaleCode(code) {
  if (typeof code !== 'string' || !code.trim()) return DEFAULT_LOCALE;
  const trimmed = code.trim();

  // Direct match (case-insensitive region subtag tolerance)
  const direct = SUPPORTED_LOCALES.find(
    (l) => l.code.toLowerCase() === trimmed.toLowerCase(),
  );
  if (direct) return direct.code;

  // Legacy 2-letter alias
  const alias = LEGACY_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  // Primary subtag match: 'en' → 'en-US', 'es' → 'es-MX'
  const primary = trimmed.split('-')[0].toLowerCase();
  const byPrimary = SUPPORTED_LOCALES.find(
    (l) => l.code.split('-')[0].toLowerCase() === primary,
  );
  if (byPrimary) return byPrimary.code;

  return DEFAULT_LOCALE;
}

/** Locale labels keyed by BCP 47 code — drop-in for the old localeLabels export. */
export const localeLabels = Object.freeze(
  Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l.code, l.label])),
);
