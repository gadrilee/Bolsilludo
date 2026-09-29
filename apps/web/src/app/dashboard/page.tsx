import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getBudgets } from '../actions/budgets';
import { getCategories } from '../actions/categories';
import { getAccounts } from '../actions/accounts';
import { getTransactions, getCreditCardStatus } from '../actions/transactions';
import { getAllocationsForMonth } from '../actions/allocations';
import { CreateBudgetForm } from './create-budget-form';
import { BudgetView } from './budget-view';
import { calculateMonthState } from '@bolsilludo/budget-engine';
import type { CreditCardStatusDTO } from '@bolsilludo/budget-engine';
import { getPendingImportBatch } from '../actions/imports';
import { getScheduledTransactions } from '../actions/scheduled';
import { getMembers, getInvitations } from '../actions/collaboration';
import { BudgetSelector } from './budget-selector';

type DashboardProps = {
  searchParams: Promise<{ month?: string, budgetId?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const resolvedParams = await searchParams;
  const urlMonth = resolvedParams.month;
  const urlBudgetId = resolvedParams.budgetId;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const name = user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? user.email;

  // Fetch user budgets
  const budgets = await getBudgets();
  const activeBudget = urlBudgetId 
    ? budgets.find(b => b.id === urlBudgetId) || (budgets.length > 0 ? budgets[0] : null)
    : (budgets.length > 0 ? budgets[0] : null);

  // If active budget, fetch its data
  let groups: Awaited<ReturnType<typeof getCategories>> = [];
  let accounts: Awaited<ReturnType<typeof getAccounts>> = [];
  let transactions: Awaited<ReturnType<typeof getTransactions>> = [];
  let goals: any[] = [];
  let monthState: ReturnType<typeof calculateMonthState> | null = null;
  let ccStatuses: Record<string, CreditCardStatusDTO> = {};
  let pendingBatches: Record<string, any> = {};
  let scheduled: Awaited<ReturnType<typeof getScheduledTransactions>> = [];
  let members: any[] = [];
  let invitations: any[] = [];
  
  // Use URL month or current month
  const currentMonth = urlMonth && /^\d{4}-\d{2}$/.test(urlMonth) ? urlMonth : new Date().toISOString().slice(0, 7);

  if (activeBudget) {
    const { getGoals } = await import('../actions/goals');
    
    [groups, accounts, transactions, goals, scheduled, members] = await Promise.all([
      getCategories(activeBudget.id),
      getAccounts(activeBudget.id),
      getTransactions(activeBudget.id),
      getGoals(activeBudget.id),
      getScheduledTransactions(activeBudget.id),
      getMembers(activeBudget.id).catch(() => []), // Viewer or higher
    ]);

    // Admin or higher can fetch invitations, catch and default to empty array if user is viewer
    invitations = await getInvitations(activeBudget.id).catch(() => []);

    const { getAllAllocations } = await import('../actions/allocations');
    const allocations = await getAllAllocations(activeBudget.id);

    // Group transactions by month
    const txByMonth = transactions.reduce((acc, tx) => {
      const m = new Date(tx.date).toISOString().slice(0, 7);
      if (!acc[m]) acc[m] = [];
      acc[m].push(tx);
      return acc;
    }, {} as Record<string, typeof transactions>);

    // Group allocations by month
    const allocByMonth = allocations.reduce((acc, al) => {
      if (!acc[al.month]) acc[al.month] = [];
      acc[al.month].push(al);
      return acc;
    }, {} as Record<string, typeof allocations>);

    // Determine all months to process (from earliest up to currentMonth)
    const allMonthsSet = new Set([...Object.keys(txByMonth), ...Object.keys(allocByMonth), currentMonth]);
    const sortedMonths = Array.from(allMonthsSet).sort();
    const processMonths = sortedMonths.filter(m => m <= currentMonth);

    let lastRTA = 0n;
    let lastCategoriesState: Record<string, { available: bigint }> = {};

    for (const m of processMonths) {
      const mTx = txByMonth[m] || [];
      const mAlloc = allocByMonth[m] || [];

      const inflowsToRTA = mTx
        .filter(tx => Number(tx.amountMinor) > 0)
        .reduce((acc, tx) => acc + BigInt(tx.amountMinor), 0n);

      const categoryInputs = groups.flatMap(g =>
        (g.categories ?? []).map(c => {
          const alloc = mAlloc.find(a => a.categoryId === c.id);
          const goal = goals.find(go => go.categoryId === c.id);
          
          let goalDef = null;
          if (goal) {
            goalDef = {
              ...goal,
              amountMinor: BigInt(goal.amountMinor),
              snoozedMonth: goal.snoozedMonth ? goal.snoozedMonth.substring(0, 7) : null
            };
          }

          // MVP: negative transactions in this month for this category
          // Wait, we don't have transactionSplits categorization yet, but if we did:
          // Activity is usually negative. For now, it's 0 since we haven't linked tx to categories.
          const activity = 0n;

          return {
            categoryId: c.id,
            previousAvailable: lastCategoriesState[c.id]?.available || 0n,
            assigned: alloc ? BigInt(alloc.amountMinor) : 0n,
            activity,
            goal: goalDef
          };
        })
      );

      monthState = calculateMonthState({
        month: m,
        previousRTA: lastRTA,
        inflowsToRTA,
        categories: categoryInputs,
      });

      lastRTA = monthState.rta;
      lastCategoriesState = monthState.categories.reduce((acc, cat) => {
        acc[cat.categoryId] = { available: cat.available };
        return acc;
      }, {} as typeof lastCategoriesState);
    }

    // Compute CreditCardStatusDTO for each credit card account (BR-CC-070: no UI calc)
    const cardAccounts = accounts.filter(a => a.type === 'credit_card');
    const ccStatusResults = await Promise.all(
      cardAccounts.map(a => getCreditCardStatus(a.id, currentMonth, activeBudget.id))
    );
    ccStatuses = Object.fromEntries(
      cardAccounts.map((a, i) => [a.id, ccStatusResults[i]]).filter(([, v]) => v !== null) as [string, CreditCardStatusDTO][]
    );

    // Fetch pending import batches for all accounts
    const batchesResults = await Promise.all(
      accounts.map(a => getPendingImportBatch(a.id))
    );
    pendingBatches = Object.fromEntries(
      accounts.map((a, i) => [a.id, batchesResults[i]]).filter(([, v]) => v !== null)
    );
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
      <header style={{ width: '100%', maxWidth: '1280px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>Bolsilludo</h1>
            <p style={{ color: 'var(--text-muted)' }}>Bienvenido, {name}</p>
          </div>
          
          {budgets.length > 0 && activeBudget && (
            <BudgetSelector 
              budgets={budgets.map(b => ({ id: b.id, name: b.name, role: b.role }))} 
              activeBudgetId={activeBudget.id} 
              currentMonth={currentMonth} 
            />
          )}
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
          ccStatuses={ccStatuses}
          pendingBatches={pendingBatches}
          scheduledTransactions={scheduled}
          members={members}
          invitations={invitations}
          userId={user.id}
        />
      )}
    </main>
  );
}
