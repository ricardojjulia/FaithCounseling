import { useEffect } from 'react';
import { frontendTelemetry } from './frontendTelemetry.js';

export function useSurfaceTelemetry(surfaceId, options = {}) {
  useEffect(() => {
    if (!surfaceId) return undefined;

    const startedAt = performance.now();
    frontendTelemetry.trackSurfaceView(surfaceId, options);
    frontendTelemetry.setCurrentSurface(surfaceId, options.surfaceKind);

    const loadTimer = window.requestAnimationFrame(() => {
      frontendTelemetry.trackSurfaceLoad(surfaceId, performance.now() - startedAt, options);
      if (options.emptyState) {
        frontendTelemetry.trackEmptyState(surfaceId, options.emptyState, options);
      }
    });

    return () => {
      window.cancelAnimationFrame(loadTimer);
      frontendTelemetry.trackSurfaceActive(surfaceId, performance.now() - startedAt, options);
    };
  }, [surfaceId, options.surfaceKind, options.workflow, options.emptyState]);
}
