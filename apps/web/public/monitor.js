// ─── State ──────────────────────────────────────────────────────────────────
const MAX_HISTORY = 20;
const REFRESH_INTERVAL = 15000;

let historyData = [];      // rolling {t, req, err}  (avoids collision with window.history)
let lastErrors = [];       // recentErrors from API
let filterActive = 'all';
let drillOpen = false;
let countdown = REFRESH_INTERVAL / 1000;
let refreshTimer = null;
let countdownTimer = null;

window.faithTelemetry?.start({ surfaceId: 'monitor', surfaceKind: 'page' });

// ─── Helpers ────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
function setText(id, val) { const e = $(id); if (e) e.textContent = val ?? '—'; }
function toast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg; t.className = type ? `show ${type}` : 'show';
  clearTimeout(t._t); t._t = setTimeout(() => { t.className = ''; }, 3500);
}
function fmtMs(ms) {
  if (ms == null || ms === '—') return '—';
  const n = Number(ms);
  return Number.isFinite(n) ? `${Math.round(n)} ms` : '—';
}
function fmtUptime(sec) {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtPercent(value) {
  const num = Number(value);
  return Number.isFinite(num) ? `${Math.round(num)}%` : '—';
}
function fmtBytes(bytes) {
  if (bytes == null || !Number.isFinite(Number(bytes))) return '—';
  const n = Number(bytes);
  if (n >= 1073741824) return `${(n / 1073741824).toFixed(1)} GB`;
  if (n >= 1048576)    return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024)       return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}
function fmtUptimeLong(sec) {
  if (!sec) return '—';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function methodBadge(method) {
  const cls = { GET: 'badge-get', POST: 'badge-post', PATCH: 'badge-patch', DELETE: 'badge-delete' };
  return `<span class="badge ${cls[method?.toUpperCase()] ?? ''}">${method ?? '?'}</span>`;
}
function statusBadge(code) {
  const n = Number(code);
  const cls = n >= 500 ? 'badge-5xx' : n >= 400 ? 'badge-4xx' : 'badge-2xx';
  return `<span class="badge ${cls}">${code}</span>`;
}
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function healthLabel(status) {
  if (status === 2) return 'healthy';
  if (status === 1) return 'degraded';
  return 'unhealthy';
}
function healthBadge(status) {
  const label = healthLabel(status);
  return `<span class="health-badge ${label}">${label}</span>`;
}

// ─── Sparkline ───────────────────────────────────────────────────────────────
function buildPath(points, maxVal, W, H) {
  if (points.length < 2) return '';
  const step = W / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = i * step;
    const y = maxVal > 0 ? H - (v / maxVal) * H * 0.9 : H;
    return [x, y];
  });
  return coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}
function buildFillPath(points, maxVal, W, H) {
  const line = buildPath(points, maxVal, W, H);
  if (!line) return '';
  const last = points.length - 1;
  return `${line} L ${(last * W / (points.length - 1)).toFixed(1)} ${H} L 0 ${H} Z`;
}

function updateSparkline() {
  if (historyData.length < 2) return;
  const W = 400, H = 100;
  const reqMax = Math.max(...historyData.map((h) => h.req), 1);
  const errMax = Math.max(...historyData.map((h) => h.err), 1, reqMax * 0.3);

  const reqPoints = historyData.map((h) => h.req);
  const errPoints = historyData.map((h) => h.err);

  $('sparkLine').setAttribute('d',  buildPath(reqPoints, reqMax, W, H));
  $('sparkFill').setAttribute('d',  buildFillPath(reqPoints, reqMax, W, H));
  $('errLine').setAttribute('d',    buildPath(errPoints, errMax, W, H));
  $('errFill').setAttribute('d',    buildFillPath(errPoints, errMax, W, H));
  $('sparklineNote').textContent = `${historyData.length} samples`;
}

