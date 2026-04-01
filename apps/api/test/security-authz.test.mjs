/**
 * Negative authorization and cross-tenant tests.
 *
 * These tests exercise enforceRbac and enforceTenantScope directly without
 * spinning up an HTTP server, so they run fast and have no external deps.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { enforceRbac, enforceTenantScope } from '../src/lib/security.js';
import { assertShape } from '../src/lib/http.js';
import { HttpError } from '../src/lib/http.js';

// ─── Mock helpers ────────────────────────────────────────────────────────────

function mockRequest({ role = '', tenantId = 'tenant-a', method = 'GET' } = {}) {
  return {
    headers: {
      'x-staff-role': role,
      'x-tenant-id': tenantId,
    },
    method,
    socket: { remoteAddress: '127.0.0.1' },
  };
}

function mockResponse() {
  const headers = new Map();
  let statusCode;
  let body;
  return {
    setHeader(name, val) { headers.set(String(name).toLowerCase(), val); },
    writeHead(code) { statusCode = code; },
    end(val) { body = val; },
    get statusCode() { return statusCode; },
    get body() { return body ? JSON.parse(body) : undefined; },
    get headers() { return headers; },
  };
}

function mockSession({ role, tenantId = 'tenant-a', staffAccountId = 'sa-1', clientId = null } = {}) {
  return { role, tenant_id: tenantId, staff_account_id: staffAccountId, client_id: clientId, actor_type: 'user' };
}

// ─── enforceRbac — missing session / no role ─────────────────────────────────

test('enforceRbac: no session and no role header → 401 in prod-like env', (t) => {
  const saved = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const req = mockRequest({ role: '' });
    const res = mockResponse();
    const rejected = enforceRbac(req, res, '/v1/clients');
    assert.ok(rejected, 'should reject');
    assert.equal(res.statusCode, 401);
    assert.equal(res.body?.error, 'Authentication required');
  } finally {
    process.env.NODE_ENV = saved;
  }
});

test('enforceRbac: unknown role → 401', () => {
  const req = mockRequest({ role: 'hacker' });
  const res = mockResponse();
  const rejected = enforceRbac(req, res, '/v1/clients');
  assert.ok(rejected);
  assert.equal(res.statusCode, 401);
});

// ─── enforceRbac — role escalation (client accessing staff route) ─────────────

test('enforceRbac: client role accessing staff-only route → 403', () => {
  const req = mockRequest({ role: 'client', method: 'GET' });
  const res = mockResponse();
  const rejected = enforceRbac(req, res, '/v1/clients');
  assert.ok(rejected);
  assert.equal(res.statusCode, 403);
  assert.match(res.body?.error ?? '', /portal/i);
});

test('enforceRbac: client POST to /v1/portal/* is allowed', () => {
  const req = mockRequest({ role: 'client', method: 'POST' });
  const res = mockResponse();
  const rejected = enforceRbac(req, res, '/v1/portal/messages');
  assert.equal(rejected, false, 'client portal POST should pass');
});

// ─── enforceRbac — admin-only routes ─────────────────────────────────────────

test('enforceRbac: counselor accessing admin route → 403', () => {
  const req = mockRequest({ role: 'counselor', method: 'GET' });
  const res = mockResponse();
  const rejected = enforceRbac(req, res, '/v1/monitoring/db');
  assert.ok(rejected);
  assert.equal(res.statusCode, 403);
  assert.match(res.body?.error ?? '', /permission/i);
});

test('enforceRbac: practice_admin accessing admin route → allowed', () => {
  const req = mockRequest({ role: 'practice_admin', method: 'GET' });
  const res = mockResponse();
  const rejected = enforceRbac(req, res, '/v1/monitoring/db');
  assert.equal(rejected, false);
});

// ─── enforceRbac — write access gate ─────────────────────────────────────────

test('enforceRbac: intern attempting DELETE → 403 (not a write role)', () => {
  const req = mockRequest({ role: 'intern', method: 'DELETE' });
  const res = mockResponse();
  const rejected = enforceRbac(req, res, '/v1/clients/c-1');
  assert.ok(rejected);
  assert.equal(res.statusCode, 403);
});

test('enforceRbac: counselor POST → allowed (write role)', () => {
  const req = mockRequest({ role: 'counselor', method: 'POST' });
  const res = mockResponse();
  const rejected = enforceRbac(req, res, '/v1/clients');
  assert.equal(rejected, false);
});

// ─── enforceRbac — session-based (no header fall-through) ────────────────────

test('enforceRbac: session with client role blocks staff route', () => {
  const req = mockRequest({ role: '', method: 'GET' }); // no header role
  const res = mockResponse();
  const session = mockSession({ role: 'client' });
  const rejected = enforceRbac(req, res, '/v1/clients', session);
  assert.ok(rejected);
  assert.equal(res.statusCode, 403);
});

test('enforceRbac: session with counselor role allows GET /v1/clients', () => {
  const req = mockRequest({ role: '', method: 'GET' });
  const res = mockResponse();
  const session = mockSession({ role: 'counselor' });
  const rejected = enforceRbac(req, res, '/v1/clients', session);
  assert.equal(rejected, false);
});

// ─── enforceRbac — public endpoints bypass auth ──────────────────────────────

test('enforceRbac: /health is public → no rejection', () => {
  const req = mockRequest({ role: '' });
  const res = mockResponse();
  assert.equal(enforceRbac(req, res, '/health'), false);
});

test('enforceRbac: /v1/auth/login is public → no rejection', () => {
  const req = mockRequest({ role: '' });
  const res = mockResponse();
  assert.equal(enforceRbac(req, res, '/v1/auth/login'), false);
});

test('enforceRbac: /v1/portal/public-requests POST is public', () => {
  const req = mockRequest({ role: '', method: 'POST' });
  const res = mockResponse();
  assert.equal(enforceRbac(req, res, '/v1/portal/public-requests'), false);
});

// ─── enforceTenantScope — cross-tenant access attempt ────────────────────────

test('enforceTenantScope: caller tenant-a accessing tenant-b resource → 403', () => {
  const req = mockRequest({ tenantId: 'tenant-a' });
  const res = mockResponse();
  const rejected = enforceTenantScope(req, res, 'tenant-b');
  assert.ok(rejected);
  assert.equal(res.statusCode, 403);
  assert.match(res.body?.error ?? '', /not permitted/i);
});

test('enforceTenantScope: caller tenant matches resource → allowed', () => {
  const req = mockRequest({ tenantId: 'tenant-a' });
  const res = mockResponse();
  const rejected = enforceTenantScope(req, res, 'tenant-a');
  assert.equal(rejected, false);
});

test('enforceTenantScope: platform_admin bypasses tenant check', () => {
  const req = mockRequest({ role: 'platform_admin', tenantId: 'tenant-a' });
  const res = mockResponse();
  const rejected = enforceTenantScope(req, res, 'tenant-b');
  assert.equal(rejected, false, 'platform_admin should cross-tenant');
});

test('enforceTenantScope: session-based cross-tenant → 403', () => {
  const req = mockRequest(); // headers irrelevant when session present
  const res = mockResponse();
  const session = mockSession({ role: 'counselor', tenantId: 'tenant-a' });
  const rejected = enforceTenantScope(req, res, 'tenant-b', session);
  assert.ok(rejected);
  assert.equal(res.statusCode, 403);
});

test('enforceTenantScope: platform_admin session bypasses tenant', () => {
  const req = mockRequest();
  const res = mockResponse();
  const session = mockSession({ role: 'platform_admin', tenantId: 'tenant-a' });
  const rejected = enforceTenantScope(req, res, 'tenant-b', session);
  assert.equal(rejected, false);
});

// ─── assertShape — allowlist input validation ─────────────────────────────────

test('assertShape: rejects non-object body', () => {
  assert.throws(() => assertShape({ required: ['email'] }, 'string'), (err) => {
    assert.ok(err instanceof HttpError);
    assert.equal(err.statusCode, 400);
    return true;
  });
});

test('assertShape: rejects null body', () => {
  assert.throws(() => assertShape({ required: ['email'] }, null), (err) => {
    assert.ok(err instanceof HttpError);
    assert.equal(err.statusCode, 400);
    return true;
  });
});

test('assertShape: rejects unknown/unexpected field', () => {
  assert.throws(() => assertShape({ required: ['email', 'password'] }, { email: 'a@b.com', password: 'x', admin: true }), (err) => {
    assert.ok(err instanceof HttpError);
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /Unexpected fields/);
    return true;
  });
});

test('assertShape: rejects missing required field', () => {
  assert.throws(() => assertShape({ required: ['email', 'password'] }, { email: 'a@b.com' }), (err) => {
    assert.ok(err instanceof HttpError);
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /password/);
    return true;
  });
});

test('assertShape: rejects empty string for required field', () => {
  assert.throws(() => assertShape({ required: ['email'] }, { email: '' }), (err) => {
    assert.ok(err instanceof HttpError);
    return true;
  });
});

test('assertShape: passes valid body with optional fields', () => {
  assert.doesNotThrow(() =>
    assertShape(
      { required: ['email', 'token', 'newPassword'], optional: ['metadata'] },
      { email: 'a@b.com', token: 'tok', newPassword: 'Passw0rd!', metadata: 'ok' },
    ),
  );
});

test('assertShape: passes body with only required fields', () => {
  assert.doesNotThrow(() =>
    assertShape({ required: ['email', 'password'] }, { email: 'a@b.com', password: 'secret' }),
  );
});
