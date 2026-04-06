import http from 'node:http';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

let server;
let baseUrl;

before(async () => {
  process.env.FAITH_API_DISABLE_LISTEN = '1';
  const moduleUrl = pathToFileURL(new URL('../src/index.js', import.meta.url).pathname);
  moduleUrl.searchParams.set('test', `portal-public-request-conversion-${Date.now()}`);
  const { handleApiRequest } = await import(moduleUrl.href);
  server = http.createServer(handleApiRequest);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  delete process.env.FAITH_API_DISABLE_LISTEN;
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

async function requestJson(path, {
  method = 'GET',
  role = 'practice_admin',
  staffId = 's-001',
  tenantId = 'system',
  body = null,
} = {}) {
  const headers = {
    'x-tenant-id': tenantId,
  };
  if (role) headers['x-staff-role'] = role;
  if (staffId) headers['x-staff-id'] = staffId;
  if (body !== null) headers['content-type'] = 'application/json';

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

async function createPublicCareRequest() {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const response = await requestJson('/v1/portal/public-requests', {
    method: 'POST',
    role: null,
    staffId: null,
    body: {
      requestType: 'care_request',
      firstName: 'Portal',
      lastName: `Client${unique.slice(-4)}`,
      email: `portal-${unique}@example.test`,
      requestedServices: ['care_request', 'individual'],
      onboardingDetails: {
        preferredName: 'P. Client',
        educationLevel: 'associate',
        referralSource: 'church_referral',
        faithPreference: 'Christian',
        consentToContact: true,
      },
    },
  });

  assert.equal(response.status, 201);
  return response.body?.item?.id;
}

test('approved care request can create and link a client record', async () => {
  const requestId = await createPublicCareRequest();

  const approved = await requestJson('/v1/portal/public-requests', {
    method: 'PATCH',
    body: { requestId, status: 'approved' },
  });
  assert.equal(approved.status, 200);

  const converted = await requestJson('/v1/portal/public-requests/convert', {
    method: 'POST',
    body: { requestId },
  });

  assert.equal(converted.status, 200);
  assert.equal(converted.body?.conversion?.status, 'created');
  assert.ok(converted.body?.conversion?.clientId, 'expected clientId in conversion result');
  assert.equal(converted.body?.item?.convertedClientId, converted.body?.conversion?.clientId);

  const clientList = await requestJson('/v1/clients');
  assert.equal(clientList.status, 200);
  assert.ok(
    (clientList.body?.items ?? []).some((item) => item.id === converted.body?.conversion?.clientId),
    'expected converted client in client roster',
  );

  const requests = await requestJson('/v1/portal/public-requests');
  const convertedRequest = (requests.body?.items ?? []).find((item) => item.id === requestId);
  assert.equal(convertedRequest?.convertedClientId, converted.body?.conversion?.clientId);
});

test('care request must be approved before conversion', async () => {
  const requestId = await createPublicCareRequest();

  const converted = await requestJson('/v1/portal/public-requests/convert', {
    method: 'POST',
    body: { requestId },
  });

  assert.equal(converted.status, 409);
  assert.equal(converted.body?.error, 'Request must be approved before creating a client record');
});

test('non-admin caller cannot convert approved care requests', async () => {
  const requestId = await createPublicCareRequest();
  const approved = await requestJson('/v1/portal/public-requests', {
    method: 'PATCH',
    body: { requestId, status: 'approved' },
  });
  assert.equal(approved.status, 200);

  const converted = await requestJson('/v1/portal/public-requests/convert', {
    method: 'POST',
    role: 'counselor',
    body: { requestId },
  });

  assert.equal(converted.status, 403);
  assert.equal(converted.body?.error, 'Admin role required');
});
