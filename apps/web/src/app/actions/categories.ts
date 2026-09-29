'use server';

import { db, categoryGroups, categories } from '@bolsilludo/db';
import { eq, and, asc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createCategoryGroup(budgetId: string, name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 50) throw new Error('Nombre de grupo inválido.');

  const [newGroup] = await db.insert(categoryGroups).values({
    budgetId,
    name: trimmed,
  }).returning();

  revalidatePath('/dashboard');
  return newGroup;
}

export async function createCategory(groupId: string, name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 50) throw new Error('Nombre de categoría inválido.');

  const [newCategory] = await db.insert(categories).values({
    groupId,
    name: trimmed,
  }).returning();

  revalidatePath('/dashboard');
  return newCategory;
}

export async function hideCategory(categoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  await db.update(categories)
    .set({ isHidden: 1 })
    .where(eq(categories.id, categoryId));

  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Returns all category groups for a budget, with their categories nested inside.
 * Spec §02: groups with categories is the canonical structure for the budget grid.
 */
export async function getCategories(budgetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch all groups for this budget, ordered by sortOrder
  const groups = await db
    .select()
    .from(categoryGroups)
    .where(and(eq(categoryGroups.budgetId, budgetId), eq(categoryGroups.isHidden, 0)))
    .orderBy(asc(categoryGroups.sortOrder));

  if (groups.length === 0) return [];

  // Fetch all categories for all groups in one query
  const groupIds = groups.map(g => g.id);
  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.isHidden, 0))
    .orderBy(asc(categories.sortOrder));

  // Filter categories that belong to any of our groups and nest them
  const groupsWithCategories = groups.map(group => ({
    ...group,
    categories: allCategories.filter(cat => cat.groupId === group.id),
  }));

  return groupsWithCategories;
}
