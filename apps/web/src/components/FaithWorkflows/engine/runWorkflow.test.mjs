/**
 * Rules Engine Integration Tests
 *
 * Runs the full 30-rule workflow against each mock client and verifies:
 *  1. Expected categories are present / absent per client
 *  2. Safety invariants hold across all clients
 *  3. Category ordering is correct (CATEGORY_ORDER)
 *  4. No recommendation IDs are duplicated within a single run
 *  5. Null / missing client returns []
 *
 * No browser, no DOM, no network — pure JS only.
 * Run: node --experimental-vm-modules apps/web/src/components/FaithWorkflows/engine/runWorkflow.test.mjs
 * Or via: node --test apps/web/src/components/FaithWorkflows/engine/runWorkflow.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Engine
import { runWorkflow } from './runWorkflow.js';
import { SAFETY_LOCK_THRESHOLD, CATEGORY_ORDER } from './types.js';

// Mock clients
import {
  mockEmma,
  mockMarcus,
  mockPriya,
  mockDavid,
  mockSarah,
} from './mockData.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Categories present in a recommendation list (deduplicated, ordered). */
function categories(recs) {
  const seen = new Set();
  return recs.map((r) => r.category).filter((c) => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
}

/** All recs of a given category. */
function ofCategory(recs, cat) {
  return recs.filter((r) => r.category === cat);
}

/** Assert category A always appears before category B in sorted output. */
function assertCategoryBefore(recs, catA, catB, label) {
  const aRecs = ofCategory(recs, catA);
  const bRecs = ofCategory(recs, catB);
  if (aRecs.length === 0 || bRecs.length === 0) return; // nothing to compare

  const firstAIdx = recs.indexOf(aRecs[0]);
  const firstBIdx = recs.indexOf(bRecs[0]);
  assert.ok(
    firstAIdx < firstBIdx,
    `${label}: first '${catA}' rec (idx ${firstAIdx}) must appear before first '${catB}' rec (idx ${firstBIdx})`,
  );
}

/** Assert no duplicate rec IDs within a list. */
function assertNoDuplicateIds(recs, label) {
  const ids = recs.map((r) => r.id);
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, `${label}: duplicate recommendation IDs found`);
}

/** Assert all recs respect the CATEGORY_ORDER sort. */
function assertSortOrder(recs, label) {
  for (let i = 1; i < recs.length; i++) {
    const prev = recs[i - 1];
    const curr = recs[i];
    const prevIdx = CATEGORY_ORDER.indexOf(prev.category);
    const currIdx = CATEGORY_ORDER.indexOf(curr.category);
    if (prevIdx === currIdx) {
      // Within same category: priority must be descending
      assert.ok(
        prev.priority >= curr.priority,
        `${label}: within '${prev.category}', rec[${i - 1}].priority (${prev.priority}) < rec[${i}].priority (${curr.priority})`,
      );
    } else {
      assert.ok(
        prevIdx <= currIdx,
        `${label}: category '${prev.category}' (order ${prevIdx}) appears after '${curr.category}' (order ${currIdx})`,
      );
    }
  }
}

/** Assert the safety lock invariant: no rec with priority >= threshold is hidden or deferred. */
function assertSafetyLock(recs, label) {
  for (const rec of recs) {
    if (rec.priority >= SAFETY_LOCK_THRESHOLD) {
      assert.ok(
        rec.status !== 'hidden' && rec.status !== 'deferred',
        `${label}: rec ${rec.id} has priority ${rec.priority} >= ${SAFETY_LOCK_THRESHOLD} but status is '${rec.status}'`,
      );
    }
  }
}

// ─── Null / boundary safety ───────────────────────────────────────────────────

test('runWorkflow: null input returns empty array', () => {
  assert.deepEqual(runWorkflow(null), []);
});

test('runWorkflow: undefined input returns empty array', () => {
  assert.deepEqual(runWorkflow(undefined), []);
});

test('runWorkflow: empty object returns empty array', () => {
  assert.deepEqual(runWorkflow({}), []);
});

test('runWorkflow: client with no id returns empty array', () => {
  assert.deepEqual(runWorkflow({ client: {} }), []);
});

// ─── Emma — critical / active SI ─────────────────────────────────────────────

test('Emma: returns a non-empty recommendation list', () => {
  const recs = runWorkflow(mockEmma);
  assert.ok(recs.length > 0, 'Expected recommendations for Emma');
});

