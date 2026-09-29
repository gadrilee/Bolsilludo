'use client';

import { useState, useTransition } from 'react';
import { createTransaction } from '../actions/transactions';

type Group = { id: string; name: string; categories?: { id: string; name: string }[] };

type LedgerViewProps = {
  budgetId: string;
  accounts: any[];
  transactions: any[];
  groups?: Group[];
};

export function LedgerView({ budgetId, accounts, transactions, groups = [] }: LedgerViewProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Flatten all categories for the category selector
  const allCategories = groups.flatMap(g =>
    (g.categories ?? []).map(c => ({ id: c.id, name: `${g.name} › ${c.name}` }))
  );

  async function handleAddTransaction(formData: FormData) {
    setError(null);
    formData.append('budgetId', budgetId);

    // Convert from display units (e.g. 150.00) to minor units (15000 centavos)
    const rawAmount = formData.get('amount') as string;
    const amountMinor = Math.round(Number(rawAmount) * 100).toString();
    formData.set('amount', amountMinor);

    startTransition(async () => {
      try {
        await createTransaction(formData);
        (document.getElementById('tx-form') as HTMLFormElement)?.reset();
        // Reset date to today after form reset
        const dateInput = document.getElementById('tx-date') as HTMLInputElement;
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
      } catch (e: any) {
        setError(e.message ?? 'Error al guardar la transacción.');
      }
    });
  }

  return (
    <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem', overflow: 'hidden' }}>

      {/* Quick Add Form */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          + Nueva Transacción
        </h3>
        <form id="tx-form" action={handleAddTransaction} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 120px auto', gap: '0.5rem', alignItems: 'center' }}>

          <select
            name="accountId"
            required
            style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)', fontSize: '0.875rem' }}
          >
            <option value="">Cuenta...</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>

          <input
            id="tx-date"
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)', fontSize: '0.875rem' }}
          />

          <input
            type="text"
            name="payeeName"
            placeholder="Beneficiario"
            style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)', fontSize: '0.875rem' }}
          />

          <select
            name="categoryId"
            style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)', fontSize: '0.875rem' }}
          >
            <option value="">Sin categoría (RTA)</option>
            {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <input
            type="number"
            name="amount"
            placeholder="Monto (Bs)"
            step="0.01"
            required
            style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)', fontSize: '0.875rem', textAlign: 'right' }}
          />

          <button
            type="submit"
            disabled={isPending}
            style={{ padding: '0.5rem 1rem', background: 'var(--primary)', border: 'none', color: 'var(--bg)', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap' }}
          >
            {isPending ? '...' : 'Guardar'}
          </button>
        </form>

        {error && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {error}
          </p>
        )}

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          💡 Usa montos <strong>positivos</strong> para ingresos y <strong>negativos</strong> para gastos (ej: -150.50)
        </p>
      </div>

      {/* Transactions Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>Fecha</th>
              <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>Beneficiario</th>
              <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>Categoría</th>
              <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>Nota</th>
              <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay transacciones aún. Registra la primera arriba.
                </td>
              </tr>
            ) : (
              transactions.map(tx => {
                const amount = Number(tx.amountMinor) / 100;
                return (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {new Date(tx.date).toLocaleDateString('es-BO')}
                    </td>
                    <td style={{ padding: '0.75rem 1.5rem', fontWeight: 500 }}>
                      {tx.payeeName || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin beneficiario</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      RTA
                    </td>
                    <td style={{ padding: '0.75rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {tx.memo || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: 700, color: amount >= 0 ? 'var(--primary)' : 'var(--text)' }}>
                      {amount >= 0 ? '+' : ''}{amount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
