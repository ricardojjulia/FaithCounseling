/* Operations Studio — all button handlers */
'use strict';

window.faithTelemetry?.start({ surfaceId: 'operations', surfaceKind: 'page' });

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
  return window.faithTelemetry?.instrumentRequest(`/api${path}`, 'GET', async () => {
    const res = await fetch(`/api${path}`, { credentials: 'include' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(payload.error || `${res.status} ${res.statusText}`);
      error.status = res.status;
      error.statusClass = `${Math.floor(res.status / 100)}xx`;
      throw error;
    }
    return payload;
  }, { workflow: 'operations' }) ?? Promise.resolve({});
}

async function apiPost(path, body) {
  return window.faithTelemetry?.instrumentRequest(`/api${path}`, 'POST', async () => {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(payload.error || `${res.status} ${res.statusText}`);
      error.status = res.status;
      error.statusClass = `${Math.floor(res.status / 100)}xx`;
      throw error;
    }
    return payload;
  }, { workflow: 'operations' }) ?? Promise.resolve({});
}

async function apiPatch(path, body) {
  return window.faithTelemetry?.instrumentRequest(`/api${path}`, 'PATCH', async () => {
    const res = await fetch(`/api${path}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(payload.error || `${res.status} ${res.statusText}`);
      error.status = res.status;
      error.statusClass = `${Math.floor(res.status / 100)}xx`;
      throw error;
    }
    return payload;
  }, { workflow: 'operations' }) ?? Promise.resolve({});
}

async function apiPut(path, body) {
  return window.faithTelemetry?.instrumentRequest(`/api${path}`, 'PUT', async () => {
    const res = await fetch(`/api${path}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(payload.error || `${res.status} ${res.statusText}`);
      error.status = res.status;
      error.statusClass = `${Math.floor(res.status / 100)}xx`;
      throw error;
    }
    return payload;
  }, { workflow: 'operations' }) ?? Promise.resolve({});
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
      const startedAt = performance.now();
      document.querySelectorAll('.tab-btn').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const panel = el(`tab-${btn.dataset.tab}`);
      if (panel) panel.classList.add('active');
      window.faithTelemetry?.trackInteraction('tab.switch', performance.now() - startedAt, {
        workflow: 'operations',
        result: 'success',
      });
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

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtRelTime(iso) {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtActionHtml(action) {
  if (!action) return '—';
  const parts = String(action).split('.');
  if (parts.length === 1) return `<span class="audit-action-text">${escapeHtml(action)}</span>`;
  const [module, ...rest] = parts;
  const sep = '<span class="audit-action-sep">.</span>';
  return `<span class="audit-action-text"><span class="audit-action-module">${escapeHtml(module)}</span>${sep}${rest.map(escapeHtml).join(sep)}</span>`;
}

function roleBadgeClass(role) {
  if (!role) return '';
  if (role === 'practice_owner') return 'audit-role-owner';
  if (role === 'practice_admin') return 'audit-role-admin';
  if (role === 'system')         return 'audit-role-system';
  if (role === 'counselor')      return 'audit-role-counselor';
  return '';
}

function initAuditIntelligence() {
  // Window preset buttons
  document.querySelectorAll('.audit-window-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.audit-window-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      el('auditWindowDays').value = btn.dataset.days;
    });
  });

  el('auditActionFilter')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runAuditQuery();
  });

  el('refreshAuditBtn')?.addEventListener('click', runAuditQuery);
}

async function runAuditQuery() {
  const btn = el('refreshAuditBtn');
  setBusy(btn, true);
  clearStatus('auditStatus');

  const params = new URLSearchParams();
  const days      = String(el('auditWindowDays')?.value  || '7').trim();
  const result    = String(el('auditResultFilter')?.value || '').trim();
  const actorRole = String(el('auditRoleFilter')?.value  || '').trim();
  const action    = String(el('auditActionFilter')?.value || '').trim();

  if (days)      params.set('days', days);
  if (result)    params.set('result', result);
  if (actorRole) params.set('actorRole', actorRole);
  if (action)    params.set('action', action);
  params.set('limit', '100');

  try {
    const data = await apiGet(`/v1/audit/intelligence?${params.toString()}`);
    renderAuditSummary(data.summary ?? {}, Number(days));
    renderAuditEvents(data.events ?? [], Number(days));
    const count = Array.isArray(data.events) ? data.events.length : 0;
    if (count === 0) {
      clearStatus('auditStatus');
    } else {
      setStatus('auditStatus', `Query returned ${count} event(s) · window: last ${days} day(s).`, 'success');
    }
  } catch (err) {
    setStatus('auditStatus', `Error: ${err.message}`, 'error');
  } finally {
    setBusy(btn, false);
  }
}

