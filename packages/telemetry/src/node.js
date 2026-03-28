import { metrics, trace } from '@opentelemetry/api';
import autoInstrumentationsPkg from '@opentelemetry/auto-instrumentations-node';
import metricExporterPkg from '@opentelemetry/exporter-metrics-otlp-http';
import traceExporterPkg from '@opentelemetry/exporter-trace-otlp-http';
import resourcesPkg from '@opentelemetry/resources';
import sdkMetricsPkg from '@opentelemetry/sdk-metrics';
import sdkNodePkg from '@opentelemetry/sdk-node';
import semanticConventions from '@opentelemetry/semantic-conventions';

const { getNodeAutoInstrumentations } = autoInstrumentationsPkg;
const { OTLPMetricExporter } = metricExporterPkg;
const { OTLPTraceExporter } = traceExporterPkg;
const { resourceFromAttributes } = resourcesPkg;
const { PeriodicExportingMetricReader } = sdkMetricsPkg;
const { NodeSDK } = sdkNodePkg;
const { ATTR_DEPLOYMENT_ENVIRONMENT_NAME, ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = semanticConventions;

export async function startNodeTelemetry({ serviceName, serviceVersion = '1.6.0' }) {
  if (process.env.OTEL_SDK_DISABLED === 'true') {
    return null;
  }

  const traceExporter = buildTraceExporter();
  const metricReader = buildMetricReader();
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV ?? 'development',
    }),
    traceExporter,
    metricReader,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  await sdk.start();
  return sdk;
}