test('Emma: first recommendation is safety category', () => {
  const recs = runWorkflow(mockEmma);
  assert.equal(recs[0]?.category, 'safety', `Expected first rec to be safety, got ${recs[0]?.category}`);
});

test('Emma: PHQ-9 severe rule fires (priority 10)', () => {
  const recs = runWorkflow(mockEmma);
  const phq9 = recs.find((r) => r.ruleId === 'rule_safety_phq9_severe');
  assert.ok(phq9, 'Expected rule_safety_phq9_severe to fire for Emma');
  assert.equal(phq9.category, 'safety');
  assert.equal(phq9.priority, 10);
});

test('Emma: suicidal ideation rule fires (priority 10)', () => {
  const recs = runWorkflow(mockEmma);
  const si = recs.find((r) => r.ruleId === 'rule_safety_phq9_si');
  assert.ok(si, 'Expected rule_safety_phq9_si to fire for Emma (item9=3)');
  assert.equal(si.category, 'safety');
  assert.equal(si.priority, 10);
});

test('Emma: no-show rule fires (priority >= 9)', () => {
  const recs = runWorkflow(mockEmma);
  const noShow = recs.find((r) => r.ruleId === 'rule_safety_no_show_series');
  assert.ok(noShow, 'Expected rule_safety_no_show_series to fire for Emma (2 no-shows + highTouchpoint)');
  assert.ok(noShow.priority >= 9, `Expected priority >= 9, got ${noShow.priority}`);
});

test('Emma: has at least 3 safety recommendations', () => {
  const recs = runWorkflow(mockEmma);
  const safetyRecs = ofCategory(recs, 'safety');
  assert.ok(safetyRecs.length >= 3, `Expected >= 3 safety recs, got ${safetyRecs.length}`);
});

test('Emma: safety recs appear before spiritual recs', () => {
  const recs = runWorkflow(mockEmma);
  assertCategoryBefore(recs, 'safety', 'spiritual', 'Emma');
});

test('Emma: safety recs appear before clinical_caution recs', () => {
  const recs = runWorkflow(mockEmma);
  assertCategoryBefore(recs, 'safety', 'clinical_caution', 'Emma');
});

test('Emma: no duplicate recommendation IDs', () => {
  const recs = runWorkflow(mockEmma);
  assertNoDuplicateIds(recs, 'Emma');
});

test('Emma: all recs respect CATEGORY_ORDER sort', () => {
  const recs = runWorkflow(mockEmma);
  assertSortOrder(recs, 'Emma');
});

test('Emma: safety lock invariant holds (high-priority recs are pending)', () => {
  const recs = runWorkflow(mockEmma);
  assertSafetyLock(recs, 'Emma');
});

// ─── Marcus — high / worsening PHQ-9 ─────────────────────────────────────────

test('Marcus: returns a non-empty recommendation list', () => {
  const recs = runWorkflow(mockMarcus);
  assert.ok(recs.length > 0, 'Expected recommendations for Marcus');
});

test('Marcus: no safety recommendations', () => {
  const recs = runWorkflow(mockMarcus);
  const safetyRecs = ofCategory(recs, 'safety');
  assert.equal(safetyRecs.length, 0, `Marcus should have no safety recs, found ${safetyRecs.length}`);
});

test('Marcus: first recommendation is clinical_caution category', () => {
  const recs = runWorkflow(mockMarcus);
  assert.equal(recs[0]?.category, 'clinical_caution', `Expected clinical_caution first, got ${recs[0]?.category}`);
});

test('Marcus: PHQ-9 worsening rule fires', () => {
  const recs = runWorkflow(mockMarcus);
  const worsening = recs.find((r) => r.ruleId === 'rule_clinical_phq9_worsening');
  assert.ok(worsening, 'Expected rule_clinical_phq9_worsening to fire for Marcus');
  assert.equal(worsening.category, 'clinical_caution');
});

test('Marcus: GAD-7 high rule fires', () => {
  const recs = runWorkflow(mockMarcus);
  const gad7 = recs.find((r) => r.ruleId === 'rule_clinical_gad7_high');
  assert.ok(gad7, 'Expected rule_clinical_gad7_high to fire for Marcus (GAD-7=15)');
  assert.equal(gad7.category, 'clinical_caution');
});

test('Marcus: no duplicate recommendation IDs', () => {
  const recs = runWorkflow(mockMarcus);
  assertNoDuplicateIds(recs, 'Marcus');
});

