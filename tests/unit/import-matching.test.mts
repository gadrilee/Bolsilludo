import assert from 'node:assert/strict';
import test from 'node:test';
import { matchTransaction } from '../../apps/web/src/lib/imports/matching.ts';

test('ambiguous 0.75 match requires manual review', () => {
  const result = matchTransaction({
    externalId: 'bank-1',
    rawDescription: 'Different merchant',
    amountMinor: -12_500n,
    currency: 'BOB',
    postedDate: '2026-09-01',
    pending: false,
    rowIndex: 0,
  }, [{
    id: 'existing-1',
    externalId: 'bank-1',
    amountMinor: -12_500n,
    date: new Date('2026-09-06T12:00:00Z'),
    payeeName: 'Other merchant',
  }]);

  assert.equal(result.matchScore, 750);
  assert.equal(result.decision, 'NEEDS_REVIEW');
  assert.equal(result.matchedTransactionId, 'existing-1');
});