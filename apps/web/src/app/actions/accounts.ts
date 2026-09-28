'use server';

import { db, accounts, transactions } from '@bolsilludo/db';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const budgetId = formData.get('budgetId') as string;
  const name = formData.get('name') as string;
  const type = formData.get('type') as string; // 'checking', 'savings', 'credit', 'cash'
  const balance = formData.get('balance') as string; // Minor units or string parsed
  const currency = formData.get('currency') as string || 'BOB';

  if (!budgetId || !name || !type) throw new Error("Missing required fields");

  // Parse balance to minor units (e.g. multiply by 100 for cents, but let's keep it simple for now)
  // According to P2 Integer Money, we store minor units. Assuming frontend sends minor units.
  const amountMinor = BigInt(balance || "0");

  // 1. Create the Account
  const [newAccount] = await db.insert(accounts).values({
    budgetId,
    name,
    type,
    currency,
    isOffBudget: 0,
  }).returning();

  // 2. Create the Starting Balance Transaction (if balance != 0)
  if (amountMinor !== BigInt(0)) {
    await db.insert(transactions).values({
      budgetId,
      accountId: newAccount.id,
      date: new Date(),
      amountMinor,
      payee: 'Starting Balance',
      memo: 'Initial account balance',
    });
  }

  revalidatePath('/dashboard');
  return { success: true, accountId: newAccount.id };
}

export async function getAccounts(budgetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const budgetAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.budgetId, budgetId));

  return budgetAccounts;
}
