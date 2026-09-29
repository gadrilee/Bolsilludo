'use server';

import { db, transactions, transactionSplits, accounts, categoryGroups, categories } from '@bolsilludo/db';
import { eq, and, gte, lte, isNull, notIlike } from 'drizzle-orm';
import { requireBudgetRole } from '@/lib/auth/authorization';
import { summarizeIncomeAndExpense } from '@bolsilludo/budget-engine';

export type IncomeVsExpenseResult = {
  income: number;
  expense: number;
  net: number;
};

// YYYY-MM-DD format for dates
export async function getIncomeVsExpense(budgetId: string, fromDate: string, toDate: string): Promise<IncomeVsExpenseResult> {
  await requireBudgetRole(budgetId, 'viewer');

  const txs = await db.select({
      amountMinor: transactions.amountMinor,
      splitId: transactionSplits.id,
      splitAmountMinor: transactionSplits.amountMinor,
      categoryId: transactionSplits.categoryId,
      payeeName: transactions.payeeName,
      voidedAt: transactions.voidedAt,
    })
    .from(transactions)
    .leftJoin(transactionSplits, eq(transactions.id, transactionSplits.transactionId))
    .where(and(
      eq(transactions.budgetId, budgetId),
      gte(transactions.date, new Date(fromDate)),
      lte(transactions.date, new Date(toDate + 'T23:59:59.999Z')),
      isNull(transactions.voidedAt),
    ));

  const summary = summarizeIncomeAndExpense(txs.map(tx => {
    const isSplit = tx.splitId !== null;
    return {
      amountMinor: isSplit && tx.splitAmountMinor !== null
        ? BigInt(tx.splitAmountMinor)
        : BigInt(tx.amountMinor),
      categoryId: isSplit ? tx.categoryId : null,
      isSplit,
      isTransfer: /^(transfer|pago)/i.test(tx.payeeName ?? ''),
      isStartingBalance: (tx.payeeName ?? '').toLowerCase() === 'starting balance',
      isVoided: tx.voidedAt !== null,
    };
  }));

  return {
    income: Number(summary.incomeMinor) / 100,
    expense: Number(summary.expenseMinor) / 100,
    net: Number(summary.netMinor) / 100,
  };
}

export type SpendingByCategoryResult = {
  categoryId: string;
  categoryName: string;
  amount: number; // positive means spent
}[];

export async function getSpendingByCategory(budgetId: string, fromDate: string, toDate: string): Promise<SpendingByCategoryResult> {
  await requireBudgetRole(budgetId, 'viewer');

  const txs = await db.select({
      amount: transactionSplits.amountMinor,
      categoryId: transactionSplits.categoryId,
      categoryName: categories.name
    })
    .from(transactions)
    .innerJoin(transactionSplits, eq(transactions.id, transactionSplits.transactionId))
    .innerJoin(categories, eq(transactionSplits.categoryId, categories.id))
    .where(and(
      eq(transactions.budgetId, budgetId),
      gte(transactions.date, new Date(fromDate)),
      lte(transactions.date, new Date(toDate + 'T23:59:59.999Z')),
      notIlike(transactions.payeeName, 'Transfer%'),
      notIlike(transactions.payeeName, 'Pago%')
    ));

  const spendingMap = new Map<string, { name: string, total: bigint }>();

  for (const tx of txs) {
    if (!tx.categoryId || !tx.categoryName) continue;
    
    const amt = BigInt(tx.amount);
    if (amt < 0n) { // only count expenses. Refunds (amt > 0) reduce expense.
      if (!spendingMap.has(tx.categoryId)) {
        spendingMap.set(tx.categoryId, { name: tx.categoryName, total: 0n });
      }
      const entry = spendingMap.get(tx.categoryId)!;
      entry.total -= amt; // make it a positive expense
    } else {
      if (spendingMap.has(tx.categoryId)) {
        spendingMap.get(tx.categoryId)!.total -= amt; // refund reduces expense
      }
    }
  }

  const result: SpendingByCategoryResult = [];
  for (const [id, data] of spendingMap.entries()) {
    if (data.total > 0n) {
      result.push({
        categoryId: id,
        categoryName: data.name,
        amount: Number(data.total) / 100
      });
    }
  }

  return result.sort((a, b) => b.amount - a.amount);
}

export type NetWorthResult = {
  assets: number;
  liabilities: number;
  netWorth: number;
};

export async function getNetWorth(budgetId: string, asOfDate: string): Promise<NetWorthResult> {
  await requireBudgetRole(budgetId, 'viewer');

  const allTxs = await db.select({
      amount: transactions.amountMinor,
      accountType: accounts.type
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(
      eq(transactions.budgetId, budgetId),
      lte(transactions.date, new Date(asOfDate + 'T23:59:59.999Z'))
      ,isNull(transactions.voidedAt)
    ));

  let assets = 0n;
  let liabilities = 0n;

  for (const tx of allTxs) {
    const amt = BigInt(tx.amount);
    if (tx.accountType === 'credit_card' || tx.accountType === 'loan') {
      liabilities += amt; // credit card balance is usually negative, wait. If I spend on CC, amt < 0. So liabilities += amt makes it negative.
    } else {
      assets += amt;
    }
  }

  // liabilities will be negative if there's debt. 
  // Let's return them as positive absolute values for display, except netWorth.
  const assetsDisplay = assets > 0n ? Number(assets) / 100 : 0;
  // If liabilities is negative, it's debt.
  const liabilitiesDisplay = liabilities < 0n ? Number(-liabilities) / 100 : 0;
  
  // Wait, if CC has positive balance (overpaid), it's an asset. 
  const trueAssets = Number(assets + (liabilities > 0n ? liabilities : 0n)) / 100;
  const trueLiabilities = Number(liabilities < 0n ? -liabilities : 0n) / 100;

  return {
    assets: trueAssets,
    liabilities: trueLiabilities,
    netWorth: trueAssets - trueLiabilities
  };
}

export type CashFlowResult = {
  inflows: number;
  outflows: number;
  netCashFlow: number;
};

export async function getCashFlow(budgetId: string, fromDate: string, toDate: string): Promise<CashFlowResult> {
  await requireBudgetRole(budgetId, 'viewer');

  const txs = await db.select({
      amount: transactions.amountMinor,
      accountType: accounts.type
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(
      eq(transactions.budgetId, budgetId),
      gte(transactions.date, new Date(fromDate)),
      lte(transactions.date, new Date(toDate + 'T23:59:59.999Z')),
      isNull(transactions.voidedAt),
      notIlike(transactions.payeeName, 'Transfer%'),
      notIlike(transactions.payeeName, 'Pago%'),
      notIlike(transactions.payeeName, 'Starting Balance')
    ));

  let inflows = 0n;
  let outflows = 0n;

  for (const tx of txs) {
    const amt = BigInt(tx.amount);
    if (amt > 0n) {
      inflows += amt;
    } else {
      outflows -= amt; // outflows stored as positive
    }
  }

  return {
    inflows: Number(inflows) / 100,
    outflows: Number(outflows) / 100,
    netCashFlow: Number(inflows - outflows) / 100
  };
}