// ─── Donut ────────────────────────────────────────────────────────────────────
function updateDonut(counts) {
  const circ = 2 * Math.PI * 38; // ≈ 238.76
  let ok = 0, c4 = 0, c5 = 0, other = 0;
  for (const [code, n] of Object.entries(counts || {})) {
    const c = Number(code);
    if (c >= 200 && c < 300) ok += n;
    else if (c >= 400 && c < 500) c4 += n;
    else if (c >= 500) c5 += n;
    else other += n;
  }
  const total = ok + c4 + c5 + other || 1;
  const errFrac = (c4 + c5) / total;
  const okFrac  = ok / total;

  const okLen  = okFrac  * circ;
  const errLen = errFrac * circ;
  $('donutOk').setAttribute('stroke-dasharray',  `${okLen.toFixed(1)} ${(circ - okLen).toFixed(1)}`);
  $('donutOk').style.strokeDashoffset = (-errLen).toFixed(1);
  $('donutErr').setAttribute('stroke-dasharray', `${errLen.toFixed(1)} ${(circ - errLen).toFixed(1)}`);

  const errPct = Math.round(errFrac * 100);
  $('donutPct').textContent = `${errPct}%`;
  $('donutPct').setAttribute('fill', errPct > 5 ? '#ef4444' : '#10b981');

  setText('dl2xx', ok);
  setText('dl4xx', c4);
  setText('dl5xx', c5);
  setText('dlOth',  other);

  const scGrid = $('scGrid');
  const allCodes = Object.entries(counts || {}).sort(([a], [b]) => Number(a) - Number(b));
  if (!allCodes.length) { scGrid.innerHTML = '<span class="empty-state" style="grid-column:1/-1">No requests yet</span>'; return; }
  scGrid.innerHTML = allCodes.map(([code, n]) => {
    const c = Number(code);
    const cls = c >= 500 ? 'sc-5xx' : c >= 400 ? 'sc-4xx' : c >= 300 ? 'sc-3xx' : c >= 200 ? 'sc-2xx' : 'sc-unk';
    return `<div class="sc-pill ${cls}" data-code="${code}"><span class="sc-count">${n}</span> <span>${code}</span></div>`;
  }).join('');
  setText('scTotal', `${total} total`);

  scGrid.querySelectorAll('.sc-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      openDrill(`${pill.dataset.code[0]}xx`);
    });
  });
}

// ─── Latency bars ─────────────────────────────────────────────────────────────
function updateLatencyBars(lat, proxy) {
  const maxMs = Math.max(lat?.max || 0, proxy?.max || 0, 1);
  const pct = (v) => `${Math.min(100, (v / maxMs) * 100).toFixed(1)}%`;

  $('barAvg').style.width    = pct(lat?.avg  || 0);
  $('barP95').style.width    = pct(lat?.p95  || 0);
  $('barMax').style.width    = pct(lat?.max  || 0);
  setText('barAvgVal', fmtMs(lat?.avg));
  setText('barP95Val', fmtMs(lat?.p95));
  setText('barMaxVal', fmtMs(lat?.max));

  if (proxy?.count > 0) {
    $('barProxyAvg').style.width = pct(proxy?.avg || 0);
    $('barProxyP95').style.width = pct(proxy?.p95 || 0);
    setText('barProxyAvgVal', fmtMs(proxy?.avg));
    setText('barProxyP95Val', fmtMs(proxy?.p95));
  }
}

// ─── Memory ──────────────────────────────────────────────────────────────────
function updateMemory(proc) {
  if (!proc) return;
  const maxMb = Math.max(proc.rssMb || 0, proc.heapTotalMb || 0, 1);
  const pct = (v) => `${Math.min(100, (v / maxMb) * 100).toFixed(1)}%`;

  $('memHeapBar').style.width  = pct(proc.heapUsedMb || 0);
  $('memTotalBar').style.width = pct(proc.heapTotalMb || 0);
  $('memRssBar').style.width   = pct(proc.rssMb || 0);
  setText('memHeapUsed',  `${proc.heapUsedMb ?? '—'} MB`);
  setText('memHeapTotal', `${proc.heapTotalMb ?? '—'} MB`);
  setText('memRss',       `${proc.rssMb ?? '—'} MB`);
}

