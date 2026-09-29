import { describe, expect, it } from 'vitest';
import { summarizeBudgetActivity, summarizeIncomeAndExpense, sumAccountBalanceAsOf } from '../src/ledger';
import { advanceOccurrenceCursor } from '../src/scheduled';

describe('summarizeBudgetActivity', () => {
  it('routes category spending/refunds to activity and only real uncategorized inflows to RTA', () => {
    const summary = summarizeBudgetActivity([
      { amountMinor: -500n, categoryId: 'food', isSplit: true, isTransfer: false, isVoided: false },
      { amountMinor: 100n, categoryId: 'food', isSplit: true, isTransfer: false, isVoided: false },
      { amountMinor: 250n, categoryId: null, isSplit: false, isTransfer: false, isVoided: false },
      { amountMinor: 400n, categoryId: null, isSplit: false, isTransfer: true, isVoided: false },
      { amountMinor: 80n, categoryId: null, isSplit: false, isTransfer: false, isVoided: true },
      { amountMinor: 90n, categoryId: null, isSplit: true, isTransfer: false, isVoided: false },
    ]);

    expect(summary.inflowsToRta).toBe(250n);
    expect(summary.activityByCategory.get('food')).toBe(-400n);
  });

  it('returns empty totals for transfers and voided entries only', () => {
    const summary = summarizeBudgetActivity([
      { amountMinor: 100n, categoryId: 'food', isSplit: true, isTransfer: true, isVoided: false },
      { amountMinor: 200n, categoryId: null, isSplit: false, isTransfer: false, isVoided: true },
    ]);

    expect(summary.inflowsToRta).toBe(0n);
    expect(summary.activityByCategory.size).toBe(0);
  });

  it('reports net income after expenses and category refunds without counting transfers or starting balances', () => {
    const summary = summarizeIncomeAndExpense([
      { amountMinor: 1_000n, categoryId: null, isSplit: false, isTransfer: false, isStartingBalance: false, isVoided: false },
      { amountMinor: -700n, categoryId: 'food', isSplit: true, isTransfer: false, isStartingBalance: false, isVoided: false },
      { amountMinor: 200n, categoryId: 'food', isSplit: true, isTransfer: false, isStartingBalance: false, isVoided: false },
      { amountMinor: 400n, categoryId: null, isSplit: false, isTransfer: true, isStartingBalance: false, isVoided: false },
      { amountMinor: 5_000n, categoryId: null, isSplit: false, isTransfer: false, isStartingBalance: true, isVoided: false },
      { amountMinor: 300n, categoryId: null, isSplit: false, isTransfer: false, isStartingBalance: false, isVoided: true },
    ]);

    expect(summary.incomeMinor).toBe(1_000n);
    expect(summary.expenseMinor).toBe(500n);
    expect(summary.netMinor).toBe(500n);
  });

  it('excludes future and voided transactions from an as-of account balance', () => {
    const balance = sumAccountBalanceAsOf([
      { accountId: 'checking', amountMinor: 1_000n, date: new Date('2026-09-28T12:00:00Z'), voidedAt: null },
      { accountId: 'checking', amountMinor: -300n, date: new Date('2026-10-01T12:00:00Z'), voidedAt: null },
      { accountId: 'checking', amountMinor: -200n, date: new Date('2026-09-28T13:00:00Z'), voidedAt: new Date('2026-09-29T10:00:00Z') },
      { accountId: 'savings', amountMinor: 500n, date: new Date('2026-09-28T12:00:00Z'), voidedAt: null },
    ], 'checking', new Date('2026-09-29T00:00:00Z'));

    expect(balance).toBe(1_000n);
  });

  it('does not advance an unposted manual occurrence', () => {
    expect(advanceOccurrenceCursor(null, '2026-09-01', false)).toBeNull();
    expect(advanceOccurrenceCursor('2026-08-01', '2026-09-01', false)).toBe('2026-08-01');
    expect(advanceOccurrenceCursor('2026-08-01', '2026-09-01', true)).toBe('2026-09-01');
    expect(advanceOccurrenceCursor('2026-10-01', '2026-09-01', true)).toBe('2026-10-01');
  });
});