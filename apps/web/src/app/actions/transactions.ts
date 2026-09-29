'use server';

import { randomUUID } from 'node:crypto';
import { db, transactions, transactionSplits, payees, accounts, categories, categoryGroups } from '@bolsilludo/db';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { requireBudgetRole } from '@/lib/auth/authorization';
import { revalidatePath } from 'next/cache';
import { computeCreditCardStatus, sumAccountBalanceAsOf, type CreditCardInspector } from '@bolsilludo/budget-engine';

export async function createTransaction(formData: FormData) {
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
  await requireBudgetRole(budgetId, 'editor');

  const [account] = await db.select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.budgetId, budgetId)));
  if (!account) throw new Error('ACCOUNT_NOT_IN_BUDGET');

  if (categoryId) {
    const [category] = await db.select({ id: categories.id })
      .from(categories)
      .innerJoin(categoryGroups, eq(categories.groupId, categoryGroups.id))
      .where(and(eq(categories.id, categoryId), eq(categoryGroups.budgetId, budgetId)));
    if (!category) throw new Error('CATEGORY_NOT_IN_BUDGET');
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
  const budgetId = formData.get('budgetId') as string;
  const fromAccountId = formData.get('fromAccountId') as string;
  const toAccountId = formData.get('toAccountId') as string;
  const amountStr = formData.get('amount') as string;
  const dateStr = formData.get('date') as string;
  const memo = formData.get('memo') as string | null;

  if (!budgetId || !fromAccountId || !toAccountId || !amountStr) {
    throw new Error("Missing required transfer fields");
  }
  await requireBudgetRole(budgetId, 'editor');

  const [fromAccount] = await db.select().from(accounts)
    .where(and(eq(accounts.id, fromAccountId), eq(accounts.budgetId, budgetId)));
  const [toAccount] = await db.select().from(accounts)
    .where(and(eq(accounts.id, toAccountId), eq(accounts.budgetId, budgetId)));
  if (!fromAccount || !toAccount) throw new Error('ACCOUNT_NOT_IN_BUDGET');
  if (fromAccountId === toAccountId) throw new Error('TRANSFER_SAME_ACCOUNT');
  const amount = Number(amountStr);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('AMOUNT_INVALID');

  const amountMinor = BigInt(Math.round(amount * 100));
  if (amountMinor <= 0n) throw new Error('AMOUNT_ZERO');
  const date = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error('INVALID_TRANSACTION_DATE');
  const transferGroupId = randomUUID();
  const fromTransactionId = randomUUID();
  const toTransactionId = randomUUID();

  await db.transaction(async (tx) => {
    const [currentFromAccount] = await tx.select().from(accounts)
      .where(and(eq(accounts.id, fromAccountId), eq(accounts.budgetId, budgetId)));
    const [currentToAccount] = await tx.select().from(accounts)
      .where(and(eq(accounts.id, toAccountId), eq(accounts.budgetId, budgetId)));
    if (!currentFromAccount || !currentToAccount) throw new Error('ACCOUNT_NOT_IN_BUDGET');
    if (currentFromAccount.closedAt || currentToAccount.closedAt) throw new Error('ACCOUNT_CLOSED');
    if (currentFromAccount.currency !== currentToAccount.currency) throw new Error('TRANSFER_CURRENCY_MISMATCH');

    const isCreditCardPayment = currentToAccount.type === 'credit_card';
    await tx.insert(transactions).values([
      {
        id: fromTransactionId,
        budgetId,
        accountId: fromAccountId,
        amountMinor: -amountMinor,
        date,
        payeeName: isCreditCardPayment ? `Pago tarjeta: ${currentToAccount.name}` : 'Transfer',
        memo: memo ?? undefined,
        status: 'cleared',
        transferGroupId,
        transferPeerId: toTransactionId,
      },
      {
        id: toTransactionId,
        budgetId,
        accountId: toAccountId,
        amountMinor,
        date,
        payeeName: isCreditCardPayment ? 'Pago recibido' : 'Transfer',
        memo: memo ?? undefined,
        status: 'cleared',
        transferGroupId,
        transferPeerId: fromTransactionId,
      },
    ]);
  });

  // BR-CC-001: Payment to card is NOT recorded as a category expense.
  // The payment category's "available" balance is managed by the engine,
  // not by creating a split here.

  revalidatePath('/dashboard');
  return { success: true, transferGroupId };
}

export async function getTransactions(budgetId: string) {
  await requireBudgetRole(budgetId, 'viewer');

  const rows = await db
    .select({
      transaction: {
        id: transactions.id,
        budgetId: transactions.budgetId,
        accountId: transactions.accountId,
        date: transactions.date,
        amountMinor: transactions.amountMinor,
        payeeName: transactions.payeeName,
        memo: transactions.memo,
        externalId: transactions.externalId,
        scheduledId: transactions.scheduledId,
        occurrenceDate: transactions.occurrenceDate,
        status: transactions.status,
        voidedAt: transactions.voidedAt,
        createdAt: transactions.createdAt,
      },
      splitId: transactionSplits.id,
      splitCategoryId: transactionSplits.categoryId,
      splitAmountMinor: transactionSplits.amountMinor,
    })
    .from(transactions)
    .leftJoin(transactionSplits, eq(transactionSplits.transactionId, transactions.id))
    .where(eq(transactions.budgetId, budgetId))
    .orderBy(desc(transactions.date));

  type LedgerTransaction = (typeof rows)[number]['transaction'] & {
    splits: { id: string; categoryId: string | null; amountMinor: bigint }[];
  };
  const transactionsById = new Map<string, LedgerTransaction>();

  for (const row of rows) {
    let transaction = transactionsById.get(row.transaction.id);
    if (!transaction) {
      transaction = { ...row.transaction, splits: [] };
      transactionsById.set(transaction.id, transaction);
    }

    if (row.splitId && row.splitAmountMinor !== null) {
      transaction.splits.push({
        id: row.splitId,
        categoryId: row.splitCategoryId,
        amountMinor: row.splitAmountMinor,
      });
    }
  }

  return Array.from(transactionsById.values());
}

/**
 * Computes the CreditCardStatusDTO for a credit card account for the given month.
 * Uses pure engine functions — no UI calculation (BR-CC-070).
 */
export async function getCreditCardStatus(accountId: string, month: string, budgetId: string) {
  await requireBudgetRole(budgetId, 'viewer');
  const [account] = await db.select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.budgetId, budgetId)));
  if (!account) throw new Error('ACCOUNT_NOT_IN_BUDGET');

  // Get all transactions for this card account
  const cardTxs = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      date: transactions.date,
      amountMinor: transactions.amountMinor,
      payeeName: transactions.payeeName,
      voidedAt: transactions.voidedAt,
    })
    .from(transactions)
    .where(and(
      eq(transactions.budgetId, budgetId),
      eq(transactions.accountId, accountId),
    ));

  const asOf = new Date();
  const workingBalance = sumAccountBalanceAsOf(cardTxs, accountId, asOf);
  const currentCardTxs = cardTxs.filter(tx => !tx.voidedAt && tx.date.getTime() <= asOf.getTime());

  // Classify transactions for the inspector
  let purchases = 0n;
  let refunds = 0n;
  let payments = 0n;
  for (const tx of currentCardTxs) {
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