// ─── Browser vitals ───────────────────────────────────────────────────────────
function updateVitals(vitals) {
  const grid = $('vitalsGrid');
  const entries = Object.entries(vitals || {});
  if (!entries.length) { grid.innerHTML = '<div class="empty-state">No vitals recorded yet.</div>'; return; }
  grid.innerHTML = entries.map(([name, v]) => {
    const ratingCls = v.rating === 'good' ? 'vital-good' : v.rating === 'needs-improvement' ? 'vital-needs-improvement' : 'vital-poor';
    const shortName = name.replace('monitor.', '').replace(/_/g, ' ');
    return `<div class="vital-card">
      <div class="vital-name">${shortName}</div>
      <div class="vital-val ${ratingCls}">${v.value}</div>
      <div class="vital-unit">${v.rating ?? ''} · ×${v.count}</div>
    </div>`;
  }).join('');
}

function renderIssueList(containerId, items, emptyMessage, valueLabel) {
  const container = $(containerId);
  if (!items?.length) {
    container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="issue-row">
      <div>
        <div class="issue-name">${escapeHtml(item.name)}</div>
        <div class="issue-sub">${escapeHtml(item.sub)}</div>
      </div>
      <div class="issue-value">${escapeHtml(item.value)} ${escapeHtml(valueLabel)}</div>
    </div>
  `).join('');
}

function summarizeEmptyStates(emptyStates) {
  return Object.values(emptyStates || {}).reduce((sum, count) => sum + count, 0);
}

function metricClass(value, warnAt, badAt) {
  if (!Number.isFinite(value)) return '';
  if (value >= badAt) return 'metric-bad';
  if (value >= warnAt) return 'metric-warn';
  return '';
}

function updateUiSummary(overall, frontend, surfaces, exportedViaOtel) {
  setText('uiViews', overall?.totalViews ?? 0);
  setText('uiErrors', overall?.totalUiErrors ?? 0);
  setText('uiFetchErrors', overall?.totalFetchErrors ?? 0);
  setText('uiValidationErrors', overall?.totalValidationErrors ?? 0);
  setText('uiActionSuccess', fmtPercent(overall?.actionSuccessRate));
  setText('uiActionSuccessSub', `${overall?.totalActions ?? 0} tracked actions`);
  setText('uiSlowSurfaces', overall?.slowSurfaceCount ?? 0);
  setText('uiSummaryLastSeen', overall?.lastEventAt ? `Last event ${fmtTime(overall.lastEventAt)}` : 'Waiting for frontend telemetry');

  setText('uiActiveSurfaces', overall?.activeSurfaceCount ?? 0);
  setText('uiTrackedSurfaces', surfaces?.length ?? 0);
  setText('uiLastEvent', overall?.lastEventAt ? fmtTime(overall.lastEventAt) : '—');
  setText('uiOtelExport', exportedViaOtel ? 'Enabled' : 'Local only');
  setText('uiExportState', exportedViaOtel ? 'External OTEL export enabled' : 'Local monitoring only');
  setText('surfaceSummaryCount', `${surfaces?.length ?? 0} surfaces`);
  setText('surfaceTableNote', `Top ${Math.min(surfaces?.length ?? 0, 12)} by views`);

  renderIssueList(
    'topSurfaceIssues',
    (frontend?.topFailingSurfaces ?? []).map((surface) => ({
      name: surface.surfaceId,
      sub: 'ui + fetch + validation issues',
      value: surface.issueCount ?? 0,
    })),
    'No surface failures recorded yet.',
    'issues',
  );

  renderIssueList(
    'topWorkflowIssues',
    (frontend?.topFailingWorkflows ?? []).map((workflow) => ({
      name: workflow.workflow,
      sub: `${workflow.actionCount ?? 0} tracked actions`,
      value: workflow.errorCount ?? 0,
    })),
    'No workflow failures recorded yet.',
    'errors',
  );
}

function updateHealthChecks(health) {
  const checks = Object.entries(health?.checks ?? {});
  const dependencies = Object.entries(health?.dependencies ?? {});
  const list = $('healthChecksList');

  setText('healthSummaryStatus', healthLabel(health?.serviceStatus));

  if (!checks.length && !dependencies.length) {
    list.innerHTML = '<div class="empty-state">No health checks available yet.</div>';
    return;
  }

  const checkMarkup = checks.map(([name, check]) => `
    <div class="health-check">
      <div class="health-meta">
        <div class="health-name">${escapeHtml(name)}</div>
        <div class="health-sub">${check?.durationMs != null ? `${fmtMs(check.durationMs)} check time` : 'No duration recorded'} · ${check?.observedAt ? fmtTime(check.observedAt) : 'No timestamp'}</div>
      </div>
      ${healthBadge(check?.status)}
    </div>
  `);

  const dependencyMarkup = dependencies.map(([name, dep]) => `
    <div class="health-check">
      <div class="health-meta">
        <div class="health-name">${escapeHtml(name)}</div>
        <div class="health-sub">Dependency status</div>
      </div>
      ${healthBadge(dep?.status)}
    </div>
  `);

  list.innerHTML = [...checkMarkup, ...dependencyMarkup].join('');
}

function renderSurfaceTable(surfaces) {
  const tbody = $('surfaceTableBody');
  if (!surfaces?.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No surface telemetry recorded yet.</td></tr>';
    return;
  }

  const topSurfaces = surfaces.slice(0, 12);
  tbody.innerHTML = topSurfaces.map((surface) => {
    const emptyStateTotal = summarizeEmptyStates(surface.emptyStates);
    const loadP95Class = metricClass(surface.loadDurationMs?.p95, 600, 1000);
    const fetchP95Class = metricClass(surface.fetchDurationMs?.p95, 600, 1000);
    const issueTotal = (surface.uiErrorCount ?? 0) + (surface.fetchErrorCount ?? 0) + (surface.validationErrorCount ?? 0);

    return `
      <tr>
        <td>
          <div class="surface-id">${escapeHtml(surface.surfaceId)}</div>
          <div class="surface-kind">${escapeHtml(surface.surfaceKind)}</div>
        </td>
        <td>${surface.viewCount ?? 0}</td>
        <td class="${loadP95Class}">${fmtMs(surface.loadDurationMs?.p95)}</td>
        <td class="${fetchP95Class}">${fmtMs(surface.fetchDurationMs?.p95)}</td>
        <td>${surface.actionCounts?.success ?? 0}/${Object.values(surface.actionCounts ?? {}).reduce((sum, count) => sum + count, 0)} (${fmtPercent(surface.actionSuccessRate)})</td>
        <td class="${issueTotal ? 'metric-bad' : ''}">${surface.uiErrorCount ?? 0} / ${surface.fetchErrorCount ?? 0} / ${surface.validationErrorCount ?? 0}</td>
        <td>${emptyStateTotal}</td>
        <td>${surface.lastSeenAt ? fmtTime(surface.lastSeenAt) : '—'}</td>
      </tr>
    `;
  }).join('');
}

// ─── Drill-down ───────────────────────────────────────────────────────────────
function openDrill(filter) {
  filterActive = filter || 'all';
  drillOpen = true;
  $('drillBody').classList.add('open');
  $('drillLabel').textContent = '▲ Collapse';
  $('filterRow').querySelectorAll('.filter-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.filter === filterActive);
  });
  renderErrorTable();
}

function renderErrorTable() {
  let rows = lastErrors;
  if (filterActive === '4xx') rows = rows.filter((r) => Number(r.statusCode) >= 400 && Number(r.statusCode) < 500);
  else if (filterActive === '5xx') rows = rows.filter((r) => Number(r.statusCode) >= 500);
  else if (filterActive === 'GET')  rows = rows.filter((r) => r.method?.toUpperCase() === 'GET');
  else if (filterActive === 'POST') rows = rows.filter((r) => r.method?.toUpperCase() === 'POST');

  const tbody = $('errTableBody');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">${filterActive === 'all' ? 'No errors in this session.' : `No ${filterActive} errors.`}</td></tr>`;
    return;
  }
  tbody.innerHTML = [...rows].reverse().map((r, i) => `
    <tr style="animation-delay:${i * 0.03}s">
      <td style="color:var(--muted);font-size:11px;font-variant-numeric:tabular-nums">${fmtTime(r.at)}</td>
      <td>${methodBadge(r.method)}</td>
      <td style="font-family:monospace;font-size:12px;color:var(--cyan)">${r.route ?? '?'}</td>
      <td>${statusBadge(r.statusCode)}</td>
    </tr>`).join('');
}

