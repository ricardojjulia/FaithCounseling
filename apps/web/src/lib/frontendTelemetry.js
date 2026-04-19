/**
 * frontendTelemetry.js
 *
 * Lightweight browser-side telemetry helper.
 * Sends events to the API telemetry endpoint when available; silently
 * swallows errors so telemetry never breaks the UI.
 *
 * NOTE: No PHI/PII should ever be passed into these calls.
 */

const ENDPOINT = '/api/v1/telemetry/events';

/**
 * Fire-and-forget POST to the telemetry endpoint.
 * Errors are caught and discarded — telemetry must never block UI paths.
 * @param {object} payload
 */
function send(payload) {
  try {
    // Use sendBeacon when available so events survive page unload.
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Intentionally swallow — telemetry must not throw
  }
}

export const frontendTelemetry = {
  /**
   * Track when a major UI surface finishes loading.
   * @param {string} surface  - Identifier for the surface (e.g. 'time_tracking')
   * @param {'success'|'error'} status
   */
  trackSurfaceLoad(surface, status) {
    send({ event: 'surface_load', surface, status, ts: Date.now() });
  },

  /**
   * Track a discrete user or system action.
   * @param {string} surface   - Identifier for the surface
   * @param {string} action    - Action name (e.g. 'export_csv')
   * @param {'success'|'error'} status
   * @param {object} [meta={}] - Additional non-sensitive metadata
   */
  trackAction(surface, action, status, meta = {}) {
    send({ event: 'action', surface, action, status, meta, ts: Date.now() });
  },
};
