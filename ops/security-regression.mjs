/**
 * Security regression tests.
 *
 * In development (NODE_ENV !== 'production') the API accepts x-staff-role /
 * x-tenant-id headers as a fallback, so these tests run without a live DB.
 *
 * In production the API only recognises session cookies.  Use `loginAs()` to
 * obtain a cookie and pass it in `headers.cookie` instead.
 *
 * Example for production testing:
 *   const cookie = await loginAs('admin@faithcounseling.local', 'ChangeMe!Dev2024#');
 *   await req('/v1/clients', { headers: { cookie, 'content-type': 'application/json' } });
 */

import { randomInt } from 'node:crypto';

const base = process.env.API_BASE_URL || 'http://localhost:3001';

/**
 * Log in and return the raw Set-Cookie header value (for use in subsequent
 * requests).  Used in production-mode testing.
 */
async function loginAs(email, password) {
  const resp = await fetch(`${base}/v1/auth/login`, {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });
  if (!resp.ok) throw new Error(`loginAs(${email}) failed: ${resp.status}`);
  return resp.headers.get('set-cookie') ?? '';
}

// Export for use by other test scripts.  Not called in this file unless
// NODE_ENV === 'production' and SECURITY_TEST_EMAIL / SECURITY_TEST_PASSWORD
// are set.
export { loginAs };

const headersByRole = {
  practiceAdmin: {
    'x-staff-role': 'practice_admin',
    'x-tenant-id': 'system',
    'x-actor-id': 'security-practice-admin',
    'content-type': 'application/json',
  },
  platformAdmin: {
    'x-staff-role': 'platform_admin',
    'x-tenant-id': 'system',
    'x-actor-id': 'security-platform-admin',
    'content-type': 'application/json',
  },
  schedulerBiller: {
    'x-staff-role': 'scheduler_biller',
    'x-tenant-id': 'system',
    'x-actor-id': 'security-scheduler',
    'content-type': 'application/json',
  },
  client: {
    'x-staff-role': 'client',
    'x-tenant-id': 'system',
    'x-client-id': 'c-001',
    'x-actor-id': 'security-client',
    'content-type': 'application/json',
  },
  otherTenant: {
    'x-staff-role': 'practice_admin',
    'x-tenant-id': 'tenant-other',
    'x-actor-id': 'security-other-tenant',
    'content-type': 'application/json',
  },
};

