import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeTenantProvisioningStatus,
  canTransitionTenantProvisioningStatus,
  isProvisionedTenantStatus,
} from '../src/lib/tenant-provisioning.js';

test('normalizeTenantProvisioningStatus accepts canonical values', () => {
  assert.equal(normalizeTenantProvisioningStatus('queued'), 'queued');
  assert.equal(normalizeTenantProvisioningStatus('in_progress'), 'in_progress');
  assert.equal(normalizeTenantProvisioningStatus('completed'), 'completed');
  assert.equal(normalizeTenantProvisioningStatus('failed'), 'failed');
});

test('normalizeTenantProvisioningStatus rejects invalid values', () => {
  assert.equal(normalizeTenantProvisioningStatus('active'), null);
  assert.equal(normalizeTenantProvisioningStatus('cancelled'), null);
  assert.equal(normalizeTenantProvisioningStatus(undefined), null);
});

test('canTransitionTenantProvisioningStatus enforces lifecycle transitions', () => {
  assert.equal(canTransitionTenantProvisioningStatus('queued', 'in_progress'), true);
  assert.equal(canTransitionTenantProvisioningStatus('in_progress', 'completed'), true);
  assert.equal(canTransitionTenantProvisioningStatus('failed', 'queued'), true);

  assert.equal(canTransitionTenantProvisioningStatus('completed', 'in_progress'), false);
  assert.equal(canTransitionTenantProvisioningStatus('queued', 'completed'), false);
  assert.equal(canTransitionTenantProvisioningStatus('in_progress', 'queued'), false);
});

test('canTransitionTenantProvisioningStatus allows idempotent same-state updates', () => {
  assert.equal(canTransitionTenantProvisioningStatus('queued', 'queued'), true);
  assert.equal(canTransitionTenantProvisioningStatus('completed', 'completed'), true);
});

test('isProvisionedTenantStatus returns true only for completed', () => {
  assert.equal(isProvisionedTenantStatus('completed'), true);
  assert.equal(isProvisionedTenantStatus('queued'), false);
  assert.equal(isProvisionedTenantStatus('in_progress'), false);
  assert.equal(isProvisionedTenantStatus('failed'), false);
});
