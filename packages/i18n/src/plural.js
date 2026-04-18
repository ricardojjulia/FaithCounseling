/**
 * Lightweight plural rule engine using native Intl.PluralRules.
 *
 * Convention: sibling keys with _one / _other suffixes.
 *   baseMessages['items.count']      = '{count} items'
 *   baseMessages['items.count_one']  = '1 item'
 *   baseMessages['items.count_other']= '{count} items'
 *
 * selectPluralKey(messages, key, count, locale)
 *   → the resolved key to look up (e.g. 'items.count_one')
 *
 * No external dependencies — Intl.PluralRules is available in Node 10+
 * and all modern browsers.
 */

const rulesCache = new Map();

function getPluralRules(locale) {
  if (!rulesCache.has(locale)) {
    try {
      rulesCache.set(locale, new Intl.PluralRules(locale));
    } catch {
      rulesCache.set(locale, new Intl.PluralRules('en-US'));
    }
  }
  return rulesCache.get(locale);
}

/**
 * Given a message key and a count, return the best matching sibling key.
 * Falls back to the base key if no plural sibling exists.
 *
 * @param {Record<string,string>} messages - flat message catalog
 * @param {string} key - base message key
 * @param {number} count
 * @param {string} locale - BCP 47 locale tag
 * @returns {string} the key to use for lookup
 */
export function selectPluralKey(messages, key, count, locale = 'en-US') {
  const form = getPluralRules(locale).select(count); // 'one' | 'other' | 'zero' | 'few' | 'many'
  const specificKey = `${key}_${form}`;
  if (specificKey in messages) return specificKey;
  // Fallback chain: _other → base key
  const otherKey = `${key}_other`;
  if (otherKey in messages) return otherKey;
  return key;
}

/**
 * @param {string} locale
 * @param {number} count
 * @returns {'one'|'other'|'zero'|'few'|'many'}
 */
export function selectPluralForm(locale, count) {
  return getPluralRules(locale).select(count);
}
