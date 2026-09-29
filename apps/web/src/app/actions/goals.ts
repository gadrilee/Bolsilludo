'use server';

import { db, goals } from '@bolsilludo/db';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const goalSchema = z.object({
  budgetId: z.string().uuid(),
  categoryId: z.string().uuid(),
  cadence: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM']),
  behavior: z.enum(['SET_ASIDE', 'REFILL_UP_TO', 'HAVE_A_BALANCE']),
  amountMinor: z.bigint().positive(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  repeatEnabled: z.boolean().default(false),
  repeatInterval: z.number().int().positive().optional(),
  repeatUnit: z.enum(['WEEK', 'MONTH', 'YEAR']).optional(),
  weekStartDay: z.number().int().min(0).max(6).optional(),
}).refine(data => {
  if (data.behavior === 'HAVE_A_BALANCE') {
    return data.cadence === 'CUSTOM' && !data.repeatEnabled;
  }
  return true;
}, "HAVE_A_BALANCE must be CUSTOM and not repeat");

export async function createGoal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const payload = {
    budgetId: formData.get('budgetId') as string,
    categoryId: formData.get('categoryId') as string,
    cadence: formData.get('cadence') as any,
    behavior: formData.get('behavior') as any,
    amountMinor: BigInt(Math.round(Number(formData.get('amount')) * 100)),
    startDate: formData.get('startDate') as string || undefined,
    dueDate: formData.get('dueDate') as string || undefined,
    repeatEnabled: formData.get('repeatEnabled') === 'true',
    repeatInterval: formData.get('repeatInterval') ? parseInt(formData.get('repeatInterval') as string) : undefined,
    repeatUnit: formData.get('repeatUnit') as any || undefined,
    weekStartDay: formData.get('weekStartDay') ? parseInt(formData.get('weekStartDay') as string) : undefined,
  };

  const parsed = goalSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error('Invalid goal definition: ' + parsed.error.message);
  }

  // Delete existing goal for category if it exists (one active goal per category)
  await db.delete(goals).where(eq(goals.categoryId, parsed.data.categoryId));

  await db.insert(goals).values(parsed.data);

  revalidatePath('/dashboard');
}

export async function getGoals(budgetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return await db.select().from(goals).where(eq(goals.budgetId, budgetId));
}

export async function snoozeGoal(goalId: string, month: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // month is YYYY-MM, we need to save YYYY-MM-01
  const snoozedMonth = `${month}-01`;

  await db.update(goals)
    .set({ snoozedMonth })
    .where(eq(goals.id, goalId));

  revalidatePath('/dashboard');
}

export async function deleteGoal(goalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  await db.delete(goals).where(eq(goals.id, goalId));

  revalidatePath('/dashboard');
}
