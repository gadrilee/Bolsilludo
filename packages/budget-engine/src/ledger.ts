export type BudgetTransactionLine = {
  amountMinor: bigint;
  categoryId: string | null;
  isSplit: boolean;
  isTransfer: boolean;
  isVoided: boolean;
};

export type BudgetActivitySummary = {
  inflowsToRta: bigint;
  activityByCategory: Map<string, bigint>;
};

export type IncomeExpenseLine = {
  amountMinor: bigint;
  categoryId: string | null;
  isSplit: boolean;
  isTransfer: boolean;
  isStartingBalance: boolean;
  isVoided: boolean;
};

export type IncomeExpenseSummary = {
  incomeMinor: bigint;
  expenseMinor: bigint;
  netMinor: bigint;
};

export type AccountBalanceLine = {
  accountId: string;
  amountMinor: bigint;
  date: Date;
  voidedAt: Date | null;
};

export function sumAccountBalanceAsOf(
  lines: AccountBalanceLine[],
  accountId: string,
  asOf: Date,
): bigint {
  const cutoff = asOf.getTime();
  return lines.reduce((balance, line) => {
    if (line.accountId !== accountId || line.voidedAt || line.date.getTime() > cutoff) return balance;
    return balance + line.amountMinor;
  }, 0n);
}

export function summarizeBudgetActivity(lines: BudgetTransactionLine[]): BudgetActivitySummary {
  let inflowsToRta = 0n;
  const activityByCategory = new Map<string, bigint>();

  for (const line of lines) {
    if (line.isVoided || line.isTransfer) continue;

    if (line.categoryId) {
      activityByCategory.set(
        line.categoryId,
        (activityByCategory.get(line.categoryId) ?? 0n) + line.amountMinor,
      );
    } else if (!line.isSplit && line.amountMinor > 0n) {
      inflowsToRta += line.amountMinor;
    }
  }

  return { inflowsToRta, activityByCategory };
}

export function summarizeIncomeAndExpense(lines: IncomeExpenseLine[]): IncomeExpenseSummary {
  let incomeMinor = 0n;
  let expenseMinor = 0n;

  for (const line of lines) {
    if (line.isVoided || line.isTransfer || line.isStartingBalance) continue;

    if (line.categoryId) {
      expenseMinor -= line.amountMinor;
    } else if (!line.isSplit && line.amountMinor > 0n) {
      incomeMinor += line.amountMinor;
    }
  }

  return {
    incomeMinor,
    expenseMinor,
    netMinor: incomeMinor - expenseMinor,
  };
}