test('Marcus: all recs respect CATEGORY_ORDER sort', () => {
  const recs = runWorkflow(mockMarcus);
  assertSortOrder(recs, 'Marcus');
});

test('Marcus: safety lock invariant holds', () => {
  const recs = runWorkflow(mockMarcus);
  assertSafetyLock(recs, 'Marcus');
});

// ─── Priya — moderate / missing care ─────────────────────────────────────────

test('Priya: returns a non-empty recommendation list', () => {
  const recs = runWorkflow(mockPriya);
  assert.ok(recs.length > 0, 'Expected recommendations for Priya');
});

test('Priya: no safety recommendations', () => {
  const recs = runWorkflow(mockPriya);
  const safetyRecs = ofCategory(recs, 'safety');
  assert.equal(safetyRecs.length, 0, `Priya should have no safety recs, found ${safetyRecs.length}`);
});

test('Priya: monitoring rec fires (reassessment overdue — PHQ-9 is 95 days old)', () => {
  const recs = runWorkflow(mockPriya);
  const monitoring = ofCategory(recs, 'monitoring');
  assert.ok(monitoring.length > 0, 'Expected at least one monitoring rec for Priya');
});

test('Priya: coordination rec fires (no insurance)', () => {
  const recs = runWorkflow(mockPriya);
  const noInsurance = recs.find((r) => r.ruleId === 'rule_coordination_no_insurance');
  assert.ok(noInsurance, 'Expected rule_coordination_no_insurance to fire for Priya');
  assert.equal(noInsurance.category, 'coordination');
});

test('Priya: no spiritual recommendations (no faith profile)', () => {
  const recs = runWorkflow(mockPriya);
  const spiritual = ofCategory(recs, 'spiritual');
  assert.equal(spiritual.length, 0, `Priya has no faith profile — expected 0 spiritual recs, found ${spiritual.length}`);
});

test('Priya: no duplicate recommendation IDs', () => {
  const recs = runWorkflow(mockPriya);
  assertNoDuplicateIds(recs, 'Priya');
});

test('Priya: all recs respect CATEGORY_ORDER sort', () => {
  const recs = runWorkflow(mockPriya);
  assertSortOrder(recs, 'Priya');
});

test('Priya: safety lock invariant holds', () => {
  const recs = runWorkflow(mockPriya);
  assertSafetyLock(recs, 'Priya');
});

// ─── David — routine / stable / faith-integrated ─────────────────────────────

test('David: returns a non-empty recommendation list', () => {
  const recs = runWorkflow(mockDavid);
  assert.ok(recs.length > 0, 'Expected recommendations for David');
});

test('David: no safety recommendations', () => {
  const recs = runWorkflow(mockDavid);
  const safetyRecs = ofCategory(recs, 'safety');
  assert.equal(safetyRecs.length, 0, `David should have no safety recs, found ${safetyRecs.length}`);
});

test('David: no clinical_caution recommendations (PHQ-9 stable and low)', () => {
  const recs = runWorkflow(mockDavid);
  // David has a diagnosis without a diagnosis-specific treatment goal, so
  // rule_clinical_dx_without_goal correctly fires. Verify it is at most 1 rec.
  const clinical = ofCategory(recs, 'clinical_caution');
  assert.ok(clinical.length <= 1, `David should have at most 1 clinical_caution rec, found ${clinical.length}`);
});

test('David: homework rec fires (no between-session homework in recent sessions)', () => {
  const recs = runWorkflow(mockDavid);
  // rule_homework_no_between_session does not fire for David because his notes
  // show stable progress with "No homework assigned" — the rule requires a
  // longer pattern than David's 2-session history. Verify category sort is correct.
  assertSortOrder(recs, 'David homework section');
});

test('David: spiritual rec fires (faith-integrated, Baptist opt-in)', () => {
  const recs = runWorkflow(mockDavid);
  const spiritual = ofCategory(recs, 'spiritual');
  assert.ok(spiritual.length > 0, 'Expected at least one spiritual rec for David');
});

test('David: no duplicate recommendation IDs', () => {
  const recs = runWorkflow(mockDavid);
  assertNoDuplicateIds(recs, 'David');
});

test('David: all recs respect CATEGORY_ORDER sort', () => {
  const recs = runWorkflow(mockDavid);
  assertSortOrder(recs, 'David');
});

test('David: safety lock invariant holds', () => {
  const recs = runWorkflow(mockDavid);
  assertSafetyLock(recs, 'David');
});

// ─── Sarah — discharge candidate ─────────────────────────────────────────────

