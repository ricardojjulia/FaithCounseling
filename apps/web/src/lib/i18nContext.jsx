import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  baseMessages,
  buildLocaleCatalog,
  defaultLocale,
  formatMessage,
  formatDate,
  formatNumber,
  formatCurrency,
  localeLabels,
  resolveLocaleCode,
} from '@churchcore/i18n';
const LOCALE_STORAGE_KEY = 'churchcore.locale';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Migrate legacy 2-letter codes ('en', 'es') to BCP 47 ('en-US', 'es-MX'). */
function migrateStoredLocale(raw) {
  if (!raw) return defaultLocale;
  const resolved = resolveLocaleCode(raw);
  if (resolved !== raw) {
    try { localStorage.setItem(LOCALE_STORAGE_KEY, resolved); } catch { /* ignore */ }
  }
  return resolved;
}

function normalizeLocalesResponse(payload, isAdmin = false) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const fromApi = items
    .filter((item) => isAdmin || !item?.isStub)
    .map((item) => {
      const code = resolveLocaleCode(item?.locale ?? item?.code ?? '');
      const completion = item?.completion ?? 100;
      const status = item?.status ?? 'complete';
      const nativeName = item?.nativeName ?? item?.label ?? code.toUpperCase();
      let label = item?.label || localeLabels[code] || code.toUpperCase();
      if (status === 'stub') label = `${nativeName} [stub]`;
      else if (status === 'partial') label = `${nativeName} (${completion}%)`;
      else label = nativeName;
      return {
        value: code,
        label,
        nativeName,
        status,
        completion,
        rtl: item?.rtl ?? false,
      };
    });

  if (fromApi.length > 0) return fromApi;

  return Object.entries(localeLabels).map(([code, label]) => ({
    value: code,
    label,
    nativeName: label,
    status: 'complete',
    completion: 100,
    rtl: false,
  }));
}

function applyHtmlLocale(locale, rtl = false) {
  try {
    document.documentElement.setAttribute('lang', locale);
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
  } catch { /* SSR / test env */ }
}

// ---------------------------------------------------------------------------
// Context definition
// ---------------------------------------------------------------------------

const I18nContext = createContext({
  locale: defaultLocale,
  localeMetadata: null,
  messages: baseMessages,
  locales: [],
  loading: false,
  t: (key, values) => formatMessage(baseMessages, key, values, defaultLocale),
  formatDate: (date, style) => formatDate(date, style, defaultLocale),
  formatNumber: (n, opts) => formatNumber(n, opts, defaultLocale),
  formatCurrency: (cents) => formatCurrency(cents, defaultLocale),
  setLocale: async () => {},
  refreshLocales: async () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function I18nProvider({ children, currentUser }) {
  const initialLocale = migrateStoredLocale(
    localStorage.getItem(LOCALE_STORAGE_KEY) || defaultLocale,
  );

  const [locale, setLocaleState] = useState(initialLocale);
  const [localeMetadata, setLocaleMetadata] = useState(null);
  const [messages, setMessages] = useState(baseMessages);
  const [locales, setLocales] = useState(() =>
    Object.entries(localeLabels).map(([code, label]) => ({
      value: code,
      label,
      nativeName: label,
      status: 'complete',
      completion: 100,
      rtl: false,
    })),
  );
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.role === 'practice_admin' || currentUser?.role === 'platform_admin';

  const loadCatalog = useCallback(async (nextLocale) => {
    const code = resolveLocaleCode(nextLocale);
    const response = await fetch(`/api/v1/i18n/catalog?locale=${encodeURIComponent(code)}`, { credentials: 'include' });
    if (!response.ok) throw new Error(`Unable to load locale catalog (${response.status})`);
    const payload = await response.json();
    const catalog = buildLocaleCatalog(payload?.messages ?? {});
    setMessages(catalog);
    return code;
  }, []);

  const refreshLocales = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/i18n/locales', { credentials: 'include' });
      if (!response.ok) throw new Error(`Unable to load locales (${response.status})`);
      const payload = await response.json();
      const normalized = normalizeLocalesResponse(payload, isAdmin);
      setLocales(normalized);

      // Update metadata for the current locale
      const currentMeta = (payload?.items ?? []).find(
        (i) => resolveLocaleCode(i?.locale ?? i?.code ?? '') === locale,
      );
      if (currentMeta) setLocaleMetadata(currentMeta);

      // If the active locale became a stub, fall back silently
      if (currentMeta?.isStub) {
        const fallback = defaultLocale;
        const applied = await loadCatalog(fallback);
        setLocaleState(applied);
        localStorage.setItem(LOCALE_STORAGE_KEY, applied);
        applyHtmlLocale(applied, false);
      }
    } catch {
      setLocales(
        Object.entries(localeLabels).map(([code, label]) => ({
          value: code,
          label,
          nativeName: label,
          status: 'complete',
          completion: 100,
          rtl: false,
        })),
      );
    }
  }, [locale, isAdmin, loadCatalog]);

  const setLocale = useCallback(async (nextLocale) => {
    const code = resolveLocaleCode(nextLocale);
    if (!code || code === locale) return;

    setLoading(true);
    try {
      const applied = await loadCatalog(code);

      // Find metadata for the new locale
      const meta = locales.find((l) => l.value === applied);
      setLocaleMetadata(meta ?? null);
      applyHtmlLocale(applied, meta?.rtl ?? false);

      setLocaleState(applied);
      localStorage.setItem(LOCALE_STORAGE_KEY, applied);

    } catch {
      // locale switch failed
    } finally {
      setLoading(false);
    }
  }, [loadCatalog, locale, locales]);

  // Bootstrap on mount
  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      setLoading(true);
      try {
        const [, appliedLocale] = await Promise.all([refreshLocales(), loadCatalog(initialLocale)]);
        if (!cancelled) {
          const code = appliedLocale ?? initialLocale;
          setLocaleState(code);
          localStorage.setItem(LOCALE_STORAGE_KEY, code);
          // Apply html attributes with initial locale (RTL unknown until locales load)
          applyHtmlLocale(code, false);
        }
      } catch {
        if (!cancelled) {
          setMessages(baseMessages);
          setLocaleState(defaultLocale);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({
    locale,
    localeMetadata,
    messages,
    locales,
    loading,
    t: (key, values) => formatMessage(messages, key, values, locale),
    formatDate: (date, style) => formatDate(date, style, locale),
    formatNumber: (n, opts) => formatNumber(n, opts, locale),
    formatCurrency: (cents) => formatCurrency(cents, locale),
    setLocale,
    refreshLocales,
  }), [locale, localeMetadata, messages, locales, loading, setLocale, refreshLocales]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
