/* Operations Studio — all button handlers */
'use strict';

// ── Helpers ───────────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

function showToast(message, type = 'info') {
  const toast = el('toast');
  toast.textContent = message;
  toast.className = `visible ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = ''; }, 4500);
}

function setStatus(statusId, message, type = 'info') {
  const bar = el(statusId);
  if (!bar) return;
  bar.textContent = message;
  bar.className = `status-bar visible ${type}`;
}

function clearStatus(statusId) {
  const bar = el(statusId);
  if (bar) bar.className = 'status-bar';
}

function setBusy(btn, busy) {
  if (!btn) return;
  btn.disabled = busy;
  if (busy) {
    btn._origText = btn.textContent;
    btn.textContent = 'Working…';
  } else {
    btn.textContent = btn._origText ?? btn.textContent;
  }
}

async function apiGet(path) {
  const res = await fetch(`/api${path}`, { credentials: 'include' });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `${res.status} ${res.statusText}`);
  return payload;
}

async function apiPost(path, body) {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `${res.status} ${res.statusText}`);
  return payload;
}

async function apiPatch(path, body) {
  const res = await fetch(`/api${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `${res.status} ${res.statusText}`);
  return payload;
}

async function apiPut(path, body) {
  const res = await fetch(`/api${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `${res.status} ${res.statusText}`);
  return payload;
}

function pretty(obj) { return JSON.stringify(obj, null, 2); }

// ── Connection status ─────────────────────────────────────────────────────────

async function checkConnection() {
  const pill = el('connectionStatus');
  try {
    const res = await fetch('/api/health', { credentials: 'include' });
    if (!res.ok) throw new Error();
    const data = await res.json();
    pill.textContent = `Live · ${data.service ?? 'API'}`;
    pill.className = 'status-pill connected';
  } catch {
    pill.textContent = 'API offline';
    pill.className = 'status-pill error';
  }
}

// ── Tab switching ─────────────────────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const panel = el(`tab-${btn.dataset.tab}`);
      if (panel) panel.classList.add('active');
    });
  });
}

// ── Reporting tab ─────────────────────────────────────────────────────────────

function initReporting() {
  el('refreshReportingBtn')?.addEventListener('click', async () => {
    const btn = el('refreshReportingBtn');
    const days = parseInt(el('reportingWindowDays')?.value || '30', 10);
    setBusy(btn, true);
    clearStatus('reportingStatus');
    try {
      const data = await apiGet(`/v1/reporting/overview?days=${days}`);
      el('reportingSummary').value = pretty(data);
      setStatus('reportingStatus', 'Report loaded.', 'success');
    } catch (err) {
      setStatus('reportingStatus', `Error: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false);
    }
  });

  el('refreshPlatformBtn')?.addEventListener('click', async () => {
    const btn = el('refreshPlatformBtn');
    setBusy(btn, true);
    clearStatus('platformStatus');
    try {
      const data = await apiGet('/v1/platform/overview');
      el('platformSummary').value = pretty(data);
      setStatus('platformStatus', 'Platform summary loaded.', 'success');
    } catch (err) {
      setStatus('platformStatus', `Error: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false);
    }
  });
}

// ── Platform Ops tab ──────────────────────────────────────────────────────────

function initPlatform() {
  el('createTenantBtn')?.addEventListener('click', async () => {
    const btn = el('createTenantBtn');
    const tenantId    = el('tenantId')?.value.trim();
    const practiceName = el('practiceName')?.value.trim();
    const ownerEmail  = el('ownerEmail')?.value.trim();

    if (!tenantId || !practiceName || !ownerEmail) {
      setStatus('tenantStatus', 'Tenant ID, practice name, and owner email are all required.', 'error');
      return;
    }

    setBusy(btn, true);
    clearStatus('tenantStatus');
    try {
      const data = await apiPost('/v1/platform/tenant-provisioning', { tenantId, practiceName, ownerEmail });
      const id = data.item?.id ?? data.id ?? 'OK';
      setStatus('tenantStatus', `Provisioning request created (ID: ${id}).`, 'success');
      showToast(`Tenant provisioning queued: ${id}`, 'success');
      el('tenantId').value = '';
      el('practiceName').value = '';
      el('ownerEmail').value = '';
    } catch (err) {
      setStatus('tenantStatus', `Error: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false);
    }
  });

  el('startImpersonationBtn')?.addEventListener('click', async () => {
    const btn    = el('startImpersonationBtn');
    const targetTenantId = el('impersonationTenantId')?.value.trim();
    const role   = el('impersonationRole')?.value;
    const reason = el('impersonationReason')?.value.trim();

    if (!targetTenantId || !reason) {
      setStatus('impersonationStatus', 'Target tenant ID and reason are required.', 'error');
      return;
    }

    setBusy(btn, true);
    clearStatus('impersonationStatus');
    try {
      const data = await apiPost('/v1/platform/impersonation-sessions', { targetTenantId, role, reason });
      const id = data.item?.id ?? data.id ?? 'OK';
      setStatus('impersonationStatus', `Session started (ID: ${id}). Copy this ID to end the session.`, 'success');
      showToast(`Impersonation session started: ${id}`, 'success');
      el('endSessionId').value = id;
    } catch (err) {
      setStatus('impersonationStatus', `Error: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false);
    }
  });

  el('endImpersonationBtn')?.addEventListener('click', async () => {
    const btn       = el('endImpersonationBtn');
    const sessionId = el('endSessionId')?.value.trim();

    if (!sessionId) {
      setStatus('impersonationStatus', 'Session ID is required.', 'error');
      return;
    }

    setBusy(btn, true);
    clearStatus('impersonationStatus');
    try {
      await apiPatch(`/v1/platform/impersonation-sessions/${sessionId}`, { status: 'ended' });
      setStatus('impersonationStatus', `Session ${sessionId} ended and audit event recorded.`, 'success');
      showToast('Impersonation session ended.', 'success');
      el('endSessionId').value = '';
    } catch (err) {
      setStatus('impersonationStatus', `Error: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false);
    }
  });
}

