function parseBooleanFlag(value, defaultValue = false) {
  if (typeof value !== 'string') return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

  return defaultValue;
}

export const featureFlags = Object.freeze({
  tenantTelemetry: parseBooleanFlag(process.env.TENANT_TELEMETRY_ENABLED, false),
  tenantTelemetrySummary: parseBooleanFlag(
    process.env.TENANT_TELEMETRY_SUMMARY_ENABLED,
    parseBooleanFlag(process.env.TENANT_TELEMETRY_ENABLED, false),
  ),
  tenantUsageDashboard: parseBooleanFlag(process.env.TENANT_USAGE_DASHBOARD_ENABLED, false),
  tenantCapacitySignals: parseBooleanFlag(process.env.TENANT_CAPACITY_SIGNALS_ENABLED, false),
  tenantAutoscaleRecommendations: parseBooleanFlag(process.env.TENANT_AUTOSCALE_RECOMMENDATIONS_ENABLED, false),
});
