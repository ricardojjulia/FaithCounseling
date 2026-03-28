import http from 'node:http';
import { cleanupClientArtifacts } from './lib/clientArtifactCleanup.mjs';

const base = process.env.API_BASE_URL || 'http://localhost:3001';

const practiceAdminHeaders = {
  'x-staff-role': 'practice_admin',
  'x-tenant-id': 'system',
  'x-actor-id': 'step12-practice-admin',
  'x-request-id': `step12-pa-${Date.now()}`,
  'content-type': 'application/json',
};

const platformAdminHeaders = {
  'x-staff-role': 'platform_admin',
  'x-tenant-id': 'system',
  'x-actor-id': 'step12-platform-admin',
  'x-request-id': `step12-plat-${Date.now()}`,
  'content-type': 'application/json',
};

const otherTenantHeaders = {
  'x-staff-role': 'practice_admin',
  'x-tenant-id': 'other-tenant',
  'x-actor-id': 'step12-other-tenant',
  'x-request-id': `step12-other-${Date.now()}`,
  'content-type': 'application/json',
};

const clientHeaders = (clientId) => ({
  'x-staff-role': 'client',
  'x-tenant-id': 'system',
  'x-actor-id': `step12-client-${clientId}`,
  'x-client-id': clientId,
  'x-request-id': `step12-client-${Date.now()}`,
  'content-type': 'application/json',
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function req(url, { method = 'GET', headers = practiceAdminHeaders, body } = {}) {
  const response = await fetch(base + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

function rawRequest(pathname, { method = 'POST', headers = {}, body = '', timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(base + pathname);
    const request = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (response) => {
        let data = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          let payload = {};
          try {
            payload = data ? JSON.parse(data) : {};
          } catch {
            payload = { raw: data };
          }
          resolve({ status: response.statusCode || 0, headers: response.headers, payload });
        });
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Request timeout after ${timeoutMs}ms`));
    });
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

async function main() {
  let clientId = null;

  try {
    const practicesResult = await req('/v1/practices');
    assert(practicesResult.status === 200, 'Expected practices list to load');
    const practiceId = practicesResult.payload.items?.[0]?.id;
    assert(practiceId, 'Expected at least one practice');

    const clientResult = await req('/v1/clients', {
      method: 'POST',
      body: {
        firstName: 'Step12',
        lastName: 'Validation',
        faithBackground: 'Non-denominational',
        status: 'active',
      },
    });
    assert(clientResult.status === 201, 'Expected client creation to succeed');
    clientId = clientResult.payload.item?.id;
    assert(clientId, 'Expected client id');
    console.log('client-created', clientResult.status, clientId);

  const lifecycleResult = await req(`/v1/clients/${clientId}/lifecycle`, {
    method: 'PATCH',
    body: {
      caseStatus: 'active',
      referralSource: 'Step 12 validation',
      emergencyContact: {
        name: 'Jordan Validation',
        relationship: 'Spouse',
        phone: '555-0101',
        authorized: true,
      },
    },
  });
  assert(lifecycleResult.status === 200, 'Expected lifecycle update to succeed');
  console.log('lifecycle', lifecycleResult.status, lifecycleResult.payload.item?.caseStatus);

  const consentResult = await req(`/v1/clients/${clientId}/consents`, {
    method: 'POST',
    body: {
      consentType: 'informed_consent',
      signatureState: 'signed',
      version: 'v12',
    },
  });
  assert(consentResult.status === 201, 'Expected consent creation to succeed');
  console.log('consent', consentResult.status, consentResult.payload.item?.id);

  const intakeResult = await req(`/v1/clients/${clientId}/intake-packets`, {
    method: 'POST',
    body: {
      status: 'completed',
      assignedForms: ['Demographics', 'Consent Packet', 'Clinical History'],
    },
  });
  assert(intakeResult.status === 201, 'Expected intake packet save to succeed');
  console.log('intake', intakeResult.status, intakeResult.payload.item?.status);

  const treatmentPlanResult = await req(`/v1/clients/${clientId}/treatment-plan`, {
    method: 'PUT',
    body: {
      status: 'active',
      goals: ['Reduce anxiety episodes', 'Strengthen family communication'],
      interventions: ['CBT', 'Prayer journaling'],
    },
  });
  assert(treatmentPlanResult.status === 200, 'Expected treatment plan save to succeed');
  console.log('treatment-plan', treatmentPlanResult.status, treatmentPlanResult.payload.item?.status);

  const noteResult = await req(`/v1/clients/${clientId}/progress-notes`, {
    method: 'POST',
    body: {
      noteType: 'progress_note',
      summary: 'Step 12 validation note',
      locked: true,
    },
  });
  assert(noteResult.status === 201, 'Expected progress note save to succeed');
  console.log('progress-note', noteResult.status, noteResult.payload.item?.id);

  const tenantIsolationResult = await req(`/v1/clients/${clientId}/lifecycle`, {
    headers: otherTenantHeaders,
  });
  assert(tenantIsolationResult.status === 403, 'Expected tenant isolation to block other tenant access');
  console.log('tenant-isolation', tenantIsolationResult.status, tenantIsolationResult.payload.error);

  const documentTemplateResult = await req('/v1/document-templates', {
    method: 'POST',
    body: {
      title: 'Step 12 Consent Packet',
      templateType: 'consent_form',
      audience: 'client',
      versionNumber: 1,
      contentBlocks: ['HIPAA rights', 'Client signature', 'Emergency release'],
    },
  });
  assert(documentTemplateResult.status === 201, 'Expected document template creation to succeed');
  const templateId = documentTemplateResult.payload.item?.id;
  console.log('document-template', documentTemplateResult.status, templateId);

  const assignmentResult = await req('/v1/document-assignments', {
    method: 'POST',
    body: {
      templateId,
      assigneeType: 'client',
      assigneeId: clientId,
      status: 'assigned',
      requiresSignature: true,
    },
  });
  assert(assignmentResult.status === 201, 'Expected document assignment to succeed');
  const assignmentId = assignmentResult.payload.item?.id;
  console.log('document-assignment', assignmentResult.status, assignmentId);

  const inventoryDefinitionResult = await req('/v1/inventory-definitions', {
    method: 'POST',
    body: {
      name: 'Step 12 Spiritual Check-In',
      category: 'spiritual_assessment',
      scoringMethod: 'average',
      questions: [
        { key: 'hope', prompt: 'Rate current hopefulness', min: 1, max: 5 },
        { key: 'prayer', prompt: 'Rate prayer consistency', min: 1, max: 5 },
      ],
    },
  });
  assert(inventoryDefinitionResult.status === 201, 'Expected inventory definition creation to succeed');
  const inventoryId = inventoryDefinitionResult.payload.item?.id;
  console.log('inventory-definition', inventoryDefinitionResult.status, inventoryId);

  const inventoryAssignmentResult = await req('/v1/inventory-assignments', {
    method: 'POST',
    body: {
      inventoryId,
      clientId,
      status: 'completed',
      responses: [
        { key: 'hope', value: 4 },
        { key: 'prayer', value: 5 },
      ],
    },
  });
  assert(inventoryAssignmentResult.status === 201, 'Expected inventory assignment to succeed');
  console.log('inventory-assignment', inventoryAssignmentResult.status, inventoryAssignmentResult.payload.item?.score);

  const serviceCodeResult = await req('/v1/billing/service-codes', {
    method: 'POST',
    body: {
      code: 'S12-90837',
      name: 'Step 12 Validation Session',
      category: 'therapy',
      defaultDurationMinutes: 60,
    },
  });
  assert(serviceCodeResult.status === 201, 'Expected service code creation to succeed');
  const serviceCodeId = serviceCodeResult.payload.item?.id;
  console.log('service-code', serviceCodeResult.status, serviceCodeId);

  const feeScheduleResult = await req('/v1/billing/fee-schedules', {
    method: 'POST',
    body: {
      name: 'Step 12 Standard',
      currency: 'USD',
      lines: [{ serviceCodeId, amount: 165 }],
    },
  });
  assert(feeScheduleResult.status === 201, 'Expected fee schedule creation to succeed');
  console.log('fee-schedule', feeScheduleResult.status, feeScheduleResult.payload.item?.id);

  const invoiceResult = await req('/v1/billing/invoices', {
    method: 'POST',
    body: {
      clientId,
      status: 'issued',
      insurance: { payerName: 'Validation Payer' },
      lineItems: [
        {
          serviceCodeId,
          code: 'S12-90837',
          description: 'Step 12 Validation Session',
          quantity: 1,
          unitAmount: 165,
          serviceDate: new Date().toISOString(),
        },
      ],
    },
  });
  assert(invoiceResult.status === 201, 'Expected invoice creation to succeed');
  const invoiceId = invoiceResult.payload.item?.id;
  console.log('invoice', invoiceResult.status, invoiceId);

  const paymentResult = await req('/v1/billing/payments', {
    method: 'POST',
    body: {
      invoiceId,
      amount: 65,
      method: 'card',
    },
  });
  assert(paymentResult.status === 201, 'Expected payment creation to succeed');
  console.log('payment', paymentResult.status, paymentResult.payload.invoice?.balance);

  const superbillResult = await req('/v1/billing/superbills', {
    method: 'POST',
    body: {
      invoiceId,
      diagnosisCodes: ['F41.1'],
    },
  });
  assert(superbillResult.status === 201, 'Expected superbill generation to succeed');
  console.log('superbill', superbillResult.status, superbillResult.payload.item?.id);

  const claimResult = await req('/v1/billing/claims', {
    method: 'POST',
    body: {
      invoiceId,
      status: 'queued',
    },
  });
  assert(claimResult.status === 201, 'Expected claim placeholder creation to succeed');
  console.log('claim', claimResult.status, claimResult.payload.item?.id);

  const agingResult = await req('/v1/billing/reports/aging');
  assert(agingResult.status === 200, 'Expected aging report to load');
  console.log('aging-report', agingResult.status, agingResult.payload.report?.totals?.outstanding);

  const portalAccountResult = await req('/v1/portal/accounts', {
    method: 'POST',
    body: {
      clientId,
      status: 'active',
      email: 'step12-client@example.com',
    },
  });
  assert(portalAccountResult.status === 201, 'Expected portal account creation to succeed');
  console.log('portal-account', portalAccountResult.status, portalAccountResult.payload.item?.id);

  const portalDocumentResult = await req(`/v1/portal/documents?clientId=${encodeURIComponent(clientId)}`, {
    method: 'PATCH',
    headers: clientHeaders(clientId),
    body: {
      assignmentId,
      status: 'signed',
    },
  });
  assert(portalDocumentResult.status === 200, 'Expected portal document signing to succeed');
  console.log('portal-document', portalDocumentResult.status, portalDocumentResult.payload.item?.status);

  const portalIntakeResult = await req(`/v1/portal/intake-packets?clientId=${encodeURIComponent(clientId)}`, {
    method: 'POST',
    headers: clientHeaders(clientId),
    body: {
      status: 'reviewed',
      assignedForms: ['Demographics', 'Consent Packet'],
    },
  });
  assert(portalIntakeResult.status === 201, 'Expected portal intake submission to succeed');
  console.log('portal-intake', portalIntakeResult.status, portalIntakeResult.payload.item?.status);

  const portalRequestResult = await req(`/v1/portal/appointment-requests?clientId=${encodeURIComponent(clientId)}`, {
    method: 'POST',
    headers: clientHeaders(clientId),
    body: {
      preferredStartAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      preferredEndAt: new Date(Date.now() + (3 * 24 * 60 * 60 + 60 * 60) * 1000).toISOString(),
      mode: 'remote',
      notes: 'Prefer an afternoon slot',
      status: 'requested',
    },
  });
  assert(portalRequestResult.status === 201, 'Expected portal appointment request to succeed');
  console.log('portal-request', portalRequestResult.status, portalRequestResult.payload.item?.id);

  const portalMessageResult = await req(`/v1/portal/messages?clientId=${encodeURIComponent(clientId)}`, {
    method: 'POST',
    headers: clientHeaders(clientId),
    body: {
      subject: 'Step 12 check-in',
      body: 'Secure portal message from workflow validation.',
    },
  });
  assert(portalMessageResult.status === 201, 'Expected portal message creation to succeed');
  console.log('portal-message', portalMessageResult.status, portalMessageResult.payload.item?.id);

  const portalResourceResult = await req(`/v1/portal/resources?clientId=${encodeURIComponent(clientId)}`, {
    method: 'POST',
    body: {
      title: 'Validation devotional',
      content: 'Remember to breathe and reflect.',
      resourceType: 'education',
    },
  });
  assert(portalResourceResult.status === 201, 'Expected portal resource publish to succeed');
  console.log('portal-resource', portalResourceResult.status, portalResourceResult.payload.item?.id);

  const portalOverviewResult = await req(`/v1/portal/overview?clientId=${encodeURIComponent(clientId)}`);
  assert(portalOverviewResult.status === 200, 'Expected portal overview to load');
  console.log('portal-overview', portalOverviewResult.status, portalOverviewResult.payload.summary?.balances?.outstandingBalance);

  const faithTemplateResult = await req('/v1/faith/note-templates', {
    method: 'POST',
    body: {
      name: 'Step 12 Integration Note',
      focusArea: 'anxiety',
      integrationLevel: 'balanced',
      sections: ['Client update', 'Prayer reflection'],
    },
  });
  assert(faithTemplateResult.status === 201, 'Expected faith note template creation to succeed');
  console.log('faith-template', faithTemplateResult.status, faithTemplateResult.payload.item?.id);

  const faithGoalResult = await req('/v1/faith/treatment-goals', {
    method: 'POST',
    body: {
      title: 'Restore peace',
      integrationLevel: 'balanced',
      scriptures: ['Philippians 4:6-7'],
      milestones: ['Practice gratitude', 'Review grounding routine'],
    },
  });
  assert(faithGoalResult.status === 201, 'Expected faith treatment goal creation to succeed');
  console.log('faith-goal', faithGoalResult.status, faithGoalResult.payload.item?.id);

  const faithConsentResult = await req('/v1/faith/consent-variants', {
    method: 'POST',
    body: {
      title: 'Balanced consent',
      body: 'Faith integration is optional and collaborative.',
      audience: 'client',
      integrationLevel: 'balanced',
    },
  });
  assert(faithConsentResult.status === 201, 'Expected faith consent variant creation to succeed');
  console.log('faith-consent', faithConsentResult.status, faithConsentResult.payload.item?.id);

  const faithResourceResult = await req('/v1/faith/resources', {
    method: 'POST',
    body: {
      title: 'Step 12 reflection',
      content: 'Short reflection content.',
      scriptureReference: 'Psalm 46:10',
      resourceType: 'devotional',
    },
  });
  assert(faithResourceResult.status === 201, 'Expected faith resource creation to succeed');
  console.log('faith-resource', faithResourceResult.status, faithResourceResult.payload.item?.id);

  const faithInventoryResult = await req('/v1/faith/inventories', {
    method: 'POST',
    body: {
      name: 'Step 12 spiritual inventory',
      cadence: 'weekly',
      prompts: ['How connected did you feel?', 'How hopeful did you feel?'],
    },
  });
  assert(faithInventoryResult.status === 201, 'Expected faith inventory creation to succeed');
  console.log('faith-inventory', faithInventoryResult.status, faithInventoryResult.payload.item?.id);

  const faithCoordinationResult = await req('/v1/faith/referral-coordination', {
    method: 'POST',
    body: {
      clientId,
      churchName: 'Validation Church',
      status: 'proposed',
      contactName: 'Pastor Test',
      contactMethod: 'email',
      consentToCoordinate: true,
      notes: 'Coordinate after discharge planning.',
    },
  });
  assert(faithCoordinationResult.status === 201, 'Expected faith coordination creation to succeed');
  console.log('faith-coordination', faithCoordinationResult.status, faithCoordinationResult.payload.item?.id);

  const faithLanguageResult = await req('/v1/faith/language-preferences', {
    method: 'POST',
    body: {
      practiceId,
      integrationLevel: 'balanced',
      preferredTerminology: 'faith-integrated care',
      explicitFaithLanguage: true,
      includePrayerLanguage: true,
      includeScriptureReferences: true,
    },
  });
  assert(faithLanguageResult.status === 200, 'Expected faith language preferences save to succeed');
  console.log('faith-language', faithLanguageResult.status, faithLanguageResult.payload.item?.integrationLevel);

  const reportingResult = await req('/v1/reporting/overview?days=30');
  assert(reportingResult.status === 200, 'Expected reporting overview to load');
  console.log('reporting-overview', reportingResult.status, reportingResult.payload.summary?.accountsReceivable?.totals?.outstanding);

  const platformOverviewResult = await req('/v1/platform/overview', {
    headers: platformAdminHeaders,
  });
  assert(platformOverviewResult.status === 200, 'Expected platform overview to load for platform admin');
  console.log('platform-overview', platformOverviewResult.status, platformOverviewResult.payload.summary?.provisioning?.total);

  const provisioningResult = await req('/v1/platform/tenant-provisioning', {
    method: 'POST',
    headers: platformAdminHeaders,
    body: {
      requestedTenantId: 'step12-tenant',
      requestedPracticeName: 'Step 12 Tenant',
      ownerEmail: 'owner+step12@example.com',
      status: 'queued',
    },
  });
  assert(provisioningResult.status === 201, 'Expected tenant provisioning to succeed for platform admin');
  console.log('tenant-provisioning', provisioningResult.status, provisioningResult.payload.item?.id);

  const impersonationStartResult = await req('/v1/platform/impersonation-sessions', {
    method: 'POST',
    headers: platformAdminHeaders,
    body: {
      targetTenantId: 'system',
      targetRole: 'practice_admin',
      reason: 'Step 12 validation support scenario',
    },
  });
  assert(impersonationStartResult.status === 201, 'Expected impersonation session creation to succeed');
  const impersonationId = impersonationStartResult.payload.item?.id;
  console.log('impersonation-start', impersonationStartResult.status, impersonationId);

  const impersonationEndResult = await req('/v1/platform/impersonation-sessions', {
    method: 'PATCH',
    headers: platformAdminHeaders,
    body: {
      sessionId: impersonationId,
      status: 'ended',
    },
  });
  assert(impersonationEndResult.status === 200, 'Expected impersonation session end to succeed');
  console.log('impersonation-end', impersonationEndResult.status, impersonationEndResult.payload.item?.status);

  const dataExportResult = await req('/v1/platform/data-exports', {
    method: 'POST',
    headers: platformAdminHeaders,
    body: {
      exportType: 'billing',
      format: 'csv',
      status: 'queued',
    },
  });
  assert(dataExportResult.status === 201, 'Expected data export request to succeed');
  console.log('data-export', dataExportResult.status, dataExportResult.payload.item?.id);

  const retentionResult = await req('/v1/platform/retention-policies', {
    method: 'POST',
    headers: platformAdminHeaders,
    body: {
      clinicalRecordsSchedule: '10_years',
      billingSchedule: '7_years',
      auditLogSchedule: 'indefinite',
      includeDocumentVersions: true,
      legalHoldEnabled: true,
    },
  });
  assert(retentionResult.status === 200, 'Expected retention policy update to succeed');
  console.log('retention-policy', retentionResult.status, retentionResult.payload.item?.legalHoldEnabled);

  const platformGuardResult = await req('/v1/platform/tenant-provisioning', {
    method: 'POST',
    body: {
      requestedTenantId: 'blocked-tenant',
      requestedPracticeName: 'Blocked Tenant',
      ownerEmail: 'blocked@example.com',
      status: 'queued',
    },
  });
  assert(platformGuardResult.status === 403, 'Expected platform guard to reject practice admin');
  console.log('platform-guard', platformGuardResult.status, platformGuardResult.payload.error);

  const malformedJsonResult = await rawRequest('/v1/clients', {
    headers: {
      ...practiceAdminHeaders,
      'content-type': 'application/json',
    },
    body: '{"firstName":"Broken"',
  });
  assert(malformedJsonResult.status === 400, 'Expected malformed JSON to return 400');
  console.log('malformed-json', malformedJsonResult.status, malformedJsonResult.payload.error);

  const oversizedPayloadBody = JSON.stringify({
    firstName: 'TooLarge',
    lastName: 'Payload',
    notes: 'x'.repeat(1_050_000),
  });
  const oversizedBodyResult = await rawRequest('/v1/clients', {
    headers: {
      ...practiceAdminHeaders,
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(oversizedPayloadBody)),
    },
    body: oversizedPayloadBody,
  });
  assert(oversizedBodyResult.status === 413, 'Expected oversized payload to return 413');
  console.log('oversized-body', oversizedBodyResult.status, oversizedBodyResult.payload.error);

  const corsResult = await rawRequest('/v1/reporting/overview?days=30', {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:3002',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'content-type,x-request-id,x-tenant-id,x-staff-role',
    },
  });
  assert(corsResult.status === 204, 'Expected CORS preflight to succeed for local web origin');
  console.log('cors-preflight', corsResult.status, corsResult.headers['access-control-allow-origin']);

    console.log('step12-validation', 'passed');
    process.exit(0);
  } finally {
    if (clientId && process.env.DB_NAME) {
      try {
        const cleanupResult = await cleanupClientArtifacts([clientId]);
        console.log('step12-cleanup', cleanupResult.deleted.clients ?? 0, clientId);
      } catch (cleanupError) {
        console.warn('step12-cleanup-warning', cleanupError.message || cleanupError);
      }
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
