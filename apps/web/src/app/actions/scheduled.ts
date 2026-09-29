'use server';

import { db } from '@bolsilludo/db';
import { scheduledTransactions, transactions, transactionSplits } from '@bolsilludo/db';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { calculateDueOccurrences, nextOccurrence } from '@bolsilludo/budget-engine';
import type { ScheduledFrequency } from '@bolsilludo/budget-engine';

export async function getScheduledTransactions(budgetId: string) {
  const list = await db.select()
    .from(scheduledTransactions)
    .where(and(
      eq(scheduledTransactions.budgetId, budgetId),
      eq(scheduledTransactions.status, 'ACTIVE')
    ));
    
  return list;
}

export async function createScheduledTransaction(formData: FormData) {
  const budgetId = formData.get('budgetId') as string;
  const accountId = formData.get('accountId') as string;
  const payeeName = formData.get('payeeName') as string; // Optional if we resolve or ignore
  const categoryId = formData.get('categoryId') as string || null;
  const amountStr = formData.get('amount') as string;
  const frequencyType = formData.get('frequencyType') as ScheduledFrequency;
  const startAt = formData.get('startAt') as string;
  const autoPost = formData.get('autoPost') === 'true';

  let amountMinor = 0n;
  try {
    amountMinor = BigInt(Math.round(parseFloat(amountStr) * 100));
  } catch {}

  // P2: Need to link to actual payee, skipped for MVP as payeeId is optional
  
  await db.insert(scheduledTransactions).values({
    budgetId,
    accountId,
    categoryId,
    amountMinor,
    currency: 'BOB',
    frequencyType,
    startAt,
    autoPost,
    memo: payeeName, // storing payee in memo since payeeId requires payee lookup
  });
  
  revalidatePath('/dashboard');
}

export async function processDueScheduled(budgetId: string) {
  // Get today's date in budget timezone (using UTC for simplicity in MVP)
  const todayStr = new Date().toISOString().split('T')[0];

  const activeSchedules = await db.select()
    .from(scheduledTransactions)
    .where(and(
      eq(scheduledTransactions.budgetId, budgetId),
      eq(scheduledTransactions.status, 'ACTIVE')
    ));

  for (const schedule of activeSchedules) {
    const dueDates = calculateDueOccurrences({
      id: schedule.id,
      startAt: schedule.startAt,
      endAt: schedule.endAt,
      frequencyType: schedule.frequencyType as ScheduledFrequency,
      lastOccurrenceAt: schedule.lastOccurrenceAt,
    }, todayStr);

    for (const date of dueDates) {
      try {
        await db.transaction(async (tx) => {
          // Check for existing transaction to be idempotent (BR-SCH-020)
          const existing = await tx.select({ id: transactions.id })
            .from(transactions)
            .where(and(
              eq(transactions.scheduledId, schedule.id),
              eq(transactions.occurrenceDate, date)
            ));

          if (existing.length === 0) {
            // Determine status based on autoPost (BR-SCH-030)
            // auto_post=true -> status='pending' (unapproved in UI)
            // auto_post=false -> We might not create a transaction yet, but just show in "Próximos". 
            // Wait, spec says: if auto_post=false, it doesn't create a tx until user registers it.
            // If it's true, it creates it with 'pending'.
            if (schedule.autoPost) {
              const [newTx] = await tx.insert(transactions).values({
                budgetId: schedule.budgetId,
                accountId: schedule.accountId,
                date: new Date(date),
                amountMinor: schedule.amountMinor,
                payeeName: schedule.memo,
                memo: schedule.memo,
                scheduledId: schedule.id,
                occurrenceDate: date,
                status: 'pending' // pending approval
              }).returning();
              // If category set, insert a split
              if (schedule.categoryId && newTx) {
                await tx.insert(transactionSplits).values({
                  transactionId: newTx.id,
                  categoryId: schedule.categoryId,
                  amountMinor: schedule.amountMinor,
                });
              }
            }
          }

          // Update last occurrence if date is greater
          if (!schedule.lastOccurrenceAt || new Date(date) > new Date(schedule.lastOccurrenceAt)) {
            await tx.update(scheduledTransactions)
              .set({ lastOccurrenceAt: date })
              .where(eq(scheduledTransactions.id, schedule.id));
          }
        });
      } catch (err) {
        console.error(`Error processing schedule ${schedule.id} for date ${date}`, err);
      }
    }
  }
}

export async function postOccurrence(scheduleId: string, occurrenceDate: string) {
  // Manual posting of an occurrence that was autoPost=false
  await db.transaction(async (tx) => {
    const [schedule] = await tx.select().from(scheduledTransactions).where(eq(scheduledTransactions.id, scheduleId));
    if (!schedule) throw new Error('Schedule not found');

    const existing = await tx.select({ id: transactions.id })
      .from(transactions)
      .where(and(
        eq(transactions.scheduledId, schedule.id),
        eq(transactions.occurrenceDate, occurrenceDate)
      ));

    if (existing.length === 0) {
      const [newTx] = await tx.insert(transactions).values({
        budgetId: schedule.budgetId,
        accountId: schedule.accountId,
        date: new Date(occurrenceDate),
        amountMinor: schedule.amountMinor,
        payeeName: schedule.memo,
        memo: schedule.memo,
        scheduledId: schedule.id,
        occurrenceDate: occurrenceDate,
        status: 'cleared'
      }).returning();
      // If category set, insert a split
      if (schedule.categoryId && newTx) {
        await tx.insert(transactionSplits).values({
          transactionId: newTx.id,
          categoryId: schedule.categoryId,
          amountMinor: schedule.amountMinor,
        });
      }
      
      // Update last occurrence
      if (!schedule.lastOccurrenceAt || new Date(occurrenceDate) > new Date(schedule.lastOccurrenceAt)) {
        await tx.update(scheduledTransactions)
          .set({ lastOccurrenceAt: occurrenceDate })
          .where(eq(scheduledTransactions.id, schedule.id));
      }
    }
  });
  
  revalidatePath('/dashboard');
}
