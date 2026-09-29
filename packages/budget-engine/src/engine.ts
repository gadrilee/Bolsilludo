import { add, subtract } from '@bolsilludo/money';
import { type GoalDefinition, type GoalResultDTO, calculateGoalRequirement } from './goals';

export interface CategoryState {
  categoryId: string;
  assigned: bigint;
  activity: bigint;
  available: bigint;
  goalResult: GoalResultDTO | null;
}

export interface MonthInput {
  month: string; // YYYY-MM
  previousRTA: bigint;
  inflowsToRTA: bigint;
  categories: {
    categoryId: string;
    previousAvailable: bigint;
    assigned: bigint;
    activity: bigint; // Spending is usually negative
    goal?: GoalDefinition | null;
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
    if (catInput.previousAvailable < 0n) {
      overspentFromPreviousMonth = add(overspentFromPreviousMonth, catInput.previousAvailable);
      // Reset the negative carryover so it doesn't double-penalize the category itself
      available = subtract(available, catInput.previousAvailable); 
    }

    // I5: RTA = total_cash - assigned
    rta = subtract(rta, catInput.assigned);

    // Calculate goal
    let goalResult: GoalResultDTO | null = null;
    if (catInput.goal) {
      goalResult = calculateGoalRequirement(
        catInput.goal,
        input.month,
        catInput.assigned,
        catInput.previousAvailable
      );
    }

    categories.push({
      categoryId: catInput.categoryId,
      assigned: catInput.assigned,
      activity: catInput.activity,
      available,
      goalResult,
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
