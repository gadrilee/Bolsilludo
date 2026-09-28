'use server';

import { db, workspaces, budgets, budgetMembers } from '@bolsilludo/db';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createBudget(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const budgetName = formData.get('name') as string;
  const currency = formData.get('currency') as string || 'BOB';

  if (!budgetName) throw new Error("Budget name is required");

  // Create workspace
  const [newWorkspace] = await db.insert(workspaces).values({
    name: `${budgetName} Workspace`,
    baseCurrency: currency,
  }).returning();

  // Create budget inside the workspace
  const [newBudget] = await db.insert(budgets).values({
    workspaceId: newWorkspace.id,
    name: budgetName,
  }).returning();

  // Assign the user as the owner
  await db.insert(budgetMembers).values({
    budgetId: newBudget.id,
    userId: user.id,
    role: 'owner',
  });

  revalidatePath('/dashboard');
  return { success: true, budgetId: newBudget.id };
}

export async function getBudgets() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // Query budgets where the user is a member
  const userBudgets = await db
    .select({
      id: budgets.id,
      name: budgets.name,
      role: budgetMembers.role,
      workspaceName: workspaces.name,
      currency: workspaces.baseCurrency,
    })
    .from(budgets)
    .innerJoin(budgetMembers, eq(budgets.id, budgetMembers.budgetId))
    .innerJoin(workspaces, eq(budgets.workspaceId, workspaces.id))
    .where(eq(budgetMembers.userId, user.id));

  return userBudgets;
}
