/**
 * Audit coverage tests.
 *
 * Verifies that createAuditEvent and the inference helpers produce canonical
 * result semantics per PLANS/FULL-SECURITY-AND-AUDITING.md:
 *   result in { 'success', 'failure', 'denied', 'error' }
 *   reasonCode must be a non-empty string
 *
 * Tests run without DB or HTTP server — pure unit coverage.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createAuditEvent } from '../../../packages/domain/src/index.js';

// ─── Canonical result semantics ───────────────────────────────────────────────

const VALID_RESULTS = new Set(['success', 'failure', 'denied', 'error']);

function baseEvent(overrides = {}) {
  return {
    tenantId: 'tenant-test',
    action: 'session.login',
    targetType: 'staff_account',
    targetId: 'sa-1',
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

test('createAuditEvent: default result is success', () => {
  const ev = createAuditEvent(baseEvent());
  assert.ok(VALID_RESULTS.has(ev.result), `result '${ev.result}' must be a canonical value`);
  assert.equal(ev.result, 'success');
});

test('createAuditEvent: explicit denied result is preserved', () => {
  const ev = createAuditEvent(baseEvent({ result: 'denied', reasonCode: 'rbac_denied' }));
  assert.equal(ev.result, 'denied');
  assert.equal(ev.reasonCode, 'rbac_denied');
});

test('createAuditEvent: explicit failure result is preserved', () => {
  const ev = createAuditEvent(baseEvent({ result: 'failure', reasonCode: 'operation_failed' }));
  assert.equal(ev.result, 'failure');
});

test('createAuditEvent: explicit error result is preserved', () => {
  const ev = createAuditEvent(baseEvent({ result: 'error', reasonCode: 'operation_error' }));
  assert.equal(ev.result, 'error');
});

// ─── Required fields guard ─────────────────────────────────────────────────────

test('createAuditEvent: throws when tenantId missing', () => {
  assert.throws(
    () => createAuditEvent({ action: 'x', targetType: 'y', targetId: 'z', occurredAt: new Date().toISOString() }),
    /Missing audit field: tenantId/,
  );
});

test('createAuditEvent: throws when action missing', () => {
  assert.throws(
    () => createAuditEvent({ tenantId: 'tenant-test', targetType: 'y', targetId: 'z', occurredAt: new Date().toISOString() }),
    /Missing audit field: action/,
  );
});

test('createAuditEvent: throws when targetId missing', () => {
  assert.throws(
    () => createAuditEvent({ tenantId: 'tenant-test', action: 'x', targetType: 'y', occurredAt: new Date().toISOString() }),
    /Missing audit field: targetId/,
  );
});

// ─── Defaults when optional fields are absent ─────────────────────────────────

test('createAuditEvent: defaults actorId to anonymous', () => {
  const ev = createAuditEvent(baseEvent());
  assert.equal(ev.actorId, 'anonymous');
});

test('createAuditEvent: defaults actorRole to unknown', () => {
  const ev = createAuditEvent(baseEvent());
  assert.equal(ev.actorRole, 'unknown');
});

test('createAuditEvent: defaults actorType to anonymous', () => {
  const ev = createAuditEvent(baseEvent());
  assert.equal(ev.actorType, 'anonymous');
});

test('createAuditEvent: defaults reasonCode to ok', () => {
  const ev = createAuditEvent(baseEvent());
  assert.equal(ev.reasonCode, 'ok');
});

test('createAuditEvent: defaults sourceSurface to api', () => {
  const ev = createAuditEvent(baseEvent());
  assert.equal(ev.sourceSurface, 'api');
});

test('createAuditEvent: defaults systemComponent to faith-api', () => {
  const ev = createAuditEvent(baseEvent());
  assert.equal(ev.systemComponent, 'faith-api');
});

// ─── Auto-generated ID ────────────────────────────────────────────────────────

test('createAuditEvent: auto-generates a unique UUID id', () => {
  const ev1 = createAuditEvent(baseEvent());
  const ev2 = createAuditEvent(baseEvent());
  assert.match(ev1.id, /^[0-9a-f-]{36}$/i);
  assert.notEqual(ev1.id, ev2.id, 'each event must have a unique ID');
});

// ─── Immutability ─────────────────────────────────────────────────────────────

test('createAuditEvent: returned object is frozen (append-only guard)', () => {
  const ev = createAuditEvent(baseEvent());
  assert.ok(Object.isFrozen(ev), 'audit events must be immutable');
});

// ─── invariant: result is always a canonical value ───────────────────────────

for (const result of ['success', 'failure', 'denied', 'error']) {
  test(`createAuditEvent: result '${result}' is a valid canonical value`, () => {
    const ev = createAuditEvent(baseEvent({ result, reasonCode: 'test' }));
    assert.ok(VALID_RESULTS.has(ev.result));
  });
}

// ─── reasonCode must always be a non-empty string ────────────────────────────

test('createAuditEvent: reasonCode is always a non-empty string', () => {
  const ev = createAuditEvent(baseEvent());
  assert.ok(typeof ev.reasonCode === 'string' && ev.reasonCode.length > 0, 'reasonCode must be a non-empty string');
});

// ─── Audit separation from telemetry ─────────────────────────────────────────

test('createAuditEvent: event does not contain raw PHI keys', () => {
  // An audit event should never carry first_name, email, password, ssn,
  // phone, or free-text that could contain PHI.
  const phiKeys = ['firstName', 'lastName', 'email', 'password', 'ssn', 'phone', 'note', 'body'];
  const ev = createAuditEvent(baseEvent({ actorId: 'sa-1', actorRole: 'counselor' }));
  for (const key of phiKeys) {
    assert.ok(!(key in ev), `audit event must not contain PHI field: ${key}`);
  }
});
