import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getBudgets } from '../actions/budgets';
import { getCategories } from '../actions/categories';
import { getAccounts } from '../actions/accounts';
import { getTransactions } from '../actions/transactions';
import { getAllocationsForMonth } from '../actions/allocations';
import { CreateBudgetForm } from './create-budget-form';
import { BudgetView } from './budget-view';
import { calculateMonthState } from '@bolsilludo/budget-engine';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const name = user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? user.email;

  // Fetch user budgets
  const budgets = await getBudgets();
  const activeBudget = budgets.length > 0 ? budgets[0] : null;

  // If active budget, fetch its data
  let groups: Awaited<ReturnType<typeof getCategories>> = [];
  let accounts: Awaited<ReturnType<typeof getAccounts>> = [];
  let transactions: Awaited<ReturnType<typeof getTransactions>> = [];
  let goals: any[] = [];
  let monthState: ReturnType<typeof calculateMonthState> | null = null;
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  if (activeBudget) {
    const { getGoals } = await import('../actions/goals');
    
    [groups, accounts, transactions, goals] = await Promise.all([
      getCategories(activeBudget.id),
      getAccounts(activeBudget.id),
      getTransactions(activeBudget.id),
      getGoals(activeBudget.id),
    ]);

    const allocations = await getAllocationsForMonth(activeBudget.id, currentMonth);

    // All positive transactions are inflows to RTA (MVP: no split-based categorization yet)
    const inflowsToRTA = transactions
      .filter(tx => Number(tx.amountMinor) > 0)
      .reduce((acc, tx) => acc + BigInt(tx.amountMinor), 0n);

    // Build per-category inputs from the nested structure returned by getCategories
    const categoryInputs = groups.flatMap(g =>
      (g.categories ?? []).map(c => {
        const alloc = allocations.find(a => a.categoryId === c.id);
        const goal = goals.find(go => go.categoryId === c.id);
        
        let goalDef = null;
        if (goal) {
          goalDef = {
            ...goal,
            amountMinor: BigInt(goal.amountMinor),
            snoozedMonth: goal.snoozedMonth ? goal.snoozedMonth.substring(0, 7) : null
          };
        }

        return {
          categoryId: c.id,
          previousAvailable: 0n, // MVP: no previous month history
          assigned: alloc ? BigInt(alloc.amountMinor) : 0n,
          activity: 0n, // MVP: split-based activity wired in Spec 04 extension
          goal: goalDef
        };
      })
    );

    monthState = calculateMonthState({
      month: currentMonth,
      previousRTA: 0n,
      inflowsToRTA,
      categories: categoryInputs,
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
      <header style={{ width: '100%', maxWidth: '1200px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          currentMonth={currentMonth}
        />
      )}
    </main>
  );
}
