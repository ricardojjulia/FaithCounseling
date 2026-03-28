import { createBrowserTelemetry } from '../../../../packages/telemetry/src/browser.js';
import { getSurfaceDefinition, getSurfaceKind } from '../../../../packages/telemetry/src/surfaces.js';

const browserTelemetry = createBrowserTelemetry({ serviceName: 'faith-web-ui' });
const FLUSH_INTERVAL_MS = 2000;
const VIEW_DEDUPE_WINDOW_MS = 750;

let started = false;
let currentRole = 'anonymous';
let currentSurfaceId = 'unknown';
let currentSurfaceKind = 'unknown';
let flushTimer = null;
let pendingEvents = [];
let lastView = { surfaceId: null, at: 0 };

function sanitizeSurfaceId(surfaceId) {
  if (typeof surfaceId !== 'string') return 'unknown';
  const candidate = surfaceId.trim();
  return getSurfaceDefinition(candidate)?.id ?? candidate ?? 'unknown';
}

function sanitizeSurfaceKind(surfaceId, surfaceKind) {
  if (typeof surfaceKind === 'string' && surfaceKind.trim()) {
    return surfaceKind.trim().toLowerCase();
  }
  return getSurfaceKind(surfaceId);
}

function sanitizeShortString(value, fallback = 'unknown') {
  if (typeof value !== 'string') return fallback;
  const candidate = value.trim().toLowerCase().slice(0, 80);
  return candidate || fallback;
}

function sanitizeEvent(event) {
  const surfaceId = sanitizeSurfaceId(event.surfaceId ?? currentSurfaceId);
  return {
    type: sanitizeShortString(event.type),
    surfaceId,
    surfaceKind: sanitizeSurfaceKind(surfaceId, event.surfaceKind ?? currentSurfaceKind),
    workflow: sanitizeShortString(event.workflow, 'unknown'),
    action: sanitizeShortString(event.action, 'unknown'),
    result: sanitizeShortString(event.result, 'unknown'),
    role: sanitizeShortString(event.role ?? currentRole, 'unknown'),
    statusClass: sanitizeShortString(event.statusClass, 'unknown'),
    emptyState: sanitizeShortString(event.emptyState, 'none'),
    validationState: sanitizeShortString(event.validationState, 'unknown'),
    durationMs: Number.isFinite(event.durationMs) ? Math.max(0, Math.round(event.durationMs * 100) / 100) : 0,
    at: new Date().toISOString(),
  };
}