// ── Data & Retention tab ──────────────────────────────────────────────────────

function initData() {
  el('requestExportBtn')?.addEventListener('click', async () => {
    const btn        = el('requestExportBtn');
    const exportType = el('exportType')?.value;
    const format     = el('exportFormat')?.value;

    setBusy(btn, true);
    clearStatus('exportStatus');
    try {
      const data = await apiPost('/v1/platform/data-exports', { exportType, format });
      const id = data.item?.id ?? data.id ?? 'OK';
      setStatus('exportStatus', `Export job queued (ID: ${id}). Status: ${data.item?.status ?? 'queued'}.`, 'success');
      showToast(`Export job queued: ${id}`, 'success');
    } catch (err) {
      setStatus('exportStatus', `Error: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false);
    }
  });

  el('saveRetentionBtn')?.addEventListener('click', async () => {
    const btn = el('saveRetentionBtn');
    setBusy(btn, true);
    clearStatus('retentionStatus');
    try {
      await apiPut('/v1/platform/retention-policies', {
        clinicalRecords:         el('retentionClinical')?.value,
        billing:                 el('retentionBilling')?.value,
        auditLog:                el('retentionAudit')?.value,
        includeDocumentVersions: el('retentionIncludeDocVersions')?.checked ?? true,
        legalHoldEnabled:        el('retentionLegalHold')?.checked ?? false,
      });
      setStatus('retentionStatus', 'Retention policy saved.', 'success');
      showToast('Retention policy saved.', 'success');
    } catch (err) {
      setStatus('retentionStatus', `Error: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false);
    }
  });
}

// ── Language Studio tab ───────────────────────────────────────────────────────

let catalogData = {};  // key → translated string
let allKeys     = [];  // all keys in loaded catalog

