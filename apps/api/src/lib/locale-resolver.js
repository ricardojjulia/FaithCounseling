/**
 * Server-side locale resolution.
 *
 * Priority order:
 *   1. User's preferred_ui_locale (from session/staff_members row)
 *   2. Accept-Language header — first token matched against supported locales
 *   3. Tenant's default_ui_locale
 *   4. DEFAULT_LOCALE ('en-US')
 */

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, resolveLocaleCode } from '../../../../packages/i18n/src/index.js';

const SUPPORTED_CODES = new Set(SUPPORTED_LOCALES.map((l) => l.code));

/**
 * Parse the Accept-Language header and return the best matching supported locale.
 * @param {string} header
 * @returns {string|null}
 */
function matchAcceptLanguage(header) {
  if (!header) return null;
  // Parse "es-MX,es;q=0.9,en;q=0.8" into ordered list
  const tags = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.trim(), q: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.q - a.q)
    .map((p) => p.tag);

  for (const tag of tags) {
    const resolved = resolveLocaleCode(tag);
    if (SUPPORTED_CODES.has(resolved)) return resolved;
  }
  return null;
}

/**
 * Resolve the effective UI locale for a request.
 *
 * @param {import('http').IncomingMessage} request
 * @param {object|null} session  - decoded session object (may have preferredUiLocale)
 * @param {object|null} tenantRow - tenant DB row (may have default_ui_locale)
 * @returns {string} BCP 47 locale code
 */
export function resolveRequestLocale(request, session, tenantRow) {
  // 1. User preference from session
  const userLocale = session?.preferredUiLocale ?? session?.preferred_ui_locale;
  if (userLocale) {
    const resolved = resolveLocaleCode(userLocale);
    if (SUPPORTED_CODES.has(resolved)) return resolved;
  }

  // 2. Accept-Language header
  const acceptLang = request?.headers?.['accept-language'];
  if (acceptLang) {
    const fromHeader = matchAcceptLanguage(acceptLang);
    if (fromHeader) return fromHeader;
  }

  // 3. Tenant default
  const tenantLocale = tenantRow?.default_ui_locale;
  if (tenantLocale) {
    const resolved = resolveLocaleCode(tenantLocale);
    if (SUPPORTED_CODES.has(resolved)) return resolved;
  }

  return DEFAULT_LOCALE;
}
