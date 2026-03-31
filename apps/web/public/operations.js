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

function getCsrfToken() {
  const match = document.cookie.split(';').find((c) => c.trim().startsWith('csrf_token='));
  return match ? match.trim().slice('csrf_token='.length) : '';
}

function csrfHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'x-csrf-token': getCsrfToken(),
    ...extra,
  };
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
    const res = await fetch(`/api${path}`, {
      credentials: 'include',
      headers: csrfHeaders(),
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

async function apiPost(path, body) {
  return window.faithTelemetry?.instrumentRequest(`/api${path}`, 'POST', async () => {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeaders(),
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
      headers: csrfHeaders(),
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
      headers: csrfHeaders(),
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

// ── Reporting helpers ─────────────────────────────────────────────────────────

function fmtMoney(cents) {
  if (cents == null) return '—';
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(ratio) {
  if (ratio == null) return '—';
  return (ratio * 100).toFixed(1) + '%';
}

function rptBars(containerId, items, labelKey, valueKey, total) {
  const wrap = el(containerId);
  if (!wrap) return;
  if (!items || !items.length) { wrap.innerHTML = '<div class="audit-bar-zero">No data</div>'; return; }
  const max = Math.max(...items.map(i => i[valueKey]));
  wrap.innerHTML = items.map(item => {
    const pct = max > 0 ? Math.round((item[valueKey] / max) * 100) : 0;
    const share = total > 0 ? fmtPct(item[valueKey] / total) : '';
    return `<div class="audit-bar-row">
      <span class="audit-bar-label">${escapeHtml(String(item[labelKey] ?? '—'))}</span>
      <div class="audit-bar-track"><div class="audit-bar-fill" style="width:${pct}%"></div></div>
      <span class="audit-bar-count">${item[valueKey]}${share ? ' <span style="color:#94a3b8;font-size:10px">'+share+'</span>' : ''}</span>
    </div>`;
  }).join('');
}

function platStatPill(label, value, color) {
  const colors = { blue: '#3b82f6', green: '#22c55e', amber: '#f59e0b', red: '#ef4444', slate: '#64748b' };
  const c = colors[color] || colors.slate;
  return `<div class="plat-stat" style="border-top:3px solid ${c}">
    <div class="plat-stat-label">${escapeHtml(label)}</div>
    <div class="plat-stat-value" style="color:${c}">${value ?? '—'}</div>
  </div>`;
}

function statusBadgeHtml(status) {
  const s = String(status ?? '');
  return `<span class="status-badge ${s}">${escapeHtml(s || '—')}</span>`;
}

// ── Practice Reporting renderer ───────────────────────────────────────────────

function renderPracticeReport(s) {
  const u = s.utilization ?? {};
  // Stat cards — API returns sessionsInWindow, sessionsCompleted, remoteRate (already %)
  el('rptSessions').textContent   = u.sessionsInWindow ?? u.totalSessions ?? '—';
  el('rptSessionsSub').textContent = `in ${s.windowDays ?? '?'}-day window`;
  el('rptCompleted').textContent  = u.sessionsCompleted ?? u.completedSessions ?? '—';
  const remoteRateRaw = u.remoteRate ?? u.remoteSessionRate;
  el('rptRemoteRate').textContent = remoteRateRaw != null
    ? (typeof remoteRateRaw === 'number' && remoteRateRaw <= 1
        ? fmtPct(remoteRateRaw)
        : remoteRateRaw.toFixed(1) + '%')
    : '—';
  const counselors = (s.counselorProductivity ?? []).length;
  const totalSess = u.sessionsInWindow ?? u.totalSessions ?? 0;
  el('rptAvgPerCounselor').textContent = counselors > 0
    ? (totalSess / counselors).toFixed(1) : '—';
  el('rptUtilRow').style.display = '';

  // Referral bars — API key is 'referralSource', not 'source'
  rptBars('rptReferralBars', s.referralSources ?? [], 'referralSource', 'count',
    (s.referralSources ?? []).reduce((a, r) => a + r.count, 0));

  // Document completion progress bar
  // API returns: signedDocuments, requiresSignatureCount, completionRate
  const dc = s.documentCompletion ?? {};
  const signed  = dc.signedDocuments ?? dc.completed ?? 0;
  const total   = dc.requiresSignatureCount ?? (signed + (dc.pending ?? 0) + (dc.overdue ?? 0));
  const pending = total - signed;
  const docPct  = dc.completionRate ?? (total > 0 ? Math.round((signed / total) * 100) : 0);
  el('rptDocCompletion').innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:4px">
      <span>${signed} completed</span>
      <span>${pending > 0 ? pending : 0} pending</span>
    </div>
    <div style="background:#f1f5f9;border-radius:4px;height:10px;overflow:hidden">
      <div style="background:#22c55e;width:${docPct}%;height:100%;border-radius:4px;transition:width .4s"></div>
    </div>
    <div style="font-size:11px;color:#64748b;margin-top:4px">${docPct}% completion rate</div>`;

  // Assessment trends bars — API keys: inventoryName, completedCount
  const aItems = (s.assessmentTrends ?? []).map(a => ({
    name: a.inventoryName ?? a.type ?? a.inventoryId ?? '—',
    count: a.completedCount ?? a.count ?? 0,
  }));
  rptBars('rptAssessmentBars', aItems, 'name', 'count',
    aItems.reduce((a, r) => a + r.count, 0));
  el('rptMidRow').style.display = '';

  // Location performance — API key is 'locationName', not 'locationId'
  const locs = s.locationPerformance ?? [];
  el('rptLocBody').innerHTML = locs.length
    ? locs.map(l => {
        const pct = l.totalSessions > 0
          ? fmtPct(l.completedSessions / l.totalSessions) : '—';
        return `<tr>
          <td>${escapeHtml(l.locationName ?? l.locationId)}</td>
          <td style="text-align:right">${l.totalSessions ?? 0}</td>
          <td style="text-align:right">${l.completedSessions ?? 0}</td>
          <td style="text-align:right">${l.remoteSessions ?? 0}</td>
          <td style="text-align:right;font-weight:600;color:#4f46e5">${pct}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:12px">No location data</td></tr>';
  el('rptLocCard').style.display = '';
}

async function runPracticeReport() {
  const btn = el('refreshReportingBtn');
  const days = document.querySelector('.rpt-window-btn.active')?.dataset?.days ?? '30';
  setBusy(btn, true);
  clearStatus('reportingStatus');
  try {
    const data = await apiGet(`/v1/reporting/overview?days=${days}`);
    renderPracticeReport(data.summary ?? data);
    const asOf = (data.summary ?? data).generatedAt;
    el('reportingAsOf').textContent = asOf ? `as of ${new Date(asOf).toLocaleString()}` : '';
    setStatus('reportingStatus', 'Report loaded.', 'success');
  } catch (err) {
    setStatus('reportingStatus', `Error: ${err.message}`, 'error');
  } finally {
    setBusy(btn, false);
  }
}

// ── Platform Operations Summary renderer ──────────────────────────────────────

function renderPlatformSummary(s) {
  // Provisioning
  const prov = s.provisioning ?? {};
  el('platProvStats').innerHTML = [
    platStatPill('Total', prov.total, 'blue'),
    platStatPill('Queued', prov.queued, 'amber'),
    platStatPill('In Progress', prov.inProgress, 'blue'),
    platStatPill('Completed', prov.completed, 'green'),
  ].join('');
  const provRecent = prov.recent ?? [];
  el('platProvBody').innerHTML = provRecent.length
    ? provRecent.map(r =>
        `<tr>
          <td style="font-family:monospace;font-size:11px">${escapeHtml(r.requestedTenantId ?? r.tenantId)}</td>
          <td>${escapeHtml(r.requestedPracticeName ?? r.practiceName ?? '—')}</td>
          <td>${statusBadgeHtml(r.status)}</td>
          <td style="color:#64748b;font-size:12px">${fmtRelTime(r.requestedAt)}</td>
          <td style="color:#64748b;font-size:12px">${r.completedAt ? fmtRelTime(r.completedAt) : '—'}</td>
        </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:12px">No recent provisioning</td></tr>';
  el('platProvUpdated').textContent = prov.asOf ? `updated ${fmtRelTime(prov.asOf)}` : '';

  // Impersonation
  const imp = s.supportImpersonation ?? {};
  el('platImpStats').innerHTML = [
    platStatPill('Total', imp.total, 'blue'),
    platStatPill('Active', imp.active, 'amber'),
    platStatPill('Ended', imp.ended, 'slate'),
  ].join('');
  const impRecent = imp.recent ?? [];
  el('platImpBody').innerHTML = impRecent.length
    ? impRecent.map(r =>
        `<tr>
          <td style="font-family:monospace;font-size:11px">${escapeHtml(r.targetTenantId)}</td>
          <td>${escapeHtml(r.targetRole ?? r.role ?? '—')}</td>
          <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.reason ?? '—')}</td>
          <td>${statusBadgeHtml(r.status)}</td>
          <td style="color:#64748b;font-size:12px">${fmtRelTime(r.startedAt)}</td>
          <td style="color:#64748b;font-size:12px">${r.durationMinutes != null ? r.durationMinutes + 'm' : (r.endedAt && r.startedAt ? Math.round((new Date(r.endedAt) - new Date(r.startedAt)) / 60000) + 'm' : '—')}</td>
        </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:12px">No recent sessions</td></tr>';

  // Exports
  const exp = s.dataExports ?? {};
  el('platExportStats').innerHTML = [
    platStatPill('Total', exp.total, 'blue'),
    platStatPill('Queued', exp.queued, 'amber'),
    platStatPill('Completed', exp.completed, 'green'),
    platStatPill('Failed', exp.failed, 'red'),
  ].join('');
  const expRecent = exp.recent ?? [];
  el('platExportBody').innerHTML = expRecent.length
    ? expRecent.map(r =>
        `<tr>
          <td>${escapeHtml(r.exportType ?? r.type ?? '—')}</td>
          <td>${escapeHtml(r.format ?? '—')}</td>
          <td style="font-family:monospace;font-size:11px">${escapeHtml(r.requestedByRole ?? r.requestedBy ?? '—')}</td>
          <td>${statusBadgeHtml(r.status)}</td>
          <td style="color:#64748b;font-size:12px">${fmtRelTime(r.requestedAt)}</td>
          <td style="color:#64748b;font-size:12px">${r.completedAt ? fmtRelTime(r.completedAt) : '—'}</td>
        </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:12px">No recent exports</td></tr>';

  // Retention policy — API returns object with schedule enum fields (clinicalRecordsSchedule, etc.)
  const ret = s.retentionPolicy ?? {};
  el('platRetentionUpdated').textContent = (ret.updatedAt || ret.asOf)
    ? `updated ${fmtRelTime(ret.updatedAt ?? ret.asOf)}` : '';
  const scheduleLabels = {
    clinicalRecordsSchedule: 'Clinical Records',
    billingSchedule:         'Billing Records',
    auditLogSchedule:        'Audit Log',
  };
  const scheduleKeys = Object.keys(scheduleLabels).filter((k) => ret[k]);
  if (scheduleKeys.length) {
    el('platRetentionGrid').innerHTML = scheduleKeys.map((k) =>
      `<div class="plat-policy-item">
        <div class="plat-policy-item-label">${escapeHtml(scheduleLabels[k])}</div>
        <div class="plat-policy-item-value" style="font-size:13px">${escapeHtml(String(ret[k]).replace(/_/g, ' '))}</div>
        ${k === 'clinicalRecordsSchedule' && ret.legalHoldEnabled ? '<div style="font-size:11px;color:#ef4444;margin-top:4px">legal hold active</div>' : ''}
      </div>`).join('') +
      (ret.legalHoldEnabled ? '<div class="plat-policy-item" style="border-top-color:#ef4444"><div class="plat-policy-item-label">Legal Hold</div><div class="plat-policy-item-value" style="color:#ef4444;font-size:13px">ENABLED</div></div>' : '');
  } else {
    el('platRetentionGrid').innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px">No retention policies configured</div>';
  }

  el('platCard').style.display = '';
}

async function runPlatformSummary() {
  const btn = el('refreshPlatformBtn');
  setBusy(btn, true);
  clearStatus('platformStatus');
  try {
    const data = await apiGet('/v1/platform/overview');
    renderPlatformSummary(data.summary ?? data);
    setStatus('platformStatus', 'Platform summary loaded.', 'success');
  } catch (err) {
    setStatus('platformStatus', `Error: ${err.message}`, 'error');
  } finally {
    setBusy(btn, false);
  }
}

// ── initReporting ─────────────────────────────────────────────────────────────

function initReporting() {
  // Window preset buttons
  document.querySelectorAll('.rpt-window-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rpt-window-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  el('refreshReportingBtn')?.addEventListener('click', runPracticeReport);
  el('refreshPlatformBtn')?.addEventListener('click', runPlatformSummary);
}

// ── Platform Ops tab ──────────────────────────────────────────────────────────

function initPlatform() {
  el('createTenantBtn')?.addEventListener('click', async () => {
    const btn = el('createTenantBtn');
    // API expects requestedTenantId and requestedPracticeName
    const requestedTenantId    = el('tenantId')?.value.trim();
    const requestedPracticeName = el('practiceName')?.value.trim();
    const ownerEmail  = el('ownerEmail')?.value.trim();

    if (!requestedTenantId || !requestedPracticeName || !ownerEmail) {
      setStatus('tenantStatus', 'Tenant ID, practice name, and owner email are all required.', 'error');
      return;
    }

    setBusy(btn, true);
    clearStatus('tenantStatus');
    try {
      const data = await apiPost('/v1/platform/tenant-provisioning', { requestedTenantId, requestedPracticeName, ownerEmail });
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
      // API expects POST (not PUT) and schedule enum names, not numeric fields
      await apiPost('/v1/platform/retention-policies', {
        clinicalRecordsSchedule: el('retentionClinical')?.value,
        billingSchedule:         el('retentionBilling')?.value,
        auditLogSchedule:        el('retentionAudit')?.value,
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
  // Window preset buttons — active state is the source of truth; no hidden input
  document.querySelectorAll('.audit-window-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.audit-window-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
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
  const days      = document.querySelector('.audit-window-btn.active')?.dataset?.days ?? '7';
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