export function createServiceTelemetry(serviceName) {
  const meter = metrics.getMeter(serviceName);
  const tracer = trace.getTracer(serviceName);
  const requestDuration = meter.createHistogram('faith.http.server.duration', {
    description: 'HTTP request duration in milliseconds',
    unit: 'ms',
  });
  const activeRequestsCounter = meter.createUpDownCounter('faith.http.server.active_requests', {
    description: 'Number of active HTTP requests',
  });
  const mutationCounter = meter.createCounter('faith.app.mutations', {
    description: 'Application mutation operations',
  });
  const browserVitalHistogram = meter.createHistogram('faith.web.vital.value', {
    description: 'Browser vitals sent from the client application',
  });
  const proxyDuration = meter.createHistogram('faith.web.proxy.duration', {
    description: 'Web proxy upstream duration in milliseconds',
    unit: 'ms',
  });
  const healthCheckDuration = meter.createHistogram('faith.service.healthcheck.duration', {
    description: 'Healthcheck execution duration in milliseconds',
    unit: 'ms',
  });
  const healthCheckCounter = meter.createCounter('faith.service.healthcheck.total', {
    description: 'Healthcheck executions by check name and result',
  });
  const uiScreenViewCounter = meter.createCounter('faith.ui.screen.view', {
    description: 'Visible surface view events',
  });
  const uiScreenLoadDuration = meter.createHistogram('faith.ui.screen.load.duration', {
    description: 'Visible surface load duration in milliseconds',
    unit: 'ms',
  });
  const uiScreenActiveDuration = meter.createHistogram('faith.ui.screen.active.duration', {
    description: 'Visible surface active duration in milliseconds',
    unit: 'ms',
  });
  const uiInteractionDuration = meter.createHistogram('faith.ui.interaction.duration', {
    description: 'UI interaction duration in milliseconds',
    unit: 'ms',
  });
  const uiActionCounter = meter.createCounter('faith.ui.action.total', {
    description: 'UI action outcomes',
  });
  const uiValidationErrorCounter = meter.createCounter('faith.ui.validation.error.total', {
    description: 'UI validation error events',
  });
  const uiEmptyStateCounter = meter.createCounter('faith.ui.empty_state.view.total', {
    description: 'UI empty or placeholder state views',
  });
  const uiErrorCounter = meter.createCounter('faith.ui.error.total', {
    description: 'UI error events',
  });
  const uiFetchDuration = meter.createHistogram('faith.ui.fetch.duration', {
    description: 'Frontend fetch duration in milliseconds',
    unit: 'ms',
  });
  const uiFetchErrorCounter = meter.createCounter('faith.ui.fetch.error.total', {
    description: 'Frontend fetch failures',
  });
  const serviceHealthGauge = meter.createObservableGauge('faith.service.health_status', {
    description: 'Overall service health status where 0=unhealthy, 1=degraded, 2=healthy',
  });
  const dependencyHealthGauge = meter.createObservableGauge('faith.service.dependency.health_status', {
    description: 'Dependency health status where 0=unhealthy, 1=degraded, 2=healthy',
  });

  const state = {
    activeRequests: 0,
    requestSamples: [],
    vitalSamples: [],
    proxySamples: [],
    mutationCount: 0,
    lastMutationAt: null,
    frontendEvents: [],
    frontendSurfaces: {},
    health: {
      serviceStatus: 2,
      dependencies: {},
      checks: {},
      lastUpdatedAt: null,
    },
  };

  meter.addBatchObservableCallback((observableResult) => {
    observableResult.observe(serviceHealthGauge, state.health.serviceStatus);
    for (const [dependency, dependencyState] of Object.entries(state.health.dependencies)) {
      observableResult.observe(dependencyHealthGauge, dependencyState.status, { dependency });
    }
  }, [serviceHealthGauge, dependencyHealthGauge]);

  return {
    tracer,
    beginRequest(attributes) {
      const start = performance.now();
      activeRequestsCounter.add(1, attributes);
      state.activeRequests += 1;
      const span = tracer.startSpan(`http ${attributes.method} ${attributes.route}`);

      return {
        span,
        end(statusCode, extraAttributes = {}) {
          const duration = performance.now() - start;
          const tenantId = normalizeTenantId(extraAttributes.tenantId ?? attributes.tenantId);
          requestDuration.record(duration, {
            ...attributes,
            ...extraAttributes,
            tenantId,
            statusCode,
          });
          activeRequestsCounter.add(-1, attributes);
          state.activeRequests = Math.max(0, state.activeRequests - 1);
          state.requestSamples.push({
            duration,
            at: Date.now(),
            statusCode,
            route: attributes.route,
            method: attributes.method,
            tenantId,
          });
          trimSamples(state.requestSamples);
          span.setAttribute('http.response.status_code', statusCode);
          span.end();
        },
      };
    },
    recordMutation(name, result = 'success', attributes = {}) {
      mutationCounter.add(1, { name, result, ...attributes });
      state.mutationCount += 1;
      state.lastMutationAt = new Date().toISOString();
    },
    recordBrowserVital(vital) {
      browserVitalHistogram.record(vital.value, {
        name: vital.name,
        rating: vital.rating,
        tenantId: normalizeTenantId(vital.tenantId),
      });
      state.vitalSamples.push({
        ...vital,
        tenantId: normalizeTenantId(vital.tenantId),
        at: Date.now(),
      });
      trimSamples(state.vitalSamples);
    },
    recordProxy(duration, route) {
      proxyDuration.record(duration, { route });
      state.proxySamples.push({ duration, route, at: Date.now() });
      trimSamples(state.proxySamples);
    },
    recordHealthCheck(name, duration, status, attributes = {}) {
      healthCheckDuration.record(duration, { name, ...attributes });
      healthCheckCounter.add(1, { name, status, ...attributes });
    },
    updateHealth({ serviceStatus, dependencies = {}, checks = {} }) {
      state.health.serviceStatus = normalizeHealthValue(serviceStatus);
      state.health.lastUpdatedAt = new Date().toISOString();

      for (const [dependency, value] of Object.entries(dependencies)) {
        state.health.dependencies[dependency] = {
          status: normalizeHealthValue(value?.status),
          observedAt: value?.observedAt ?? state.health.lastUpdatedAt,
        };
      }

      state.health.checks = Object.fromEntries(
        Object.entries(checks).map(([name, value]) => [
          name,
          {
            status: normalizeHealthValue(value?.status),
            observedAt: value?.observedAt ?? state.health.lastUpdatedAt,
            durationMs: typeof value?.durationMs === 'number' ? round(value.durationMs) : null,
            detail: value?.detail ?? null,
          },
        ]),
      );
    },
    recordFrontendEvent(event) {
      const normalized = normalizeFrontendEvent(event);
      if (!normalized) return false;

      const metricAttributes = {
        surface_id: normalized.surfaceId,
        surface_kind: normalized.surfaceKind,
        workflow: normalized.workflow,
        action: normalized.action,
        result: normalized.result,
        role: normalized.role,
        status_class: normalized.statusClass,
        empty_state: normalized.emptyState,
        validation_state: normalized.validationState,
      };

      const surface = state.frontendSurfaces[normalized.surfaceId] ?? createFrontendSurfaceSummary(
        normalized.surfaceId,
        normalized.surfaceKind,
      );
      surface.surfaceKind = normalized.surfaceKind;
      surface.lastSeenAt = normalized.at;

      if (normalized.type === 'screen_view') {
        uiScreenViewCounter.add(1, metricAttributes);
        surface.viewCount += 1;
      }

      if (normalized.type === 'screen_load') {
        uiScreenLoadDuration.record(normalized.durationMs, metricAttributes);
        surface.loadDurations.push(normalized.durationMs);
        trimSamples(surface.loadDurations);
      }

      if (normalized.type === 'screen_active') {
        uiScreenActiveDuration.record(normalized.durationMs, metricAttributes);
        surface.activeDurations.push(normalized.durationMs);
        trimSamples(surface.activeDurations);
      }

      if (normalized.type === 'interaction') {
        uiInteractionDuration.record(normalized.durationMs, metricAttributes);
        surface.interactionDurations.push(normalized.durationMs);
        trimSamples(surface.interactionDurations);
      }

      if (normalized.type === 'action') {
        uiActionCounter.add(1, metricAttributes);
        surface.actionCounts[normalized.result] = (surface.actionCounts[normalized.result] ?? 0) + 1;
      }

      if (normalized.type === 'validation_error') {
        uiValidationErrorCounter.add(1, metricAttributes);
        surface.validationErrorCount += 1;
      }

      if (normalized.type === 'empty_state') {
        uiEmptyStateCounter.add(1, metricAttributes);
        surface.emptyStates[normalized.emptyState] = (surface.emptyStates[normalized.emptyState] ?? 0) + 1;
      }

      if (normalized.type === 'ui_error') {
        uiErrorCounter.add(1, metricAttributes);
        surface.uiErrorCount += 1;
      }

      if (normalized.type === 'fetch') {
        uiFetchDuration.record(normalized.durationMs, metricAttributes);
        surface.fetchDurations.push(normalized.durationMs);
        trimSamples(surface.fetchDurations);
        if (normalized.result !== 'success') {
          uiFetchErrorCounter.add(1, metricAttributes);
          surface.fetchErrorCount += 1;
        }
      }

      state.frontendSurfaces[normalized.surfaceId] = surface;
      state.frontendEvents.push(normalized);
      trimSamples(state.frontendEvents, 200);
      return true;
    },
    getSummary(options = {}) {
      const requestLatencySummary = summarizeDurations(state.requestSamples);
      const proxyLatencySummary = summarizeDurations(state.proxySamples);
      const errorCount = state.requestSamples.filter((sample) => Number(sample.statusCode) >= 400).length;
      const lastRequest = state.requestSamples[state.requestSamples.length - 1] ?? null;
      const statusCounts = summarizeStatusCounts(state.requestSamples);
      const errorStatusCounts = summarizeErrorStatusCounts(state.requestSamples);
      const requestsByTenant = options.includeTenantBreakdown
        ? summarizeRequestsByTenant(state.requestSamples)
        : null;
      const frontend = summarizeFrontend(state.frontendSurfaces, state.frontendEvents);
      const recentErrors = state.requestSamples
        .filter((sample) => Number(sample.statusCode) >= 400)
        .slice(-10)
        .map((sample) => ({
          at: new Date(sample.at).toISOString(),
          statusCode: sample.statusCode,
          method: sample.method,
          route: sample.route,
        }));

      return {
        activeRequests: state.activeRequests,
        requestLatencyMs: requestLatencySummary,
        proxyLatencyMs: proxyLatencySummary,
        requestCount: requestLatencySummary.count,
        errorCount,
        statusCounts,
        errorStatusCounts,
        requestsByTenant,
        recentErrors,
        avgDurationMs: requestLatencySummary.avg,
        lastRoute: lastRequest?.route ?? null,
        lastRequestAt: lastRequest ? new Date(lastRequest.at).toISOString() : null,
        mutationCount: state.mutationCount,
        lastMutationAt: state.lastMutationAt,
        browserVitals: summarizeVitals(state.vitalSamples),
        overall: frontend.overall,
        frontend: frontend.frontend,
        surfaces: frontend.surfaces,
        health: {
          serviceStatus: state.health.serviceStatus,
          dependencies: state.health.dependencies,
          checks: state.health.checks,
          lastUpdatedAt: state.health.lastUpdatedAt,
        },
        process: {
          uptimeSeconds: Math.round(process.uptime()),
          rssMb: toMegabytes(process.memoryUsage().rss),
          heapUsedMb: toMegabytes(process.memoryUsage().heapUsed),
          heapTotalMb: toMegabytes(process.memoryUsage().heapTotal),
        },
      };
    },
  };
}

