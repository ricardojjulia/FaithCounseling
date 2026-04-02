import http from 'node:http';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

let server;
let baseUrl;

before(async () => {
  process.env.FAITH_API_DISABLE_LISTEN = '1';
  const { handleApiRequest } = await import('../src/index.js');
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
  role = 'counselor',
  staffId = 's-001',
  tenantId = 'system',
} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'x-tenant-id': tenantId,
      'x-staff-role': role,
      'x-staff-id': staffId,
    },
  });

  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

test('assigned counselor can read an eligible pre-session intake preview', async () => {
  const response = await requestJson('/v1/clients/c-004/intake-preview', {
    role: 'counselor',
    staffId: 's-001',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body?.item?.eligible, true);
  assert.equal(response.body?.item?.sessions?.heldSessionCount, 0);
  assert.ok(
    (response.body?.item?.careRoutes ?? []).some((route) => route.id === 'anxiety_support'),
    'expected anxiety support route for eligible intake preview',
  );
  assert.ok(
    (response.body?.item?.careRoutes ?? []).some((route) => route.id === 'faith_integrated_care'),
    'expected faith-integrated route for eligible intake preview',
  );
});

test('preview returns ineligible state once a client has held sessions', async () => {
  const response = await requestJson('/v1/clients/c-003/intake-preview', {
    role: 'counselor',
    staffId: 's-002',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body?.item?.eligible, false);
  assert.equal(response.body?.item?.sessions?.heldSessionCount >= 1, true);
  assert.ok(
    (response.body?.item?.reasons ?? []).some((reason) => reason.includes('held or started session')),
    'expected held-session ineligible reason',
  );
});

test('unassigned counselor is denied from reading another counselor intake preview', async () => {
  const response = await requestJson('/v1/clients/c-004/intake-preview', {
    role: 'counselor',
    staffId: 's-002',
  });

  assert.equal(response.status, 403);
  assert.equal(response.body?.error, 'Access to this resource is not permitted');
});

test('operations summary includes intake preview alert and list items for assigned counselor scope', async () => {
  const response = await requestJson('/v1/operations/summary', {
    role: 'counselor',
    staffId: 's-001',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body?.summary?.clientsBox?.intakePreviews?.total, 1);
  assert.deepEqual(
    (response.body?.summary?.clientsBox?.intakePreviews?.items ?? []).map((item) => item.clientId),
    ['c-004'],
  );
  assert.ok(
    (response.body?.summary?.alerts?.items ?? []).some((item) => item.id === 'intake_previews_available'),
    'expected intake preview alert in operations summary',
  );
});
