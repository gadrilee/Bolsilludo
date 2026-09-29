// budget-engine/src/goals.ts

type Money = bigint;

export type GoalDefinition = {
  id: string;
  categoryId: string;
  cadence: 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  behavior: 'SET_ASIDE' | 'REFILL_UP_TO' | 'HAVE_A_BALANCE';
  amountMinor: Money;
  startDate?: string | null; // YYYY-MM-DD
  dueDate?: string | null; // YYYY-MM-DD
  repeatEnabled?: boolean;
  repeatInterval?: number | null;
  repeatUnit?: 'WEEK' | 'MONTH' | 'YEAR' | null;
  weekStartDay?: number | null; // 0-6
  snoozedMonth?: string | null; // YYYY-MM
};

export type GoalResultDTO = {
  targetAmount: Money; 
  assignedInPeriod: Money; 
  available: Money;
  requiredThisMonth: Money; 
  remaining: Money; 
  progressRatio: number;
  status: 'FUNDED' | 'UNDERFUNDED' | 'OVERFUNDED' | 'SNOOZED' | 'COMPLETED' | 'NO_TARGET';
  dueDate: string | null; 
  daysRemaining: number | null;
  progressParts: { rollover: Money; currentAssigned: Money; needed: Money; overspent: Money };
  explanation: { label: string; amount: Money }[];
};

/**
 * Calculates the number of times a specific day of the week occurs in a given month.
 */
export function calculateWeeklyOccurrences(year: number, month: number, targetDayOfWeek: number): number {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month - 1, i);
    if (d.getDay() === targetDayOfWeek) count++;
  }
  return count;
}

export function calculateGoalRequirement(
  goal: GoalDefinition,
  month: string, // YYYY-MM
  assignedThisMonth: Money,
  availableSoFar: Money // The available amount BEFORE this month's assigned/activity
): GoalResultDTO {
  const isSnoozed = goal.snoozedMonth === month;
  
  if (isSnoozed) {
    return {
      targetAmount: goal.amountMinor,
      assignedInPeriod: assignedThisMonth,
      available: availableSoFar + assignedThisMonth,
      requiredThisMonth: 0n,
      remaining: 0n,
      progressRatio: 0,
      status: 'SNOOZED',
      dueDate: goal.dueDate || null,
      daysRemaining: null,
      progressParts: { rollover: 0n, currentAssigned: 0n, needed: 0n, overspent: 0n },
      explanation: [{ label: 'Pospuesta', amount: 0n }]
    };
  }

  const [yearStr, monthStr] = month.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);

  let targetAmount = goal.amountMinor;
  let requiredThisMonth = 0n;
  let explanation: { label: string; amount: Money }[] = [];

  if (goal.cadence === 'MONTHLY') {
    if (goal.behavior === 'SET_ASIDE') {
      requiredThisMonth = goal.amountMinor;
      explanation.push({ label: 'Meta mensual (Set aside)', amount: requiredThisMonth });
    } else if (goal.behavior === 'REFILL_UP_TO') {
      // Refill considers previous available.
      // If availableSoFar > 0, we only need to refill the difference.
      const neededToRefill = goal.amountMinor - availableSoFar;
      requiredThisMonth = neededToRefill > 0n ? neededToRefill : 0n;
      explanation.push({ label: 'Meta mensual (Refill)', amount: goal.amountMinor });
      if (availableSoFar > 0n) {
        explanation.push({ label: 'Arrastre del mes anterior', amount: -availableSoFar });
      }
    }
  } else if (goal.cadence === 'WEEKLY') {
    const dayOfWeek = goal.weekStartDay ?? 0;
    const occurrences = calculateWeeklyOccurrences(y, m, dayOfWeek);
    targetAmount = goal.amountMinor * BigInt(occurrences);
    requiredThisMonth = targetAmount;
    explanation.push({ label: `Meta semanal (${occurrences} semanas x ${goal.amountMinor / 100n})`, amount: requiredThisMonth });
  } else if (goal.cadence === 'YEARLY' || goal.cadence === 'CUSTOM') {
    // Basic approximation for now, to be extended with full pacing logic.
    requiredThisMonth = goal.amountMinor;
    explanation.push({ label: 'Meta a largo plazo', amount: requiredThisMonth });
  }

  // Calculate progress and remaining
  const remaining = requiredThisMonth - assignedThisMonth;
  const currentAvailable = availableSoFar + assignedThisMonth;
  
  let status: GoalResultDTO['status'] = 'UNDERFUNDED';
  if (remaining <= 0n) status = 'FUNDED';
  
  // Overspent check
  const overspent = currentAvailable < 0n ? -currentAvailable : 0n;
  if (overspent > 0n) {
    // If there's overspending, we actually need to cover that first!
    status = 'UNDERFUNDED';
  }

  const actualNeededThisMonth = requiredThisMonth > 0n ? requiredThisMonth : 0n;
  const totalNeededWithOverspent = actualNeededThisMonth + overspent;
  const actualRemaining = totalNeededWithOverspent - assignedThisMonth;

  let progressRatio = 0;
  if (totalNeededWithOverspent > 0n) {
    const progress = Number(assignedThisMonth) / Number(totalNeededWithOverspent);
    progressRatio = Math.max(0, Math.min(1, progress));
  } else if (actualRemaining <= 0n) {
    progressRatio = 1;
  }

  // Progress Parts for the UI bar
  const rollover = availableSoFar > 0n ? availableSoFar : 0n;
  
  return {
    targetAmount,
    assignedInPeriod: assignedThisMonth,
    available: currentAvailable,
    requiredThisMonth: totalNeededWithOverspent,
    remaining: actualRemaining > 0n ? actualRemaining : 0n,
    progressRatio,
    status,
    dueDate: goal.dueDate || null,
    daysRemaining: null,
    progressParts: {
      rollover,
      currentAssigned: assignedThisMonth > 0n ? assignedThisMonth : 0n,
      needed: actualRemaining > 0n ? actualRemaining : 0n,
      overspent
    },
    explanation
  };
}
