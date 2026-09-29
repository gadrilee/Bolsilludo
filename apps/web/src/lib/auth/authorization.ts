import { and, eq } from 'drizzle-orm';
import { budgetMembers, db } from '@bolsilludo/db';
import { createClient } from '@/lib/supabase/server';
import { isBudgetRole, roleMeetsMinimum, type BudgetRole } from './authorization-policy';

export { BUDGET_ROLES, type BudgetRole } from './authorization-policy';

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export async function requireBudgetRole(budgetId: string, minimumRole: BudgetRole) {
  if (!budgetId) throw new Error('BUDGET_NOT_FOUND');

  const user = await getAuthenticatedUser();
  const [member] = await db
    .select()
    .from(budgetMembers)
    .where(and(
      eq(budgetMembers.budgetId, budgetId),
      eq(budgetMembers.userId, user.id),
    ));

  if (!member || !isBudgetRole(member.role)) {
    throw new Error('PERMISSION_DENIED');
  }

  if (!roleMeetsMinimum(member.role, minimumRole)) {
    throw new Error('PERMISSION_DENIED');
  }

  return { user, member };
}