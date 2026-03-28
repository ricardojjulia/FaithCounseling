(function installFaithTelemetry() {
  const state = {
    currentSurfaceId: 'unknown',
    currentSurfaceKind: 'page',
    queue: [],
    flushTimer: null,
    started: false,
    startedAt: 0,
  };

  function postJson(path, body) {
    return fetch(path, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  function sanitizeShortString(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const candidate = value.trim().toLowerCase().slice(0, 80);
    return candidate || fallback;
  }

  function queueEvent(event) {
    state.queue.push({
      type: sanitizeShortString(event.type, 'unknown'),
      surfaceId: sanitizeShortString(event.surfaceId || state.currentSurfaceId, 'unknown'),
      surfaceKind: sanitizeShortString(event.surfaceKind || state.currentSurfaceKind, 'page'),
      workflow: sanitizeShortString(event.workflow, 'unknown'),
      action: sanitizeShortString(event.action, 'unknown'),
      result: sanitizeShortString(event.result, 'unknown'),
      role: 'anonymous',
      statusClass: sanitizeShortString(event.statusClass, 'unknown'),
      emptyState: sanitizeShortString(event.emptyState, 'none'),
      validationState: sanitizeShortString(event.validationState, 'unknown'),
      durationMs: Number.isFinite(event.durationMs) ? Math.max(0, Math.round(event.durationMs * 100) / 100) : 0,
      at: new Date().toISOString(),
    });

    if (state.queue.length > 100) {
      state.queue = state.queue.slice(-100);
    }

    if (!state.flushTimer) {
      state.flushTimer = window.setTimeout(flush, 2000);
    }
  }

  async function flush() {
    if (state.flushTimer) {
      window.clearTimeout(state.flushTimer);
      state.flushTimer = null;
    }

    if (!state.queue.length) return;
    const batch = state.queue;
    state.queue = [];

    try {
      await postJson('/api/v1/telemetry/events', { events: batch });
    } catch {
      state.queue = [...batch, ...state.queue].slice(-100);
    }
  }

  function normalizePath(path) {
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-z]+-\d+(?=\/|$)/gi, '/:id')
      .replace(/\/[a-z0-9]{16,}(?=\/|$)/gi, '/:id');
  }

  function installGlobalErrorHandlers() {
    window.addEventListener('error', function () {
      queueEvent({
        type: 'ui_error',
        workflow: 'global',
        action: 'window.error',
        result: 'error',
        statusClass: 'client',
      });
    });

    window.addEventListener('unhandledrejection', function () {
      queueEvent({
        type: 'ui_error',
        workflow: 'global',
        action: 'window.unhandledrejection',
        result: 'error',
        statusClass: 'client',
      });
    });

    window.addEventListener('pagehide', function () {
      queueEvent({
        type: 'screen_active',
        action: 'active',
        result: 'success',
        durationMs: performance.now() - state.startedAt,
      });

      if (!state.queue.length) return;
      const body = JSON.stringify({ events: state.queue.slice(0, 100) });
      navigator.sendBeacon?.('/api/v1/telemetry/events', new Blob([body], { type: 'application/json' }));
    });
  }

  window.faithTelemetry = {
    start(options) {
      state.currentSurfaceId = sanitizeShortString(options && options.surfaceId, 'unknown');
      state.currentSurfaceKind = sanitizeShortString(options && options.surfaceKind, 'page');
      state.startedAt = performance.now();
      queueEvent({
        type: 'screen_view',
        action: 'view',
        result: 'success',
      });
      window.requestAnimationFrame(function () {
        queueEvent({
          type: 'screen_load',
          action: 'load',
          result: 'success',
          durationMs: performance.now() - state.startedAt,
        });
      });

      if (!state.started) {
        state.started = true;
        installGlobalErrorHandlers();
      }
    },
    trackAction(action, result, attrs) {
      queueEvent({
        type: 'action',
        action: action,
        result: result || 'success',
        workflow: attrs && attrs.workflow,
        statusClass: attrs && attrs.statusClass,
      });
    },
    trackInteraction(action, durationMs, attrs) {
      queueEvent({
        type: 'interaction',
        action: action,
        result: (attrs && attrs.result) || 'success',
        workflow: attrs && attrs.workflow,
        statusClass: attrs && attrs.statusClass,
        durationMs: durationMs,
      });
    },
    trackError(action, attrs) {
      queueEvent({
        type: 'ui_error',
        action: action,
        result: 'error',
        workflow: attrs && attrs.workflow,
        statusClass: (attrs && attrs.statusClass) || 'client',
      });
    },
    trackEmptyState(emptyState, attrs) {
      queueEvent({
        type: 'empty_state',
        action: 'empty_state',
        result: 'success',
        workflow: attrs && attrs.workflow,
        emptyState: emptyState || 'empty',
      });
    },
    async instrumentRequest(url, method, fn, attrs) {
      const startedAt = performance.now();
      try {
        const result = await fn();
        queueEvent({
          type: 'fetch',
          workflow: (attrs && attrs.workflow) || 'api',
          action: method.toUpperCase() + ' ' + normalizePath(url),
          result: 'success',
          durationMs: performance.now() - startedAt,
          statusClass: (attrs && attrs.statusClass) || '2xx',
        });
        return result;
      } catch (error) {
        queueEvent({
          type: 'fetch',
          workflow: (attrs && attrs.workflow) || 'api',
          action: method.toUpperCase() + ' ' + normalizePath(url),
          result: error && error.status >= 500 ? 'error' : 'failure',
          durationMs: performance.now() - startedAt,
          statusClass: (error && error.statusClass) || (attrs && attrs.statusClass) || 'unknown',
        });
        throw error;
      }
    },
    flush: flush,
  };
})();
