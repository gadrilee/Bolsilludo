'use server';

import { db, accounts, transactions, categories, categoryGroups } from '@bolsilludo/db';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Reserved group name for auto-managed credit card payment categories (BR-CC-001)
const CC_PAYMENT_GROUP_NAME = 'Pagos de Tarjetas';

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const budgetId = formData.get('budgetId') as string;
  const name = formData.get('name') as string;
  const type = formData.get('type') as string; // 'checking', 'savings', 'credit_card', 'cash', 'loan'
  const balanceStr = formData.get('balance') as string;
  const currency = formData.get('currency') as string || 'BOB';

  if (!budgetId || !name || !type) throw new Error("Missing required fields");

  // Convert from display units (Bs) to minor units (centavos)
  const amountMinor = BigInt(Math.round(Number(balanceStr || '0') * 100));

  // 1. Create the Account
  const [newAccount] = await db.insert(accounts).values({
    budgetId,
    name,
    type,
    currency,
    isOffBudget: 0,
  }).returning();

  // 2. For CREDIT_CARD: auto-create payment category (FR-CC-001, BR-CC-001)
  if (type === 'credit_card') {
    // Find or create the "Pagos de Tarjetas" group
    let paymentGroup = await db
      .select()
      .from(categoryGroups)
      .where(and(
        eq(categoryGroups.budgetId, budgetId),
        eq(categoryGroups.name, CC_PAYMENT_GROUP_NAME)
      ))
      .then(r => r[0] ?? null);

    if (!paymentGroup) {
      const [g] = await db.insert(categoryGroups).values({
        budgetId,
        name: CC_PAYMENT_GROUP_NAME,
        sortOrder: 9999, // Always at the bottom
        isHidden: 0,
      }).returning();
      paymentGroup = g;
    }

    // Create the payment category linked explicitly to this card account
    await db.insert(categories).values({
      groupId: paymentGroup.id,
      name: `Pago: ${name}`,
      sortOrder: 0,
      isHidden: 0,
      linkedAccountId: newAccount.id,
      isCreditCardPayment: 1,
    });
  }

  // 3. Create Starting Balance Transaction (if balance != 0)
  if (amountMinor !== 0n) {
    // For credit cards, the opening balance is a negative amount (debt)
    const openingAmountMinor = type === 'credit_card' ? -amountMinor : amountMinor;
    await db.insert(transactions).values({
      budgetId,
      accountId: newAccount.id,
      date: new Date(),
      amountMinor: openingAmountMinor,
      payeeName: 'Starting Balance',
      memo: 'Initial account balance',
      status: 'cleared',
    });
  }

  revalidatePath('/dashboard');
  return { success: true, accountId: newAccount.id };
}

export async function getAccounts(budgetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  return await db
    .select()
    .from(accounts)
    .where(eq(accounts.budgetId, budgetId));
}

export async function getAccountById(accountId: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  return account ?? null;
}
