'use server';

import { db, transactions, transactionSplits, payees, accounts, categories } from '@bolsilludo/db';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { computeCreditCardStatus, type CreditCardInspector } from '@bolsilludo/budget-engine';

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

  const [newTx] = await db.insert(transactions).values({
    budgetId,
    accountId,
    amountMinor,
    date,
    payeeName,
    memo,
    status: 'cleared',
  }).returning();

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

/**
 * BR-CC-020: A payment to a credit card is a transfer (two-sided entry).
 * - From account (checking/savings): negative amount
 * - To card account: positive amount (debt reduction)
 * - Payment category: NOT categorized as expense (BR-CC-001)
 */
export async function transferMoney(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const budgetId = formData.get('budgetId') as string;
  const fromAccountId = formData.get('fromAccountId') as string;
  const toAccountId = formData.get('toAccountId') as string;
  const amountStr = formData.get('amount') as string;
  const dateStr = formData.get('date') as string;
  const memo = formData.get('memo') as string | null;

  if (!budgetId || !fromAccountId || !toAccountId || !amountStr) {
    throw new Error("Missing required transfer fields");
  }

  const amountMinor = BigInt(Math.round(Number(amountStr) * 100));
  const date = dateStr ? new Date(dateStr) : new Date();

  // Check if destination is a credit card (to determine transaction semantics)
  const [toAccount] = await db.select().from(accounts).where(eq(accounts.id, toAccountId));
  const isCreditCardPayment = toAccount?.type === 'credit_card';

  // Entry on the SOURCE account (money leaves)
  await db.insert(transactions).values({
    budgetId,
    accountId: fromAccountId,
    amountMinor: -amountMinor,
    date,
    payeeName: isCreditCardPayment ? `Pago tarjeta: ${toAccount.name}` : 'Transfer',
    memo: memo ?? undefined,
    status: 'cleared',
  });

  // Entry on the DESTINATION account (money arrives / debt reduced)
  await db.insert(transactions).values({
    budgetId,
    accountId: toAccountId,
    amountMinor: amountMinor, // Positive = debt reduction for card
    date,
    payeeName: isCreditCardPayment ? 'Pago recibido' : 'Transfer',
    memo: memo ?? undefined,
    status: 'cleared',
  });

  // BR-CC-001: Payment to card is NOT recorded as a category expense.
  // The payment category's "available" balance is managed by the engine,
  // not by creating a split here.

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getTransactions(budgetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.budgetId, budgetId))
    .orderBy(desc(transactions.date));
}

/**
 * Computes the CreditCardStatusDTO for a credit card account for the given month.
 * Uses pure engine functions — no UI calculation (BR-CC-070).
 */
export async function getCreditCardStatus(accountId: string, month: string, budgetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get all transactions for this card account
  const cardTxs = await db
    .select()
    .from(transactions)
    .where(and(
      eq(transactions.budgetId, budgetId),
      eq(transactions.accountId, accountId),
    ));

  // Compute working balance
  const workingBalance = cardTxs.reduce((sum, tx) => sum + BigInt(tx.amountMinor), 0n);

  // Classify transactions for the inspector
  let purchases = 0n;
  let refunds = 0n;
  let payments = 0n;
  for (const tx of cardTxs) {
    const amt = BigInt(tx.amountMinor);
    if (amt < 0n) purchases += -amt;      // Debt-creating
    else if (tx.payeeName === 'Pago recibido') payments += amt; // Payment received
    else refunds += amt;                   // Refunds
  }

  const inspector: CreditCardInspector = {
    purchases,
    refunds,
    payments,
    creditOverspending: 0n, // TODO: compute from splits
    cashOverspending: 0n,
  };

  // Find the payment category linked to this card
  const [paymentCategory] = await db
    .select()
    .from(categories)
    .where(eq(categories.linkedAccountId, accountId));

  // Get allocations for payment category in this month
  // paymentAvailable = what was funded (moved) to this payment category
  // For MVP: payment available = total payments made so far (simplified)
  const paymentAvailable = payments - purchases > 0n ? 0n : purchases - payments;

  return computeCreditCardStatus(
    accountId,
    workingBalance,
    paymentAvailable,
    inspector,
  );
}
