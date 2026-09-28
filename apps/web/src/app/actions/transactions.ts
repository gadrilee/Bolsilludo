'use server';

import { db, transactions, transactionSplits, payees } from '@bolsilludo/db';
import { eq, desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const budgetId = formData.get('budgetId') as string;
  const accountId = formData.get('accountId') as string;
  const amountStr = formData.get('amount') as string;
  const payeeName = formData.get('payeeName') as string;
  const memo = formData.get('memo') as string;
  const dateStr = formData.get('date') as string;
  const categoryId = formData.get('categoryId') as string | null;

  if (!budgetId || !accountId || !amountStr || !dateStr) {
    throw new Error("Missing required transaction fields");
  }

  const amountMinor = BigInt(amountStr);
  const date = new Date(dateStr);

  // Simple transaction insertion (no split support for MVP here)
  const [newTx] = await db.insert(transactions).values({
    budgetId,
    accountId,
    amountMinor,
    date,
    payeeName,
    memo,
    status: 'cleared',
  }).returning();

  // Create split if category is provided
  if (categoryId) {
    await db.insert(transactionSplits).values({
      transactionId: newTx.id,
      categoryId,
      amountMinor,
    });
  }

  revalidatePath('/dashboard');
  return { success: true, transactionId: newTx.id };
}

export async function getTransactions(budgetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // MVP: Fetch transactions without splits for now
  const budgetTransactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.budgetId, budgetId))
    .orderBy(desc(transactions.date));

  return budgetTransactions;
}
