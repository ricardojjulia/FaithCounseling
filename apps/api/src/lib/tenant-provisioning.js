const TENANT_PROVISIONING_STATUSES = Object.freeze([
  'queued',
  'in_progress',
  'completed',
  'failed',
]);

const TRANSITIONS = Object.freeze({
  queued: new Set(['in_progress', 'failed']),
  in_progress: new Set(['completed', 'failed']),
  failed: new Set(['queued', 'in_progress']),
  completed: new Set([]),
});

export function normalizeTenantProvisioningStatus(value) {
  return TENANT_PROVISIONING_STATUSES.includes(value) ? value : null;
}

export function canTransitionTenantProvisioningStatus(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true;
  const allowed = TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.has(toStatus);
}

export function isProvisionedTenantStatus(status) {
  return status === 'completed';
}

export { TENANT_PROVISIONING_STATUSES };
