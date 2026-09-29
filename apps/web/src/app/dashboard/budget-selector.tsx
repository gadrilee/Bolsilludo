'use client';

import { useRouter } from 'next/navigation';

type Budget = {
  id: string;
  name: string;
  role: string;
};

type Props = {
  budgets: Budget[];
  activeBudgetId: string;
  currentMonth: string;
};

export function BudgetSelector({ budgets, activeBudgetId, currentMonth }: Props) {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <select 
        name="budgetId" 
        defaultValue={activeBudgetId} 
        onChange={(e) => {
          const selectedId = e.target.value;
          if (selectedId) {
            router.push(`/dashboard?budgetId=${selectedId}&month=${currentMonth}`);
          }
        }}
        style={{
          padding: '0.5rem 2rem 0.5rem 1rem',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: '0.5rem',
          color: 'var(--text)',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.5rem center',
          backgroundSize: '1rem'
        }}
      >
        {budgets.map(b => (
          <option key={b.id} value={b.id} style={{ color: '#000' }}>
            {b.name} ({b.role})
          </option>
        ))}
      </select>
    </div>
  );
}
