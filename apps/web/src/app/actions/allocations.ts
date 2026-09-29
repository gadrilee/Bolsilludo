'use server';

import { db, categoryAllocations, categoryGroups, categories } from '@bolsilludo/db';
import { eq, and } from 'drizzle-orm';
import { requireBudgetRole } from '@/lib/auth/authorization';
import { revalidatePath } from 'next/cache';

export async function assignMoney(categoryId: string, month: string, amountMinor: bigint) {
  const [category] = await db.select({ budgetId: categoryGroups.budgetId })
    .from(categories)
    .innerJoin(categoryGroups, eq(categories.groupId, categoryGroups.id))
    .where(eq(categories.id, categoryId));
  if (!category) throw new Error('CATEGORY_NOT_FOUND');
  await requireBudgetRole(category.budgetId, 'editor');

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
  await requireBudgetRole(budgetId, 'viewer');
  const allocations = await db.select({
    id: categoryAllocations.id,
    categoryId: categoryAllocations.categoryId,
    month: categoryAllocations.month,
    amountMinor: categoryAllocations.amountMinor,
  })
    .from(categoryAllocations)
    .innerJoin(categories, eq(categoryAllocations.categoryId, categories.id))
    .innerJoin(categoryGroups, eq(categories.groupId, categoryGroups.id))
    .where(and(
      eq(categoryGroups.budgetId, budgetId),
      eq(categoryAllocations.month, month),
    ));
  return allocations;
}

export async function getAllAllocations(budgetId: string) {
  await requireBudgetRole(budgetId, 'viewer');
  return db
    .select({
      id: categoryAllocations.id,
      categoryId: categoryAllocations.categoryId,
      month: categoryAllocations.month,
      amountMinor: categoryAllocations.amountMinor,
    })
    .from(categoryAllocations)
    .innerJoin(categories, eq(categoryAllocations.categoryId, categories.id))
    .innerJoin(categoryGroups, eq(categories.groupId, categoryGroups.id))
    .where(eq(categoryGroups.budgetId, budgetId));
}