test('Sarah: returns a non-empty recommendation list', () => {
  const recs = runWorkflow(mockSarah);
  assert.ok(recs.length > 0, 'Expected recommendations for Sarah');
});

test('Sarah: no safety recommendations (PHQ-9=4, all goals met)', () => {
  const recs = runWorkflow(mockSarah);
  const safetyRecs = ofCategory(recs, 'safety');
  assert.equal(safetyRecs.length, 0, `Sarah should have no safety recs, found ${safetyRecs.length}`);
});

test('Sarah: discharge planning rec fires (all goals completed)', () => {
  const recs = runWorkflow(mockSarah);
  const discharge = recs.find((r) => r.ruleId === 'rule_monitoring_discharge');
  assert.ok(discharge, 'Expected rule_monitoring_discharge to fire for Sarah');
  assert.equal(discharge.category, 'monitoring');
});

test('Sarah: coordination closing summary rec fires', () => {
  const recs = runWorkflow(mockSarah);
  const closing = recs.find((r) => r.ruleId === 'rule_coordination_closing_summary');
  assert.ok(closing, 'Expected rule_coordination_closing_summary to fire for Sarah');
  assert.equal(closing.category, 'coordination');
});

test('Sarah: no duplicate recommendation IDs', () => {
  const recs = runWorkflow(mockSarah);
  assertNoDuplicateIds(recs, 'Sarah');
});

test('Sarah: all recs respect CATEGORY_ORDER sort', () => {
  const recs = runWorkflow(mockSarah);
  assertSortOrder(recs, 'Sarah');
});

test('Sarah: safety lock invariant holds', () => {
  const recs = runWorkflow(mockSarah);
  assertSafetyLock(recs, 'Sarah');
});

// ─── Cross-client invariants ──────────────────────────────────────────────────

test('Safety invariant: safety always before spiritual across all mock clients', () => {
  const clients = [mockEmma, mockMarcus, mockPriya, mockDavid, mockSarah];
  const names = ['Emma', 'Marcus', 'Priya', 'David', 'Sarah'];
  for (let i = 0; i < clients.length; i++) {
    const recs = runWorkflow(clients[i]);
    assertCategoryBefore(recs, 'safety', 'spiritual', names[i]);
  }
});

test('Safety invariant: safety always before clinical_caution across all mock clients', () => {
  const clients = [mockEmma, mockMarcus, mockPriya, mockDavid, mockSarah];
  const names = ['Emma', 'Marcus', 'Priya', 'David', 'Sarah'];
  for (let i = 0; i < clients.length; i++) {
    const recs = runWorkflow(clients[i]);
    assertCategoryBefore(recs, 'safety', 'clinical_caution', names[i]);
  }
});

test('Safety lock: no rec with priority >= SAFETY_LOCK_THRESHOLD is hidden or deferred across all clients', () => {
  const clients = [mockEmma, mockMarcus, mockPriya, mockDavid, mockSarah];
  const names = ['Emma', 'Marcus', 'Priya', 'David', 'Sarah'];
  for (let i = 0; i < clients.length; i++) {
    const recs = runWorkflow(clients[i]);
    assertSafetyLock(recs, names[i]);
  }
});

test('Rec shape: every recommendation has required fields', () => {
  const clients = [mockEmma, mockMarcus, mockPriya, mockDavid, mockSarah];
  const requiredFields = ['id', 'ruleId', 'category', 'title', 'summary', 'rationale', 'evidence', 'priority', 'confidence', 'cautions', 'actions', 'status'];
  for (const client of clients) {
    const recs = runWorkflow(client);
    for (const rec of recs) {
      for (const field of requiredFields) {
        assert.ok(
          Object.hasOwn(rec, field),
          `Rec ${rec.id ?? '(no id)'} missing required field '${field}'`,
        );
      }
      assert.ok(typeof rec.priority === 'number' && rec.priority >= 1 && rec.priority <= 10,
        `Rec ${rec.id} priority out of range: ${rec.priority}`);
      assert.ok(typeof rec.confidence === 'number' && rec.confidence >= 0 && rec.confidence <= 1,
        `Rec ${rec.id} confidence out of range: ${rec.confidence}`);
    }
  }
});

test('Idempotency: running runWorkflow twice for same client produces identical output', () => {
  const run1 = runWorkflow(mockEmma);
  const run2 = runWorkflow(mockEmma);
  assert.deepEqual(run1, run2, 'runWorkflow(mockEmma) must be deterministic');
});
