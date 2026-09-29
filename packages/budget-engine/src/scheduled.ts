// budget-engine/src/scheduled.ts

export type ScheduledFrequency = 'ONCE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export type ScheduledTransactionDef = {
  id: string;
  startAt: string; // YYYY-MM-DD
  endAt?: string | null;
  frequencyType: ScheduledFrequency;
  lastOccurrenceAt?: string | null;
};

/**
 * Parses YYYY-MM-DD string to UTC Date at 00:00:00
 */
function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-');
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getNextDate(current: Date, anchor: Date, frequency: ScheduledFrequency, iterations: number = 1): Date {
  const next = new Date(current.getTime());
  
  if (frequency === 'WEEKLY') {
    next.setUTCDate(next.getUTCDate() + (7 * iterations));
  } else if (frequency === 'BIWEEKLY') {
    next.setUTCDate(next.getUTCDate() + (14 * iterations));
  } else if (frequency === 'MONTHLY') {
    // BR-SCH-010: Anchor logic to prevent drift (e.g. Jan 31 -> Feb 28 -> Mar 31)
    const anchorDay = anchor.getUTCDate();
    next.setUTCMonth(next.getUTCMonth() + iterations);
    
    // Check if the current month has the anchor day
    // e.g. If anchor is 31, and next month is Feb, it should cap at 28/29
    const expectedMonth = next.getUTCMonth();
    next.setUTCDate(anchorDay);
    
    // If setting the date pushed it to the next month, revert back to the last day of the intended month
    if (next.getUTCMonth() !== expectedMonth) {
      next.setUTCDate(0);
    }
  } else if (frequency === 'YEARLY') {
    next.setUTCFullYear(next.getUTCFullYear() + iterations);
  }
  
  return next;
}

/**
 * calculateDueOccurrences evaluates which dates are due for a scheduled transaction.
 * BR-SCH-011: Returns all missing occurrences since lastOccurrenceAt up to today.
 * BR-SCH-010: Uses startAt as the anchor for monthly logic.
 */
export function calculateDueOccurrences(
  schedule: ScheduledTransactionDef, 
  todayStr: string // YYYY-MM-DD (resolved in budget timezone)
): string[] {
  const dueDates: string[] = [];
  const start = parseDateString(schedule.startAt);
  const today = parseDateString(todayStr);
  
  if (schedule.frequencyType === 'ONCE') {
    if (!schedule.lastOccurrenceAt && start.getTime() <= today.getTime()) {
      return [schedule.startAt];
    }
    return [];
  }

  // Determine starting point (either the next date after the last occurrence, or the start date)
  let current = schedule.lastOccurrenceAt 
    ? getNextDate(parseDateString(schedule.lastOccurrenceAt), start, schedule.frequencyType) 
    : start;
    
  const end = schedule.endAt ? parseDateString(schedule.endAt) : null;

  while (current.getTime() <= today.getTime()) {
    if (end && current.getTime() > end.getTime()) {
      break;
    }
    dueDates.push(formatDateString(current));
    current = getNextDate(current, start, schedule.frequencyType);
  }

  return dueDates;
}

/**
 * nextOccurrence predicts the very next date for UI display.
 */
export function nextOccurrence(
  schedule: ScheduledTransactionDef, 
  todayStr: string
): string | null {
  const dueDates = calculateDueOccurrences(schedule, todayStr);
  if (dueDates.length > 0) return dueDates[0];
  
  const start = parseDateString(schedule.startAt);
  const today = parseDateString(todayStr);
  
  if (schedule.frequencyType === 'ONCE') {
    return start.getTime() > today.getTime() ? schedule.startAt : null;
  }
  
  let current = schedule.lastOccurrenceAt 
    ? getNextDate(parseDateString(schedule.lastOccurrenceAt), start, schedule.frequencyType) 
    : start;

  while (current.getTime() <= today.getTime()) {
    current = getNextDate(current, start, schedule.frequencyType);
  }
  
  const end = schedule.endAt ? parseDateString(schedule.endAt) : null;
  if (end && current.getTime() > end.getTime()) return null;

  return formatDateString(current);
}
