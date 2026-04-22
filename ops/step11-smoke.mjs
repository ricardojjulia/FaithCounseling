const base = process.env.API_BASE_URL || 'http://localhost:3001';

const practiceAdminHeaders = {
  'x-staff-role': 'practice_admin',
  'x-tenant-id': 'system',
  'x-actor-id': 'step11-practice-admin',
  'x-request-id': `step11-pa-${Date.now()}`,
  'content-type': 'application/json',
};

const platformAdminHeaders = {
  'x-staff-role': 'platform_admin',
  'x-tenant-id': 'system',
  'x-actor-id': 'step11-platform-admin',
  'x-request-id': `step11-plat-${Date.now()}`,
  'content-type': 'application/json',
};

async function req(url, { method = 'GET', headers = practiceAdminHeaders, body } = {}) {
  const response = await fetch(base + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function main() {
  let result = await req('/v1/reporting/overview?days=30');
  console.log('reporting-overview', result.status, result.payload.summary?.utilization?.sessionsInWindow, result.payload.summary?.accountsReceivable?.totals?.outstanding);

  result = await req('/v1/platform/overview');
  console.log('platform-overview-admin', result.status, result.payload.summary?.provisioning?.total, result.payload.summary?.dataExports?.total);

  result = await req('/v1/platform/data-exports', {
    method: 'POST',
    body: {
      exportType: 'billing',
      format: 'csv',
      status: 'queued',
    },
  });
  console.log('data-export', result.status, result.payload.item?.id || result.payload.error);

  result = await req('/v1/platform/retention-policies', {
    method: 'POST',
    body: {
      clinicalRecordsSchedule: '10_years',
      billingSchedule: '7_years',
      auditLogSchedule: 'indefinite',
      includeDocumentVersions: true,
      legalHoldEnabled: false,
    },
  });
  console.log('retention-policy', result.status, result.payload.item?.id || result.payload.error);

  result = await req('/v1/platform/tenant-provisioning', {
    method: 'POST',
    headers: platformAdminHeaders,
    body: {
      requestedTenantId: 'steadfast-counseling',
      requestedPracticeName: 'Steadfast Counseling Group',
      ownerEmail: 'owner@steadfast.test',
      status: 'queued',
    },
  });
  const provisioningId = result.payload.item?.id;
  console.log('tenant-provisioning-platform', result.status, provisioningId || result.payload.error);

  result = await req('/v1/platform/tenant-provisioning', {
    method: 'PATCH',
    headers: platformAdminHeaders,
    body: {
      id: provisioningId,
      status: 'in_progress',
    },
  });
  console.log('tenant-provisioning-progress', result.status, result.payload.item?.status || result.payload.error);

  result = await req('/v1/platform/tenant-provisioning', {
    method: 'PATCH',
    headers: platformAdminHeaders,
    body: {
      id: provisioningId,
      status: 'completed',
    },
  });
  console.log('tenant-provisioning-complete', result.status, result.payload.item?.status || result.payload.error);

  result = await req('/v1/platform/tenant-provisioning', {
    method: 'PATCH',
    headers: platformAdminHeaders,
    body: {
      id: provisioningId,
      status: 'queued',
    },
  });
  console.log('tenant-provisioning-invalid-transition', result.status, result.payload.error || 'ok');

  result = await req('/v1/platform/impersonation-sessions', {
    method: 'POST',
    headers: platformAdminHeaders,
    body: {
      targetTenantId: 'system',
      targetRole: 'practice_admin',
      reason: 'Troubleshoot reporting access issue for support case 4412.',
    },
  });
  const impersonationSessionId = result.payload.item?.id;
  console.log('impersonation-start', result.status, impersonationSessionId || result.payload.error);

  result = await req('/v1/platform/impersonation-sessions', {
    method: 'PATCH',
    headers: platformAdminHeaders,
    body: {
      sessionId: impersonationSessionId,
      status: 'ended',
    },
  });
  console.log('impersonation-end', result.status, result.payload.item?.status || result.payload.error);

  result = await req('/v1/platform/tenant-provisioning', {
    method: 'POST',
    body: {
      requestedTenantId: 'unauthorized-demo',
      requestedPracticeName: 'Unauthorized Demo',
      ownerEmail: 'owner@demo.test',
      status: 'queued',
    },
  });
  console.log('tenant-provisioning-guard', result.status, result.payload.error || 'ok');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