function buildTraceExporter() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return undefined;
  return new OTLPTraceExporter({ url: endpoint });
}

function buildMetricReader() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return undefined;

  return new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: endpoint }),
    exportIntervalMillis: 10_000,
  });
}

function trimSamples(samples, maxSamples = 50) {
  while (samples.length > maxSamples) {
    samples.shift();
  }
}

function createFrontendSurfaceSummary(surfaceId, surfaceKind) {
  return {
    surfaceId,
    surfaceKind,
    viewCount: 0,
    loadDurations: [],
    activeDurations: [],
    interactionDurations: [],
    fetchDurations: [],
    fetchErrorCount: 0,
    uiErrorCount: 0,
    validationErrorCount: 0,
    emptyStates: {},
    actionCounts: {},
    lastSeenAt: null,
  };
}

function summarizeDurations(samples) {
  if (!samples.length) {
    return { avg: 0, p95: 0, max: 0, count: 0 };
  }

  const durations = samples.map((sample) => sample.duration).sort((left, right) => left - right);
  return {
    avg: round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
    p95: round(durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))]),
    max: round(durations[durations.length - 1]),
    count: durations.length,
  };
}

function summarizeRequestsByTenant(samples) {
  const tenants = new Map();
  for (const sample of samples) {
    const tenantId = normalizeTenantId(sample.tenantId);
    if (!tenants.has(tenantId)) {
      tenants.set(tenantId, {
        tenantId,
        requestCount: 0,
        errorCount: 0,
        durations: [],
      });
    }

    const summary = tenants.get(tenantId);
    summary.requestCount += 1;
    summary.durations.push(sample.duration);
    if (Number(sample.statusCode) >= 400) {
      summary.errorCount += 1;
    }
  }

  return [...tenants.values()].map((summary) => {
    const sortedDurations = summary.durations.sort((left, right) => left - right);
    return {
      tenantId: summary.tenantId,
      requestCount: summary.requestCount,
      errorCount: summary.errorCount,
      avgDurationMs: round(sortedDurations.reduce((sum, value) => sum + value, 0) / sortedDurations.length),
      p95DurationMs: round(sortedDurations[Math.min(sortedDurations.length - 1, Math.floor(sortedDurations.length * 0.95))]),
      maxDurationMs: round(sortedDurations[sortedDurations.length - 1]),
    };
  });
}