function initDrillToggle() {
  $('drillToggle').addEventListener('click', () => {
    drillOpen = !drillOpen;
    $('drillBody').classList.toggle('open', drillOpen);
    $('drillLabel').textContent = drillOpen ? '▲ Collapse' : '▼ Expand';
  });
  $('filterRow').querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      filterActive = btn.dataset.filter;
      $('filterRow').querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('active', b === btn));
      renderErrorTable();
    });
  });
}

// ─── OTEL settings ────────────────────────────────────────────────────────────
function updateOtelBanner(isActive) {
  const banner = $('otelBanner');
  if (isActive) {
    banner.className = 'otel-status-banner active';
    setText('otelBannerTitle', 'OpenTelemetry Active');
    setText('otelBannerSub',   'Traces and metrics are being exported to your configured OTLP endpoint.');
    $('otelCurrentStatus').value = 'Exporting via OTLP';
  } else {
    banner.className = 'otel-status-banner inactive';
    setText('otelBannerTitle', 'OpenTelemetry Not Configured');
    setText('otelBannerSub',   'Set OTEL_EXPORTER_OTLP_ENDPOINT in .env to enable trace and metric export.');
    $('otelCurrentStatus').value = 'Not configured — OTEL_SDK_DISABLED or no endpoint set';
  }
}

