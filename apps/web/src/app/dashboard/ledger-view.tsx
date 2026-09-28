'use client';

import { useState } from 'react';
import { createTransaction } from '../actions/transactions';

type LedgerViewProps = {
  budgetId: string;
  accounts: any[];
  transactions: any[];
};

export function LedgerView({ budgetId, accounts, transactions }: LedgerViewProps) {
  const [loading, setLoading] = useState(false);
  
  async function handleAddTransaction(formData: FormData) {
    setLoading(true);
    formData.append('budgetId', budgetId);
    try {
      await createTransaction(formData);
      (document.getElementById('tx-form') as HTMLFormElement).reset();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem', overflow: 'hidden' }}>
      
      {/* Quick Add Transaction Form */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>+ Nueva Transacción</h3>
        <form id="tx-form" action={handleAddTransaction} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select name="accountId" required style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }}>
            <option value="">Cuenta...</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
          <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }} />
          <input type="text" name="payeeName" placeholder="Beneficiario (Payee)" style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)', flex: 1 }} />
          <input type="text" name="memo" placeholder="Nota" style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)', flex: 1 }} />
          <input type="number" name="amount" placeholder="Monto (centavos)" required style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)', width: '120px' }} />
          <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', border: 'none', color: 'var(--bg)', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
            {loading ? '...' : 'Guardar'}
          </button>
        </form>
      </div>

      {/* Transactions List */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Fecha</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Beneficiario</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Categoría</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Nota</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, textAlign: 'right' }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay transacciones aún.</td>
              </tr>
            ) : (
              transactions.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '0.75rem 1.5rem' }}>{new Date(tx.date).toLocaleDateString()}</td>
                  <td style={{ padding: '0.75rem 1.5rem', fontWeight: 500 }}>{tx.payeeName}</td>
                  <td style={{ padding: '0.75rem 1.5rem', color: 'var(--text-muted)' }}>RTA (Temporal)</td>
                  <td style={{ padding: '0.75rem 1.5rem', color: 'var(--text-muted)' }}>{tx.memo}</td>
                  <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: 600, color: Number(tx.amountMinor) >= 0 ? 'var(--primary)' : 'var(--text)' }}>
                    ${(Number(tx.amountMinor) / 100).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