async function postJson(path, body) {
  await fetch(path, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function flush() {
  if (!pendingEvents.length) return;
  const batch = pendingEvents;
  pendingEvents = [];

  try {
    await postJson('/api/v1/telemetry/events', { events: batch });
  } catch {
    pendingEvents = [...batch, ...pendingEvents].slice(-100);
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = window.setTimeout(async () => {
    flushTimer = null;
    await flush();
  }, FLUSH_INTERVAL_MS);
}

function queueEvent(event) {
  pendingEvents.push(sanitizeEvent(event));
  if (pendingEvents.length > 100) {
    pendingEvents = pendingEvents.slice(-100);
  }
  scheduleFlush();
}

function reportVital(metric) {
  const surfaceId = sanitizeSurfaceId(currentSurfaceId);
  postJson('/api/v1/telemetry/vitals', {
    ...metric,
    surfaceId,
    page: surfaceId,
  }).catch(() => {});
}

function installGlobalErrorHandlers() {
  window.addEventListener('error', () => {
    queueEvent({
      type: 'ui_error',
      surfaceId: currentSurfaceId,
      surfaceKind: currentSurfaceKind,
      workflow: 'global',
      action: 'window.error',
      result: 'error',
      statusClass: 'client',
    });
  });

  window.addEventListener('unhandledrejection', () => {
    queueEvent({
      type: 'ui_error',
      surfaceId: currentSurfaceId,
      surfaceKind: currentSurfaceKind,
      workflow: 'global',
      action: 'window.unhandledrejection',
      result: 'error',
      statusClass: 'client',
    });
  });
}

function normalizePathForTelemetry(path) {
  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-z]+-\d+(?=\/|$)/gi, '/:id')
    .replace(/\/[a-z0-9]{16,}(?=\/|$)/gi, '/:id');
}

export const frontendTelemetry = {
  start() {
    if (started || typeof window === 'undefined') return;
    started = true;
    browserTelemetry.trackVitals(reportVital);
    installGlobalErrorHandlers();
    window.addEventListener('pagehide', () => {
      if (pendingEvents.length) {
        const body = JSON.stringify({ events: pendingEvents.slice(0, 100) });
        navigator.sendBeacon?.('/api/v1/telemetry/events', new Blob([body], { type: 'application/json' }));
      }
    });
  },
  setRole(role) {
    currentRole = sanitizeShortString(role, 'anonymous');
  },
  setCurrentSurface(surfaceId, surfaceKind = null) {
    currentSurfaceId = sanitizeSurfaceId(surfaceId);
    currentSurfaceKind = sanitizeSurfaceKind(currentSurfaceId, surfaceKind);
  },
  trackSurfaceView(surfaceId, attrs = {}) {
    const normalizedSurfaceId = sanitizeSurfaceId(surfaceId);
    const now = Date.now();
    if (lastView.surfaceId === normalizedSurfaceId && now - lastView.at < VIEW_DEDUPE_WINDOW_MS) {
      return;
    }
    lastView = { surfaceId: normalizedSurfaceId, at: now };
    this.setCurrentSurface(normalizedSurfaceId, attrs.surfaceKind);
    queueEvent({
      type: 'screen_view',
      surfaceId: normalizedSurfaceId,
      surfaceKind: attrs.surfaceKind,
      workflow: attrs.workflow,
      action: 'view',
      result: 'success',
    });
  },
  trackSurfaceLoad(surfaceId, durationMs, attrs = {}) {
    queueEvent({
      type: 'screen_load',
      surfaceId,
      surfaceKind: attrs.surfaceKind,
      workflow: attrs.workflow,
      action: 'load',
      result: 'success',
      durationMs,
    });
  },
  trackSurfaceActive(surfaceId, durationMs, attrs = {}) {
    queueEvent({
      type: 'screen_active',
      surfaceId,
      surfaceKind: attrs.surfaceKind,
      workflow: attrs.workflow,
      action: 'active',
      result: 'success',
      durationMs,
    });
  },
  trackInteraction(surfaceId, action, durationMs, attrs = {}) {
    queueEvent({
      type: 'interaction',
      surfaceId,
      surfaceKind: attrs.surfaceKind,
      workflow: attrs.workflow,
      action,
      result: attrs.result ?? 'success',
      durationMs,
      statusClass: attrs.statusClass,
    });
  },
  trackAction(surfaceId, action, result = 'success', attrs = {}) {
    queueEvent({
      type: 'action',
      surfaceId,
      surfaceKind: attrs.surfaceKind,
      workflow: attrs.workflow,
      action,
      result,
      statusClass: attrs.statusClass,
    });
  },
  trackValidationError(surfaceId, workflow = 'form', attrs = {}) {
    queueEvent({
      type: 'validation_error',
      surfaceId,
      surfaceKind: attrs.surfaceKind,
      workflow,
      action: attrs.action ?? 'validate',
      result: 'failure',
      validationState: attrs.validationState ?? 'invalid',
    });
  },
  trackEmptyState(surfaceId, emptyState = 'empty', attrs = {}) {
    queueEvent({
      type: 'empty_state',
      surfaceId,
      surfaceKind: attrs.surfaceKind,
      workflow: attrs.workflow,
      action: 'empty_state',
      result: 'success',
      emptyState,
    });
  },
  trackUiError(surfaceId, errorType = 'runtime', attrs = {}) {
    queueEvent({
      type: 'ui_error',
      surfaceId,
      surfaceKind: attrs.surfaceKind,
      workflow: attrs.workflow,
      action: errorType,
      result: 'error',
      statusClass: attrs.statusClass ?? 'client',
    });
  },
  trackFetch(surfaceId, action, durationMs, result = 'success', attrs = {}) {
    queueEvent({
      type: 'fetch',
      surfaceId,
      surfaceKind: attrs.surfaceKind,
      workflow: attrs.workflow ?? 'api',
      action,
      result,
      durationMs,
      statusClass: attrs.statusClass ?? (result === 'success' ? '2xx' : 'unknown'),
    });
  },
  async instrumentRequest(url, method, fn, attrs = {}) {
    const startedAt = performance.now();
    try {
      const result = await browserTelemetry.withSpan(`fetch:${method.toUpperCase()} ${normalizePathForTelemetry(url)}`, fn);
      this.trackFetch(
        attrs.surfaceId ?? currentSurfaceId,
        attrs.action ?? `${method.toUpperCase()} ${normalizePathForTelemetry(url)}`,
        performance.now() - startedAt,
        'success',
        { workflow: attrs.workflow, statusClass: attrs.statusClass ?? '2xx' },
      );
      return result;
    } catch (error) {
      this.trackFetch(
        attrs.surfaceId ?? currentSurfaceId,
        attrs.action ?? `${method.toUpperCase()} ${normalizePathForTelemetry(url)}`,
        performance.now() - startedAt,
        error?.status && error.status >= 500 ? 'error' : 'failure',
        { workflow: attrs.workflow, statusClass: error?.statusClass ?? attrs.statusClass ?? 'unknown' },
      );
      throw error;
    }
  },
  flush,
};