function renderTranslationEditor(filter = '') {
  const editor = el('translationEditor');
  if (!editor) return;

  const q = filter.toLowerCase().trim();
  const keys = q ? allKeys.filter((k) => k.toLowerCase().includes(q)) : allKeys;

  if (!keys.length) {
    editor.innerHTML = '<p style="color:#94a3b8;padding:16px;text-align:center;font-size:13px">No matching keys.</p>';
    return;
  }

  editor.innerHTML = keys.map((key) => `
    <div class="translation-row">
      <span class="translation-key" title="${key}">${key}</span>
      <input type="text" data-key="${key}" value="${escHtml(catalogData[key] ?? '')}" />
    </div>
  `).join('');

  editor.querySelectorAll('input[data-key]').forEach((input) => {
    input.addEventListener('change', () => {
      catalogData[input.dataset.key] = input.value;
    });
  });
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function loadLocales() {
  try {
    const data = await apiGet('/v1/i18n/locales');
    const locales = data.items ?? data.locales ?? [];
    const select  = el('translationLocaleSelect');
    if (!select) return;

    select.innerHTML = '<option value="">— Select locale —</option>';
    locales.forEach((loc) => {
      const opt = document.createElement('option');
      opt.value = loc.code ?? loc;
      opt.textContent = loc.label ? `${loc.label} (${loc.code})` : loc;
      select.appendChild(opt);
    });
  } catch {
    // silently leave default option
  }
}

function initLanguage() {
  loadLocales();

  el('createLocaleBtn')?.addEventListener('click', async () => {
    const btn   = el('createLocaleBtn');
    const code  = el('newLocaleCode')?.value.trim();
    const label = el('newLocaleLabel')?.value.trim();

    if (!code) { setStatus('localeStatus', 'Locale code is required.', 'error'); return; }

    setBusy(btn, true);
    clearStatus('localeStatus');
    try {
      await apiPost('/v1/i18n/locales', { code, label: label || code });
      setStatus('localeStatus', `Locale "${code}" created.`, 'success');
      showToast(`Locale "${code}" created.`, 'success');
      el('newLocaleCode').value = '';
      el('newLocaleLabel').value = '';
      await loadLocales();
    } catch (err) {
      setStatus('localeStatus', `Error: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false);
    }
  });

  el('loadLocaleBtn')?.addEventListener('click', async () => {
    const btn    = el('loadLocaleBtn');
    const locale = el('translationLocaleSelect')?.value;
    if (!locale) { setStatus('localeStatus', 'Select a locale first.', 'error'); return; }

    setBusy(btn, true);
    clearStatus('localeStatus');
    try {
      const data = await apiGet(`/v1/i18n/catalog?locale=${encodeURIComponent(locale)}`);
      catalogData = data.translations ?? data ?? {};
      allKeys = Object.keys(catalogData).sort();
      renderTranslationEditor();
      setStatus('localeStatus', `Loaded ${allKeys.length} keys for "${locale}".`, 'success');
    } catch (err) {
      setStatus('localeStatus', `Error: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false);
    }
  });

  el('translationFilter')?.addEventListener('input', (e) => {
    renderTranslationEditor(e.target.value);
  });

  el('saveTranslationsBtn')?.addEventListener('click', async () => {
    const btn    = el('saveTranslationsBtn');
    const locale = el('translationLocaleSelect')?.value;
    if (!locale) { setStatus('translationsStatus', 'Load a locale first.', 'error'); return; }

    setBusy(btn, true);
    clearStatus('translationsStatus');
    try {
      await apiPatch(`/v1/i18n/catalog/${encodeURIComponent(locale)}`, { translations: catalogData });
      setStatus('translationsStatus', 'Translations saved.', 'success');
      showToast('Translations saved.', 'success');
    } catch (err) {
      setStatus('translationsStatus', `Error: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false);
    }
  });

  el('autoTranslateBtn')?.addEventListener('click', async () => {
    const btn    = el('autoTranslateBtn');
    const locale = el('translationLocaleSelect')?.value;
    if (!locale) { setStatus('translationsStatus', 'Load a locale first.', 'error'); return; }

    const glossaryRaw = el('translationGlossary')?.value ?? '';
    const glossary    = {};
    glossaryRaw.split('\n').forEach((line) => {
      const [src, tgt] = line.split('=');
      if (src && tgt) glossary[src.trim()] = tgt.trim();
    });

    setBusy(btn, true);
    clearStatus('translationsStatus');
    try {
      const data = await apiPost('/v1/i18n/translate', {
        targetLocale:  locale,
        sourceLocale:  el('translationSourceLocale')?.value || 'en',
        tone:          el('translationTone')?.value || 'neutral',
        fallbackMode:  el('translationFallbackMode')?.value || 'prefixed',
        useGlossary:   el('translationUseGlossary')?.checked ?? true,
        glossary,
      });
      const translated = data.translations ?? {};
      Object.assign(catalogData, translated);
      allKeys = [...new Set([...allKeys, ...Object.keys(translated)])].sort();
      renderTranslationEditor(el('translationFilter')?.value ?? '');
      setStatus('translationsStatus', `Auto-translated ${Object.keys(translated).length} key(s). Review and save.`, 'success');
      showToast('Auto-translate complete. Review then save.', 'success');
    } catch (err) {
      setStatus('translationsStatus', `Error: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false);
    }
  });

  el('saveTranslationConfigBtn')?.addEventListener('click', async () => {
    const btn    = el('saveTranslationConfigBtn');
    const locale = el('translationLocaleSelect')?.value;
    if (!locale) { setStatus('configStatus', 'Select a locale first.', 'error'); return; }

    const glossaryRaw = el('translationGlossary')?.value ?? '';
    const glossary    = {};
    glossaryRaw.split('\n').forEach((line) => {
      const [src, tgt] = line.split('=');
      if (src && tgt) glossary[src.trim()] = tgt.trim();
    });

    setBusy(btn, true);
    clearStatus('configStatus');
    try {
      await apiPatch(`/v1/i18n/settings/${encodeURIComponent(locale)}`, {
        sourceLocale: el('translationSourceLocale')?.value || 'en',
        tone:         el('translationTone')?.value || 'neutral',
        fallbackMode: el('translationFallbackMode')?.value || 'prefixed',
        useGlossary:  el('translationUseGlossary')?.checked ?? true,
        glossary,
      });
      setStatus('configStatus', 'Translation config saved.', 'success');
      showToast('Translation config saved.', 'success');
    } catch (err) {
      setStatus('configStatus', `Error: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false);
    }
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  checkConnection();
  initTabs();
  initReporting();
  initPlatform();
  initData();
  initLanguage();
});
