import { add, subtract } from '@bolsilludo/money';

export interface CategoryState {
  categoryId: string;
  assigned: bigint;
  activity: bigint;
  available: bigint;
}

export interface MonthInput {
  previousRTA: bigint;
  inflowsToRTA: bigint;
  categories: {
    categoryId: string;
    previousAvailable: bigint;
    assigned: bigint;
    activity: bigint; // Spending is usually negative
  }[];
}

export interface MonthOutput {
  rta: bigint;
  overspentFromPreviousMonth: bigint;
  categories: CategoryState[];
}

/**
 * Pure function to calculate the budget state for a single month.
 * Implements Constitution P5 (Deterministic Engine) and Invariants I4, I5.
 */
export function calculateMonthState(input: MonthInput): MonthOutput {
  let rta = add(input.previousRTA, input.inflowsToRTA);
  let overspentFromPreviousMonth = 0n;
  const categories: CategoryState[] = [];

  for (const catInput of input.categories) {
    // I4: Category available = prev_available + assigned + activity
    // Note: activity is expected to be negative for outflows.
    let available = add(add(catInput.previousAvailable, catInput.assigned), catInput.activity);

    // Handle negative rollover (Cash overspending reduces next month's RTA)
    // For MVP, all negative balances are treated as cash overspending and covered by RTA
    // in the following month. We subtract it from the *current* month's RTA representation
    // if we are processing a chain, but strictly speaking, if a previous month ended negative, 
    // it reduces THIS month's starting RTA.
    if (catInput.previousAvailable < 0n) {
      overspentFromPreviousMonth = add(overspentFromPreviousMonth, catInput.previousAvailable);
      // Reset the negative carryover so it doesn't double-penalize the category itself
      available = subtract(available, catInput.previousAvailable); 
    }

    // I5: RTA = total_cash - assigned
    rta = subtract(rta, catInput.assigned);

    categories.push({
      categoryId: catInput.categoryId,
      assigned: catInput.assigned,
      activity: catInput.activity,
      available,
    });
  }

  // Deduct previous month's overspending from this month's RTA
  rta = add(rta, overspentFromPreviousMonth);

  return {
    rta,
    overspentFromPreviousMonth,
    categories,
  };
}