function requestId(prefix) {
  return `${prefix}-${Date.now()}-${randomInt(0, 10000)}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function req(path, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...headers,
      'x-request-id': headers['x-request-id'] || requestId('security'),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function main() {
  let result = await req('/v1/clients');
  assert(result.status === 401, 'Unauthenticated clients collection should return 401');
  console.log('unauthenticated-clients', result.status, result.payload.error);

  result = await req('/v1/clients', { headers: headersByRole.client });
  assert(result.status === 403, 'Client role must not read client management endpoints');
  console.log('client-clients-guard', result.status, result.payload.error);

  result = await req('/v1/billing/invoices', { headers: headersByRole.client });
  assert(result.status === 403, 'Client role must not read billing endpoints');
  console.log('client-billing-guard', result.status, result.payload.error);

  result = await req('/v1/document-templates', { headers: headersByRole.client });
  assert(result.status === 403, 'Client role must not read document template endpoints');
  console.log('client-documents-guard', result.status, result.payload.error);

  result = await req('/v1/portal/overview?clientId=c-001', { headers: headersByRole.client });
  assert(result.status === 200, 'Client must access own portal overview');
  console.log('client-own-portal', result.status, result.payload.client?.id);

  result = await req('/v1/portal/overview?clientId=c-002', { headers: headersByRole.client });
  assert(result.status === 403, 'Client must not access another client portal overview');
  console.log('client-cross-portal-guard', result.status, result.payload.error);

  result = await req('/v1/portal/resources?clientId=c-001', {
    method: 'POST',
    headers: headersByRole.client,
    body: {
      title: 'Unauthorized portal resource',
      content: 'Should be blocked',
      resourceType: 'education',
    },
  });
  assert(result.status === 403, 'Client must not publish portal resources');
  console.log('client-portal-resource-guard', result.status, result.payload.error);

  result = await req('/v1/clients/c-001/lifecycle', { headers: headersByRole.otherTenant });
  assert(result.status === 403, 'Other tenant must not access lifecycle data');
  console.log('tenant-lifecycle-guard', result.status, result.payload.error);

  result = await req('/v1/portal/overview?clientId=c-001', { headers: headersByRole.otherTenant });
  assert(result.status === 403, 'Other tenant must not access portal overview');
  console.log('tenant-portal-guard', result.status, result.payload.error);

  result = await req('/v1/clients/c-001/lifecycle', { headers: headersByRole.platformAdmin });
  assert(result.status === 200, 'Platform admin must be able to cross-tenant support lifecycle reads');
  console.log('platform-cross-tenant-read', result.status, result.payload.item?.clientId);

  result = await req('/v1/platform/tenant-provisioning', {
    method: 'POST',
    headers: headersByRole.practiceAdmin,
    body: {
      requestedTenantId: 'blocked-rbac',
      requestedPracticeName: 'Blocked Practice',
      ownerEmail: 'blocked@example.com',
      status: 'queued',
    },
  });
  assert(result.status === 403, 'Practice admin must not create tenant provisioning requests');
  console.log('practice-admin-platform-guard', result.status, result.payload.error);

  result = await req('/v1/platform/tenant-provisioning', {
    method: 'PATCH',
    headers: headersByRole.practiceAdmin,
    body: {
      id: 'tpr-001',
      status: 'in_progress',
    },
  });
  assert(result.status === 403, 'Practice admin must not update tenant provisioning requests');
  console.log('practice-admin-platform-update-guard', result.status, result.payload.error);

  result = await req('/v1/platform/impersonation-sessions', {
    method: 'POST',
    headers: headersByRole.practiceAdmin,
    body: {
      targetTenantId: 'system',
      targetRole: 'practice_admin',
      reason: 'Regression validation should block this',
    },
  });
  assert(result.status === 403, 'Practice admin must not start impersonation sessions');
  console.log('practice-admin-impersonation-guard', result.status, result.payload.error);

  result = await req('/v1/clients', {
    method: 'POST',
    headers: headersByRole.schedulerBiller,
    body: {
      firstName: 'Blocked',
      lastName: 'SchedulerWrite',
      status: 'active',
    },
  });
  assert(result.status === 403, 'Scheduler/biller must not create client records');
  console.log('scheduler-write-guard', result.status, result.payload.error);

  result = await req('/v1/monitoring/db');
  assert(result.status === 401, 'Unauthenticated callers must not access DB diagnostics');
  console.log('monitoring-db-auth-guard', result.status, result.payload.error);

  result = await req('/v1/monitoring/db', { headers: headersByRole.practiceAdmin });
  assert(result.status === 200, 'Practice admin must access DB diagnostics');
  console.log('monitoring-db-admin-read', result.status, result.payload.mode);

  result = await req('/v1/portal/public-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: {
      firstName: 'Public',
      lastName: 'Probe',
      email: 'public-probe@example.test',
      tenantId: 'tenant-other',
      status: 'approved',
      onboardingDetails: {
        consentToContact: true,
      },
    },
  });
  assert(result.status === 201, 'Public portal request should still be accepted');
  const createdPublicRequestId = result.payload.item?.id;
  console.log('public-request-create', result.status, createdPublicRequestId);

  result = await req('/v1/portal/public-requests', {
    headers: {
      ...headersByRole.platformAdmin,
      'x-tenant-id': 'tenant-other',
    },
  });
  assert(Array.isArray(result.payload.items), 'Expected public request list response');
  assert(!result.payload.items.some((item) => item.id === createdPublicRequestId), 'Public portal request must not be written into an attacker-selected tenant');
  console.log('public-request-tenant-guard', result.status, result.payload.items.length);

  result = await req('/v1/portal/public-requests', { headers: headersByRole.platformAdmin });
  assert(Array.isArray(result.payload.items), 'Expected system tenant public request list response');
  const createdSystemRequest = result.payload.items.find((item) => item.id === createdPublicRequestId);
  assert(createdSystemRequest?.status === 'requested', 'Public portal request status must be forced to requested');
  console.log('public-request-status-guard', result.status, createdSystemRequest?.status);

  console.log('security-regression', 'passed');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