function normalizeTenantId(value) {
  if (typeof value !== 'string') return 'unknown';
  const candidate = value.trim();
  return candidate || 'unknown';
}

function summarizeVitals(samples) {
  return samples.reduce((summary, sample) => {
    const existing = summary[sample.name] ?? { value: sample.value, rating: sample.rating, count: 0 };
    summary[sample.name] = {
      value: round(sample.value),
      rating: sample.rating,
      count: existing.count + 1,
    };
    return summary;
  }, {});
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function normalizeFrontendEvent(event) {
  if (!event || typeof event !== 'object') return null;

  const type = normalizeEnum(event.type, [
    'screen_view',
    'screen_load',
    'screen_active',
    'interaction',
    'action',
    'validation_error',
    'empty_state',
    'ui_error',
    'fetch',
  ], 'unknown');
  if (type === 'unknown') return null;

  const surfaceId = normalizeShortString(event.surfaceId, 'unknown');
  const surfaceKind = normalizeEnum(event.surfaceKind, ['page', 'view', 'tab', 'subview', 'modal', 'panel'], 'unknown');
  const workflow = normalizeShortString(event.workflow, 'unknown');
  const action = normalizeShortString(event.action, 'unknown');
  const result = normalizeEnum(event.result, ['success', 'failure', 'error', 'abandoned', 'unknown'], 'unknown');
  const role = normalizeShortString(event.role, 'unknown');
  const statusClass = normalizeShortString(event.statusClass, 'unknown');
  const emptyState = normalizeShortString(event.emptyState, 'none');
  const validationState = normalizeShortString(event.validationState, 'unknown');
  const durationMs = Number.isFinite(event.durationMs) ? round(Math.max(0, event.durationMs)) : 0;
  const at = normalizeTimestamp(event.at);

  return {
    type,
    surfaceId,
    surfaceKind,
    workflow,
    action,
    result,
    role,
    statusClass,
    emptyState,
    validationState,
    durationMs,
    at,
  };
}

function summarizeFrontend(frontendSurfaces, frontendEvents) {
  const surfaces = Object.values(frontendSurfaces).map((surface) => {
    const totalActions = Object.values(surface.actionCounts).reduce((sum, count) => sum + count, 0);
    const successfulActions = surface.actionCounts.success ?? 0;

    return {
      surfaceId: surface.surfaceId,
      surfaceKind: surface.surfaceKind,
      viewCount: surface.viewCount,
      loadDurationMs: summarizeDurations(surface.loadDurations.map((duration) => ({ duration }))),
      activeDurationMs: summarizeDurations(surface.activeDurations.map((duration) => ({ duration }))),
      interactionDurationMs: summarizeDurations(surface.interactionDurations.map((duration) => ({ duration }))),
      fetchDurationMs: summarizeDurations(surface.fetchDurations.map((duration) => ({ duration }))),
      fetchErrorCount: surface.fetchErrorCount,
      uiErrorCount: surface.uiErrorCount,
      validationErrorCount: surface.validationErrorCount,
      emptyStates: surface.emptyStates,
      actionCounts: surface.actionCounts,
      actionSuccessRate: totalActions ? round((successfulActions / totalActions) * 100) : 0,
      lastSeenAt: surface.lastSeenAt,
    };
  }).sort((left, right) => right.viewCount - left.viewCount || left.surfaceId.localeCompare(right.surfaceId));

  const totalViews = surfaces.reduce((sum, surface) => sum + surface.viewCount, 0);
  const totalUiErrors = surfaces.reduce((sum, surface) => sum + surface.uiErrorCount, 0);
  const totalFetchErrors = surfaces.reduce((sum, surface) => sum + surface.fetchErrorCount, 0);
  const totalValidationErrors = surfaces.reduce((sum, surface) => sum + surface.validationErrorCount, 0);
  const totalActions = surfaces.reduce((sum, surface) => (
    sum + Object.values(surface.actionCounts).reduce((inner, count) => inner + count, 0)
  ), 0);
  const successfulActions = surfaces.reduce((sum, surface) => sum + (surface.actionCounts.success ?? 0), 0);
  const slowSurfaceCount = surfaces.filter((surface) => surface.loadDurationMs.p95 >= 1000 || surface.fetchDurationMs.p95 >= 1000).length;
  const topFailingSurfaces = [...surfaces]
    .sort((left, right) => (
      (right.uiErrorCount + right.fetchErrorCount + right.validationErrorCount)
      - (left.uiErrorCount + left.fetchErrorCount + left.validationErrorCount)
    ))
    .slice(0, 5)
    .map((surface) => ({
      surfaceId: surface.surfaceId,
      issueCount: surface.uiErrorCount + surface.fetchErrorCount + surface.validationErrorCount,
    }));

  const workflowCounts = {};
  for (const event of frontendEvents) {
    const workflow = event.workflow || 'unknown';
    if (!workflowCounts[workflow]) {
      workflowCounts[workflow] = { workflow, errorCount: 0, actionCount: 0 };
    }
    if (event.type === 'ui_error' || (event.type === 'fetch' && event.result !== 'success')) {
      workflowCounts[workflow].errorCount += 1;
    }
    if (event.type === 'action') {
      workflowCounts[workflow].actionCount += 1;
    }
  }

  const topFailingWorkflows = Object.values(workflowCounts)
    .sort((left, right) => right.errorCount - left.errorCount || right.actionCount - left.actionCount)
    .slice(0, 5);

  const lastEventAt = frontendEvents.length ? frontendEvents[frontendEvents.length - 1].at : null;

  return {
    overall: {
      totalViews,
      totalUiErrors,
      totalFetchErrors,
      totalValidationErrors,
      totalActions,
      actionSuccessRate: totalActions ? round((successfulActions / totalActions) * 100) : 0,
      activeSurfaceCount: surfaces.filter((surface) => surface.lastSeenAt).length,
      slowSurfaceCount,
      lastEventAt,
    },
    frontend: {
      totalViews,
      totalUiErrors,
      totalFetchErrors,
      totalValidationErrors,
      totalActions,
      actionSuccessRate: totalActions ? round((successfulActions / totalActions) * 100) : 0,
      topFailingSurfaces,
      topFailingWorkflows,
      lastEventAt,
    },
    surfaces,
  };
}

function normalizeEnum(value, allowedValues, fallback) {
  if (typeof value !== 'string') return fallback;
  const candidate = value.trim().toLowerCase();
  return allowedValues.includes(candidate) ? candidate : fallback;
}

function normalizeShortString(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const candidate = value.trim().toLowerCase().slice(0, 80);
  return candidate || fallback;
}

function normalizeTimestamp(value) {
  if (typeof value === 'string') {
    const timestamp = new Date(value);
    if (!Number.isNaN(timestamp.getTime())) {
      return timestamp.toISOString();
    }
  }

  return new Date().toISOString();
}

function normalizeHealthValue(value) {
  if (value === 0 || value === 1 || value === 2) {
    return value;
  }

  return 0;
}

function toMegabytes(value) {
  return round(value / 1024 / 1024);
}

function summarizeStatusCounts(samples) {
  const counts = {};
  for (const sample of samples) {
    const key = String(sample.statusCode ?? 'unknown');
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function summarizeErrorStatusCounts(samples) {
  const counts = {};
  for (const sample of samples) {
    const statusCode = Number(sample.statusCode);
    if (!Number.isFinite(statusCode) || statusCode < 400) continue;
    const key = String(statusCode);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
