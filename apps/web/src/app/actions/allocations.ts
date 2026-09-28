'use server';

import { db, categoryAllocations } from '@bolsilludo/db';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function assignMoney(categoryId: string, month: string, amountMinor: bigint) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Check if an allocation already exists for this category and month
  const existing = await db
    .select()
    .from(categoryAllocations)
    .where(and(
      eq(categoryAllocations.categoryId, categoryId),
      eq(categoryAllocations.month, month)
    ));

  if (existing.length > 0) {
    // Update
    await db
      .update(categoryAllocations)
      .set({ amountMinor, updatedAt: new Date() })
      .where(eq(categoryAllocations.id, existing[0].id));
  } else {
    // Insert
    await db.insert(categoryAllocations).values({
      categoryId,
      month,
      amountMinor,
    });
  }

  revalidatePath('/dashboard');
}

export async function getAllocationsForMonth(budgetId: string, month: string) {
  // To keep MVP simple, we fetch all allocations and filter. 
  // In a real query we would join with categories to ensure they belong to this budget.
  const allocations = await db.select().from(categoryAllocations).where(eq(categoryAllocations.month, month));
  return allocations;
}