function initOtelSettings() {
  $('testOtelBtn').addEventListener('click', async () => {
    const endpoint = $('otelEndpoint').value.trim() || $('otelTracesEndpoint').value.trim();
    const result = $('otelTestResult');
    if (!endpoint) {
      result.textContent = 'Enter an endpoint URL to test.';
      result.className = 'otel-test-result visible fail';
      return;
    }
    $('testOtelBtn').disabled = true;
    $('testOtelBtn').textContent = 'Testing…';
    result.className = 'otel-test-result visible';
    result.textContent = 'Sending test trace…';
    try {
      const url = endpoint.replace(/\/$/, '') + (endpoint.includes('/v1/') ? '' : '/v1/traces');
      const res = await fetch(url, {
        method: 'POST', mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceSpans: [] }),
        signal: AbortSignal.timeout(5000),
      });
      result.className = 'otel-test-result visible ok';
      result.textContent = `✓ Endpoint responded with ${res.status}. OTEL collector is reachable.`;
    } catch (err) {
      result.className = 'otel-test-result visible fail';
      result.textContent = `✗ ${err.name === 'AbortError' ? 'Timed out (5s)' : err.message}. Check the endpoint URL and collector status.`;
    } finally {
      $('testOtelBtn').disabled = false;
      $('testOtelBtn').textContent = 'Test Connection';
    }
  });

  $('genEnvBtn').addEventListener('click', () => {
    const ep  = $('otelEndpoint').value.trim();
    const tr  = $('otelTracesEndpoint').value.trim();
    const met = $('otelMetricsEndpoint').value.trim();
    const svc = $('otelServiceName').value.trim() || 'faith-api';
    const lines = [];
    if (ep)  lines.push(`OTEL_EXPORTER_OTLP_ENDPOINT=${ep}`);
    if (tr)  lines.push(`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=${tr}`);
    if (met) lines.push(`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=${met}`);
    lines.push(`OTEL_SERVICE_NAME=${svc}`);
    lines.push(`# Restart API after adding these to .env`);
    const snip = $('envSnippet');
    snip.textContent = lines.join('\n');
    snip.style.display = 'block';
    toast('Snippet generated — copy and add to your .env file');
  });
}

