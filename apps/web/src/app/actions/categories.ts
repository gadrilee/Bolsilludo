'use server';

import { db, categoryGroups, categories } from '@bolsilludo/db';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createCategoryGroup(budgetId: string, name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const [newGroup] = await db.insert(categoryGroups).values({
    budgetId,
    name,
  }).returning();

  revalidatePath('/dashboard');
  return newGroup;
}

export async function createCategory(groupId: string, name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const [newCategory] = await db.insert(categories).values({
    groupId,
    name,
  }).returning();

  revalidatePath('/dashboard');
  return newCategory;
}

export async function hideCategory(categoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  await db.update(categories)
    .set({ isHidden: 1 })
    .where(eq(categories.id, categoryId));

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getCategories(budgetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // Get all groups for this budget
  const groups = await db
    .select()
    .from(categoryGroups)
    .where(eq(categoryGroups.budgetId, budgetId));
    
  return groups;
}
