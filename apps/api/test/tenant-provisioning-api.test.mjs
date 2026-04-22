import http from 'node:http';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

let server;
let baseUrl;

before(async () => {
  process.env.FAITH_API_DISABLE_LISTEN = '1';
  const moduleUrl = pathToFileURL(new URL('../src/index.js', import.meta.url).pathname);
  moduleUrl.searchParams.set('test', `tenant-provisioning-api-${Date.now()}`);
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
  role = 'platform_admin',
  tenantId = 'system',
  actorId = 'tenant-provisioning-test',
  body = null,
} = {}) {
  const headers = {
    'x-tenant-id': tenantId,
    'x-staff-role': role,
    'x-actor-id': actorId,
  };
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

async function createProvisioningRequest() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  const result = await requestJson('/v1/platform/tenant-provisioning', {
    method: 'POST',
    body: {
      requestedTenantId: `tenant-${suffix}`,
      requestedPracticeName: `Tenant ${suffix}`,
      ownerEmail: `owner-${suffix}@example.test`,
      status: 'queued',
    },
  });
  assert.equal(result.status, 201);
  assert.ok(result.body?.item?.id);
  return result.body.item.id;
}

test('platform admin can progress provisioning lifecycle through valid transitions', async () => {
  const id = await createProvisioningRequest();

  const progress = await requestJson('/v1/platform/tenant-provisioning', {
    method: 'PATCH',
    body: { id, status: 'in_progress' },
  });
  assert.equal(progress.status, 200);
  assert.equal(progress.body?.item?.status, 'in_progress');

  const complete = await requestJson('/v1/platform/tenant-provisioning', {
    method: 'PATCH',
    body: { id, status: 'completed' },
  });
  assert.equal(complete.status, 200);
  assert.equal(complete.body?.item?.status, 'completed');
  assert.ok(complete.body?.item?.completedAt);
});

test('invalid provisioning status transition returns 409', async () => {
  const id = await createProvisioningRequest();

  const invalidJump = await requestJson('/v1/platform/tenant-provisioning', {
    method: 'PATCH',
    body: { id, status: 'completed' },
  });
  assert.equal(invalidJump.status, 409);
  assert.match(String(invalidJump.body?.error || ''), /Invalid status transition/);
});

test('non-platform admin cannot patch provisioning status', async () => {
  const id = await createProvisioningRequest();

  const denied = await requestJson('/v1/platform/tenant-provisioning', {
    method: 'PATCH',
    role: 'practice_admin',
    body: { id, status: 'in_progress' },
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.body?.error, 'Platform admin role required');
});
