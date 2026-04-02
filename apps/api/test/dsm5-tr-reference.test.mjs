import test from 'node:test';
import assert from 'node:assert/strict';
import { getDsm5TrReferenceIndex, searchDsm5TrDiagnoses } from '../src/lib/dsm5-tr-reference.js';

test('DSM-5-TR reference index parses alphabetical diagnosis entries', async () => {
  const reference = await getDsm5TrReferenceIndex();

  assert.ok(reference.itemCount > 500, 'expected a substantial DSM-5-TR reference index');
  assert.ok(reference.items.some((item) => item.code === 'F43.22' && /Adjustment disorders/i.test(item.description)));
  assert.ok(reference.items.some((item) => item.code === 'Z72.811' && item.description === 'Adult antisocial behavior'));
});

test('DSM-5-TR search returns expected code and description matches', async () => {
  const codeMatches = await searchDsm5TrDiagnoses('F43.22', { limit: 5 });
  assert.equal(codeMatches[0]?.code, 'F43.22');
  assert.match(codeMatches[0]?.description ?? '', /Adjustment disorders/i);

  const textMatches = await searchDsm5TrDiagnoses('prolonged grief disorder', { limit: 10 });
  assert.ok(textMatches.some((item) => /prolonged grief disorder/i.test(item.description)));
});
