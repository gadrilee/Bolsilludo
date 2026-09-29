'use server';

import { db, workspaces, budgets, budgetMembers, categoryGroups, categories } from '@bolsilludo/db';
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

  let newBudgetId: string = '';

  await db.transaction(async (tx) => {
    // Create workspace
    const [newWorkspace] = await tx.insert(workspaces).values({
      name: `${budgetName} Workspace`,
      baseCurrency: currency,
    }).returning();

    // Create budget inside the workspace
    const [newBudget] = await tx.insert(budgets).values({
      workspaceId: newWorkspace.id,
      name: budgetName,
    }).returning();
    
    newBudgetId = newBudget.id;

    // Assign the user as the owner
    await tx.insert(budgetMembers).values({
      budgetId: newBudget.id,
      userId: user.id,
      role: 'owner',
    });

    // --- Create Default Categories ---
    const defaultStructure = [
      {
        groupName: 'Facturas',
        categories: [
          { name: 'Alquiler/Hipoteca', icon: '🏠' },
          { name: 'Teléfono e Internet', icon: '📱' },
          { name: 'Servicios públicos', icon: '⚡' },
        ]
      },
      {
        groupName: 'Necesidades',
        categories: [
          { name: 'Comestibles', icon: '🛒' },
          { name: 'Transporte', icon: '🚗' },
          { name: 'Gastos médicos', icon: '🩺' },
          { name: 'Fondo de emergencia', icon: '😌' },
        ]
      },
      {
        groupName: 'Gustos',
        categories: [
          { name: 'Comer fuera', icon: '🍽️' },
          { name: 'Entretenimiento', icon: '🍿' },
          { name: 'Vacaciones', icon: '🏖️' },
          { name: 'Cosas que olvidé planificar', icon: '❗' },
          { name: 'Suscripción a Bolsilludo', icon: '🌳' },
        ]
      }
    ];

    for (let i = 0; i < defaultStructure.length; i++) {
      const groupData = defaultStructure[i];
      const [newGroup] = await tx.insert(categoryGroups).values({
        budgetId: newBudget.id,
        name: groupData.groupName,
        sortOrder: i,
      }).returning();

      const categoriesToInsert = groupData.categories.map((cat, j) => ({
        groupId: newGroup.id,
        name: cat.name,
        icon: cat.icon,
        sortOrder: j,
      }));

      if (categoriesToInsert.length > 0) {
        await tx.insert(categories).values(categoriesToInsert);
      }
    }
  });

  revalidatePath('/dashboard');
  return { success: true, budgetId: newBudgetId };
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
