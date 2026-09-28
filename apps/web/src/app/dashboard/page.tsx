import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getBudgets } from '../actions/budgets';
import { getCategories } from '../actions/categories';
import { getAccounts } from '../actions/accounts';
import { getTransactions } from '../actions/transactions';
import { CreateBudgetForm } from './create-budget-form';
import { BudgetView } from './budget-view';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const name = user.user_metadata?.full_name ?? user.email;

  // Fetch user budgets
  const budgets = await getBudgets();
  const activeBudget = budgets.length > 0 ? budgets[0] : null;

  // If active budget, fetch its category groups and accounts
  let groups: any[] = [];
  let accounts: any[] = [];
  let transactions: any[] = [];
  let allocations: any[] = [];
  let monthState: any = null;

  if (activeBudget) {
    groups = await getCategories(activeBudget.id);
    accounts = await getAccounts(activeBudget.id);
    transactions = await getTransactions(activeBudget.id);
    
    // For MVP we just use the current month
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const { getAllocationsForMonth } = await import('../actions/allocations');
    allocations = await getAllocationsForMonth(activeBudget.id, currentMonth);

    // Calculate Inflows to RTA (transactions without category, or explicit RTA)
    // For MVP, all positive transactions are income to RTA.
    const inflowsToRTA = transactions
      .filter(tx => Number(tx.amountMinor) > 0)
      .reduce((acc, tx) => acc + BigInt(tx.amountMinor), 0n);

    // Build categories input for the engine
    // We need to flatten categories from groups
    const flatCategories = groups.flatMap(g => g.categories || []);
    
    // Wait, the groups fetched by getCategories actually returns an array of groups, 
    // we need to make sure we get the categories inside. We will do this via a simple DB query or mapping.
    const { db, categories } = await import('@bolsilludo/db');
    const { eq } = await import('drizzle-orm');
    const allCats = groups.length > 0 ? await db.select().from(categories) : [];

    const categoryInputs = allCats.map(c => {
      const assigned = allocations.find(a => a.categoryId === c.id)?.amountMinor || 0n;
      // Activity is the sum of negative transactions for this category (MVP: no splits yet, so just mock or map if implemented)
      const activity = 0n; // MVP simplification, until splits are fully wired in UI
      
      return {
        categoryId: c.id,
        previousAvailable: 0n, // MVP: no previous month history yet
        assigned: BigInt(assigned),
        activity: BigInt(activity),
      };
    });

    const { calculateMonthState } = await import('@bolsilludo/budget-engine');
    
    monthState = calculateMonthState({
      previousRTA: 0n,
      inflowsToRTA,
      categories: categoryInputs
    });
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexDirection: 'column',
        padding: '3rem 1rem',
        gap: '2rem',
        color: 'var(--text)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <header style={{ width: '100%', maxWidth: '900px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>Bolsilludo</h1>
          <p style={{ color: 'var(--text-muted)' }}>Bienvenido, {name}</p>
        </div>

        <form
          action={async () => {
            'use server';
            const { createClient } = await import('@/lib/supabase/server');
            const { redirect } = await import('next/navigation');
            const supabase = await createClient();
            await supabase.auth.signOut();
            redirect('/login');
          }}
        >
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '0.5rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      {!activeBudget ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <CreateBudgetForm />
        </div>
      ) : (
        <BudgetView 
          budgetId={activeBudget.id} 
          budgetName={activeBudget.name} 
          groups={groups} 
          accounts={accounts} 
          transactions={transactions} 
          monthState={monthState}
          currentMonth={new Date().toISOString().slice(0, 7)}
        />
      )}
    </main>
  );
}