// ─── DB panel ─────────────────────────────────────────────────────────────────
function updateDbPanel(data) {
  if (!data || data.mode === 'unavailable') {
    const label = $('dbEngineLabel');
    if (label) label.textContent = 'MySQL 8 · NOT CONFIGURED';
    setText('dbUptime', '—');
    setText('dbConns',  '—');
    setText('dbBufHit', '—');
    setText('dbQryTotal', '—');
    setText('dbSlowQry', '—');
    setText('dbThroughput', '—');
    const grid = $('dbTableGrid');
    if (grid) grid.innerHTML = '<div class="empty-state">DB not configured</div>';
    return;
  }

  // Uptime
  setText('dbUptime', fmtUptimeLong(data.uptime?.seconds));

  // Connections
  const { current = 0, running = 0, maxUsed = 0, maxAllowed = 0 } = data.connections ?? {};
  setText('dbConns', current);
  setText('dbConnsSub', `${running} running · max used ${maxUsed}${maxAllowed ? ` / ${maxAllowed}` : ''}`);

  // Buffer pool
  const { hitRatio = 0, pagesUsed = 0, pagesTotal = 0 } = data.bufferPool ?? {};
  setText('dbBufHit', `${hitRatio.toFixed(1)}%`);
  setText('dbBufSub', `${pagesUsed.toLocaleString()} / ${pagesTotal.toLocaleString()} pages`);

  // Queries
  const { total = 0, slow = 0, selects = 0, inserts = 0, updates = 0, deletes = 0 } = data.queries ?? {};
  setText('dbQryTotal', total.toLocaleString());
  setText('dbQrySub', `${selects.toLocaleString()} S / ${inserts.toLocaleString()} I / ${updates.toLocaleString()} U / ${deletes.toLocaleString()} D`);

  // Slow queries (highlight if non-zero)
  const slowEl = $('dbSlowQry');
  if (slowEl) {
    slowEl.textContent = slow.toLocaleString();
    slowEl.style.color = slow > 0 ? 'var(--amber)' : '#fff';
  }

  // Throughput
  const { bytesReceived = 0, bytesSent = 0 } = data.throughput ?? {};
  setText('dbThroughput', fmtBytes(bytesReceived + bytesSent));
  // keep sub-line static ("received / sent") — already in HTML

  // Table grid
  const tableGrid = $('dbTableGrid');
  const tables = data.tables ?? [];
  const dbTableNote = $('dbTableNote');
  if (dbTableNote) dbTableNote.textContent = `${tables.length} table${tables.length !== 1 ? 's' : ''}`;

  if (tableGrid) {
    if (!tables.length) {
      tableGrid.innerHTML = '<div class="empty-state">No tables found</div>';
    } else {
      tableGrid.innerHTML = tables.map((t) => `
        <div class="db-table-pill">
          <div class="db-table-pill-name" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</div>
          <div class="db-table-pill-rows">${(t.rows ?? 0).toLocaleString()}</div>
          <div class="db-table-pill-size">${t.sizeKb >= 1024 ? `${(t.sizeKb / 1024).toFixed(1)} MB` : `${t.sizeKb} KB`}</div>
        </div>`).join('');
    }
  }
}

