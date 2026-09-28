import { describe, it, expect } from 'vitest';
import { calculateMonthState, MonthInput } from '../src/engine';

describe('Budget Engine - calculateMonthState', () => {
  it('calculates category available correctly (I4)', () => {
    const input: MonthInput = {
      previousRTA: 1000n,
      inflowsToRTA: 0n,
      categories: [
        {
          categoryId: 'cat-1',
          previousAvailable: 500n, // Rolled over from last month
          assigned: 200n,
          activity: -150n, // Spent 150
        }
      ]
    };

    const result = calculateMonthState(input);
    // 500 + 200 - 150 = 550
    expect(result.categories[0].available).toBe(550n);
    expect(result.rta).toBe(800n); // 1000 - 200 assigned
  });

  it('calculates RTA correctly with inflows (I5)', () => {
    const input: MonthInput = {
      previousRTA: 100n,
      inflowsToRTA: 2000n, // Got paid 2000
      categories: [
        {
          categoryId: 'cat-1',
          previousAvailable: 0n,
          assigned: 1500n,
          activity: 0n,
        }
      ]
    };

    const result = calculateMonthState(input);
    // 100 + 2000 - 1500 = 600
    expect(result.rta).toBe(600n);
  });

  it('handles cash overspending rollover correctly', () => {
    const input: MonthInput = {
      previousRTA: 500n,
      inflowsToRTA: 0n,
      categories: [
        {
          categoryId: 'cat-1',
          previousAvailable: -200n, // Overspent 200 last month
          assigned: 100n,
          activity: 0n,
        }
      ]
    };

    const result = calculateMonthState(input);
    
    // The previous negative balance (-200) is covered by this month's RTA.
    // So RTA = 500 (prev) - 100 (assigned) - 200 (cover overspending) = 200.
    expect(result.rta).toBe(200n);
    expect(result.overspentFromPreviousMonth).toBe(-200n);
    
    // The category's available balance is reset from the negative, so it's just the new assigned.
    // (It doesn't start at -200, because the -200 was absorbed by RTA).
    expect(result.categories[0].available).toBe(100n);
  });
});