function renderAuditSummary(summary, days) {
  const statsRow  = el('auditStatsRow');
  const breakdowns = el('auditBreakdowns');
  if (!statsRow) return;

  statsRow.style.display = '';

  const total    = summary.total ?? 0;
  const byResult = summary.byResult ?? [];
  const get = (key) => byResult.find((r) => r.result === key)?.total ?? 0;

  el('auditStatTotal').textContent   = total.toLocaleString();
  el('auditStatWindow').textContent  = `last ${summary.window?.days ?? days} days`;
  el('auditStatSuccess').textContent = get('success').toLocaleString();
  el('auditStatDenied').textContent  = get('denied').toLocaleString();
  el('auditStatError').textContent   = get('error').toLocaleString();

  if (!breakdowns) return;
  breakdowns.style.display = '';

  function renderBars(containerId, items, key, color) {
    const container = el(containerId);
    if (!container) return;
    if (!items.length) { container.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:4px 0">No data in this window</div>'; return; }
    const max = items[0]?.total ?? 1;
    container.innerHTML = items.slice(0, 8).map((item) => `
      <div class="audit-bar-row">
        <div class="audit-bar-label" title="${escapeHtml(item[key])}">${escapeHtml(item[key] ?? '—')}</div>
        <div class="audit-bar-track">
          <div class="audit-bar-fill" style="width:${((item.total / max) * 100).toFixed(1)}%;background:${color}"></div>
        </div>
        <div class="audit-bar-count">${item.total}</div>
      </div>`).join('');
  }

  renderBars('auditByAction', summary.byAction ?? [],      'action',     '#6366f1');
  renderBars('auditByRole',   summary.byActorRole ?? [],   'actorRole',  '#8b5cf6');
  renderBars('auditByTarget', summary.byTargetType ?? [],  'targetType', '#06b6d4');
}

function renderAuditEvents(events, days) {
  const logCard    = el('auditLogCard');
  const emptyState = el('auditEmptyState');
  const tbody      = el('auditLogBody');
  if (!tbody) return;

  if (!events.length) {
    if (logCard)    logCard.style.display    = 'none';
    if (emptyState) emptyState.style.display = '';
    return;
  }

  if (logCard)    logCard.style.display    = '';
  if (emptyState) emptyState.style.display = 'none';

  el('auditEventCount').textContent = `${events.length} event${events.length !== 1 ? 's' : ''}`;

  const parts = [];
  const rf = el('auditResultFilter')?.value;
  const rl = el('auditRoleFilter')?.value;
  const af = el('auditActionFilter')?.value?.trim();
  if (rf) parts.push(`result: ${rf}`);
  if (rl) parts.push(`role: ${rl}`);
  if (af) parts.push(`action contains "${af}"`);
  el('auditLogDesc').textContent = parts.length
    ? `Filtered by ${parts.join(' · ')} — last ${days} day(s)`
    : `All activity — last ${days} day(s)`;

  tbody.innerHTML = events.map((ev) => {
    const result   = ev.result ?? 'unknown';
    const dotClass = { success: 'audit-dot-success', denied: 'audit-dot-denied', error: 'audit-dot-error' }[result] ?? 'audit-dot-unknown';
    const absTime  = new Date(ev.occurredAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return `<tr>
      <td style="text-align:center;padding-left:12px">
        <span class="audit-result-dot ${dotClass}" title="${escapeHtml(result)}"></span>
      </td>
      <td>
        <div class="audit-action-wrap">
          ${fmtActionHtml(ev.action)}
          <span class="audit-result-label ${result}">${result}</span>
        </div>
      </td>
      <td><span class="audit-role-badge ${roleBadgeClass(ev.actorRole)}">${escapeHtml(ev.actorRole ?? '—')}</span></td>
      <td>
        <div class="audit-target-type">${escapeHtml(ev.targetType ?? '—')}</div>
        <div class="audit-target-id">${escapeHtml(ev.targetId ?? '—')}</div>
      </td>
      <td><div style="font-size:12px;color:#64748b;font-family:'Menlo','Monaco',monospace">${escapeHtml(ev.tenantId ?? '—')}</div></td>
      <td>
        <div class="audit-time-rel">${fmtRelTime(ev.occurredAt)}</div>
        <div class="audit-time-abs">${absTime}</div>
      </td>
    </tr>`;
  }).join('');
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  checkConnection();
  initTabs();
  initReporting();
  initPlatform();
  initData();
  initLanguage();
  initAuditIntelligence();
});