// ─── Main refresh ─────────────────────────────────────────────────────────────
async function doRefresh() {
  const chip = $('healthChip');
  $('refreshBtn').disabled = true;
  const startedAt = performance.now();

  try {
    const [apiHealth, apiSummaryResp, webSummaryResp, dbStatsResp] = await Promise.allSettled([
      fetch('/api/health', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/v1/telemetry/summary', { credentials: 'include' }).then((r) => r.json()),
      fetch('/telemetry/summary', { credentials: 'include' }).then((r) => r.json()).catch(() => ({})),
      fetch('/api/v1/monitoring/db', { credentials: 'include' }).then((r) => r.json()).catch(() => null),
    ]);

    const health = apiHealth.status === 'fulfilled' ? apiHealth.value : null;
    const apiData = apiSummaryResp.status === 'fulfilled' ? apiSummaryResp.value : null;
    const webData = webSummaryResp.status === 'fulfilled' ? webSummaryResp.value : null;
    const dbStats = dbStatsResp.status === 'fulfilled' ? dbStatsResp.value : null;
    const sum = apiData?.summary ?? {};

    // Health chip
    if (health?.service) {
      chip.className = 'status-chip healthy';
      $('healthText').textContent = `${health.service} · ${new Date(health.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } else {
      chip.className = 'status-chip degraded';
      $('healthText').textContent = 'Degraded';
    }

    // KPIs
    const reqCount = sum.requestCount ?? 0;
    const errCount = sum.errorCount   ?? 0;
    setText('kpiRequests', reqCount);
    setText('kpiRequestsSub', `${sum.mutationCount ?? 0} mutations`);
    setText('kpiErrors',   errCount);
    const errRate = reqCount > 0 ? `${((errCount / reqCount) * 100).toFixed(1)}% error rate` : 'No traffic yet';
    setText('kpiErrorsSub', errRate);
    setText('kpiLatency', fmtMs(sum.avgDurationMs));
    setText('kpiLatencySub', `p95 ${fmtMs(sum.requestLatencyMs?.p95)}  max ${fmtMs(sum.requestLatencyMs?.max)}`);
    setText('kpiUptime',   fmtUptime(sum.process?.uptimeSeconds));
    setText('kpiActive',   sum.activeRequests ?? 0);
    setText('kpiMutations', sum.mutationCount ?? 0);
    if (sum.lastMutationAt) setText('kpiMutationsSub', `Last: ${fmtTime(sum.lastMutationAt)}`);

    // Push history point
    historyData.push({ t: Date.now(), req: reqCount, err: errCount });
    if (historyData.length > MAX_HISTORY) historyData.shift();
    updateSparkline();

    // Charts
    updateDonut(sum.statusCounts);
    updateLatencyBars(sum.requestLatencyMs, sum.proxyLatencyMs);
    updateMemory(sum.process);

    // Vitals
    const vitals = { ...(sum.browserVitals ?? {}), ...(webData?.summary?.browserVitals ?? {}) };
    updateVitals(vitals);

    // UI / surface monitoring
    updateUiSummary(sum.overall ?? {}, sum.frontend ?? {}, sum.surfaces ?? [], apiData?.exportedViaOtel ?? false);
    updateHealthChecks(sum.health ?? {});
    renderSurfaceTable(sum.surfaces ?? []);
    updateDbPanel(dbStats);

    // Errors drill-down
    lastErrors = sum.recentErrors ?? [];
    setText('errorCount', lastErrors.length);
    if (drillOpen) renderErrorTable();

    // OTEL
    updateOtelBanner(apiData?.exportedViaOtel ?? false);

    if (!Object.keys(vitals).length) {
      window.faithTelemetry?.trackEmptyState('no_vitals', { workflow: 'monitor' });
    }

    window.faithTelemetry?.trackInteraction('monitor.refresh', performance.now() - startedAt, {
      workflow: 'monitor',
      result: 'success',
    });
    window.faithTelemetry?.trackAction('monitor.refresh', 'success', { workflow: 'monitor' });

    // Record heartbeat vital
    recordHeartbeat();

  } catch (err) {
    chip.className = 'status-chip degraded';
    $('healthText').textContent = 'Error';
    toast(`Refresh failed: ${err.message}`, 'err');
    window.faithTelemetry?.trackInteraction('monitor.refresh', performance.now() - startedAt, {
      workflow: 'monitor',
      result: 'failure',
    });
    window.faithTelemetry?.trackAction('monitor.refresh', 'failure', { workflow: 'monitor' });
    window.faithTelemetry?.trackError('monitor.refresh', { workflow: 'monitor' });
  } finally {
    $('refreshBtn').disabled = false;
  }
}

async function recordHeartbeat() {
  const memMb = Math.round((performance?.memory?.usedJSHeapSize ?? 0) / 1048576);
  await fetch('/api/v1/telemetry/vitals', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'monitor.heartbeat.memory_mb', value: memMb, rating: 'good', page: 'monitor', timestamp: new Date().toISOString(), navigationType: 'navigate' }),
  }).catch(() => {});
}

// ─── Auto-refresh countdown ───────────────────────────────────────────────────
function resetCountdown() {
  clearInterval(countdownTimer);
  countdown = REFRESH_INTERVAL / 1000;
  countdownTimer = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      $('countdown').textContent = `↺ in ${countdown}s`;
    } else {
      $('countdown').textContent = 'Refreshing…';
    }
  }, 1000);
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    await doRefresh();
    resetCountdown();
    scheduleRefresh();
  }, REFRESH_INTERVAL);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
$('refreshBtn').addEventListener('click', async () => {
  clearTimeout(refreshTimer);
  clearInterval(countdownTimer);
  await doRefresh();
  resetCountdown();
  scheduleRefresh();
});

initDrillToggle();
initOtelSettings();
doRefresh().then(() => { resetCountdown(); scheduleRefresh(); });
