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
  if (activeBudget) {
    groups = await getCategories(activeBudget.id);
    accounts = await getAccounts(activeBudget.id);
    transactions = await getTransactions(activeBudget.id);
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
        <BudgetView budgetId={activeBudget.id} budgetName={activeBudget.name} groups={groups} accounts={accounts} />
      )}
    </main>
  );
}
