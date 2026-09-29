'use client';

import { useState, useTransition } from 'react';
import { createTransaction } from '../actions/transactions';
import { GlassSelect } from './glass-select';

import { ImportWizard } from './import-wizard';
import { ScheduledModal } from './scheduled-modal';
import { nextOccurrence } from '@bolsilludo/budget-engine';
import { postOccurrence } from '../actions/scheduled';

type Group = { id: string; name: string; categories?: { id: string; name: string }[] };

type LedgerViewProps = {
  budgetId: string;
  canEdit: boolean;
  accounts: any[];
  transactions: any[];
  groups?: Group[];
  pendingBatches?: Record<string, any>;
  scheduledTransactions?: any[];
};

export function LedgerView({ budgetId, canEdit, accounts, transactions, groups = [], pendingBatches = {}, scheduledTransactions = [] }: LedgerViewProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  // Imports state
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [activeWizard, setActiveWizard] = useState(false);
  const [importAccountId, setImportAccountId] = useState<string>(accounts[0]?.id ?? '');

  const [showScheduledModal, setShowScheduledModal] = useState(false);

  // Compute upcoming occurrences for scheduled transactions
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingItems = scheduledTransactions.map(sch => {
    const nextDate = nextOccurrence({
      id: sch.id,
      startAt: sch.startAt,
      endAt: sch.endAt,
      frequencyType: sch.frequencyType,
      lastOccurrenceAt: sch.lastOccurrenceAt,
    }, todayStr);
    return nextDate ? { ...sch, nextDate } : null;
  }).filter(Boolean).sort((a: any, b: any) => a.nextDate.localeCompare(b.nextDate));

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

      {!canEdit && (
        <p style={{ padding: '0.75rem 1.5rem', margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Tienes acceso de solo lectura a las transacciones de este presupuesto.
        </p>
      )}

      {/* Quick Add Form */}
      {canEdit && <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            + Nueva Transacción
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowScheduledModal(true)}
              style={{ padding: '0.25rem 0.75rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              🗓️ Programar
            </button>
            <button
              onClick={() => setShowImportWizard(true)}
              style={{ padding: '0.25rem 0.75rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              📥 Importar
            </button>
          </div>
        </div>
        <form id="tx-form" action={handleAddTransaction} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 120px auto', gap: '0.5rem', alignItems: 'center' }}>

          <GlassSelect
            name="accountId"
            required
            placeholder="Cuenta..."
            options={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
          />

          <input
            id="tx-date"
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="glass"
            style={{ padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--text)', fontSize: '0.875rem' }}
          />

          <input
            type="text"
            name="payeeName"
            placeholder="Beneficiario"
            className="glass"
            style={{ padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--text)', fontSize: '0.875rem' }}
          />

          <GlassSelect
            name="categoryId"
            placeholder="Sin categoría (RTA)"
            options={[
              { value: '', label: 'Sin categoría (RTA)' },
              ...allCategories.map(c => ({ value: c.id, label: c.name }))
            ]}
          />

          <input
            type="number"
            name="amount"
            placeholder="Monto (Bs)"
            step="0.01"
            required
            className="glass"
            style={{ padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--text)', fontSize: '0.875rem', textAlign: 'right' }}
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
      </div>}

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
            {upcomingItems.length > 0 && upcomingItems.map((item: any) => {
              const amount = Number(item.amountMinor) / 100;
              return (
                <tr key={`upcoming-${item.id}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)', opacity: 0.7 }}>
                  <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    🗓️ {new Date(item.nextDate).toLocaleDateString('es-BO')} (Próximo)
                  </td>
                  <td style={{ padding: '0.75rem 1.5rem', fontWeight: 500 }}>
                    {item.memo || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin beneficiario</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {item.categoryId ? allCategories.find(c => c.id === item.categoryId)?.name : 'RTA'}
                  </td>
                  <td style={{ padding: '0.75rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {canEdit && !item.autoPost && (
                      <button 
                        onClick={() => startTransition(() => postOccurrence(item.id, item.nextDate))}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer' }}
                      >
                        Aprobar
                      </button>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: 700, color: amount >= 0 ? 'var(--primary)' : 'var(--text)' }}>
                    {amount >= 0 ? '+' : ''}{amount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
            
            {transactions.length === 0 && upcomingItems.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay transacciones aún. Registra la primera arriba.
                </td>
              </tr>
            ) : (
              transactions.map(tx => {
                const amount = Number(tx.amountMinor) / 100;
                const splitCategories = (tx.splits ?? [])
                  .map((split: { categoryId: string | null }) => allCategories.find(category => category.id === split.categoryId)?.name)
                  .filter(Boolean);
                const categoryLabel = splitCategories.length > 0
                  ? splitCategories.join(' + ')
                  : /^transfer/i.test(tx.payeeName ?? '')
                    ? 'Transferencia'
                    : amount > 0 ? 'Por asignar' : 'Sin categoría';
                return (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {new Date(tx.date).toLocaleDateString('es-BO')}
                    </td>
                    <td style={{ padding: '0.75rem 1.5rem', fontWeight: 500 }}>
                      {tx.payeeName || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin beneficiario</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {categoryLabel}
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

      {showImportWizard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Seleccionar Cuenta para Importar</h3>
            <GlassSelect
              name="importAccountId"
              placeholder="Seleccionar Cuenta"
              options={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
            />
            {/* The GlassSelect is uncontrolled with name, so we'll need to listen or just fallback to native select here if state is required */}
            <select
              value={importAccountId}
              onChange={e => setImportAccountId(e.target.value)}
              className="glass"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', color: 'var(--text)', marginBottom: '1rem', marginTop: '1rem' }}
            >
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowImportWizard(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button 
                onClick={() => {
                  setShowImportWizard(false);
                  // We just show the real wizard now
                  const el = document.getElementById(`launch-wizard-${importAccountId}`);
                  if (el) el.click();
                }}
                style={{ flex: 1, padding: '0.75rem', background: 'var(--primary)', border: 'none', color: 'var(--bg)', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Continuar
              </button>
            </div>
            
            {/* Hidden triggers for the actual wizard component which needs to be rendered to process the pending batches */}
            {accounts.map(acc => (
              <button key={acc.id} id={`launch-wizard-${acc.id}`} style={{ display: 'none' }} onClick={() => {
                setImportAccountId(acc.id);
                setActiveWizard(true);
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Notifications for pending batches */}
      {canEdit && Object.entries(pendingBatches).filter(([, batch]) => batch !== null).map(([accId, pending]) => {
        const acc = accounts.find(a => a.id === accId);
        if (!acc) return null;
        return (
          <div key={`notify-${accId}`} style={{ background: 'var(--primary)', color: 'var(--bg)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', marginInline: '1.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Tienes una importación pendiente en {acc.name}</span>
            <button 
              onClick={() => { setImportAccountId(accId); setActiveWizard(true); setShowImportWizard(false); }}
              style={{ padding: '0.5rem 1rem', background: 'var(--bg)', color: 'var(--text)', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
            >
              Revisar Importación
            </button>
          </div>
        );
      })}

      {/* Actual wizard modal */}
      {canEdit && activeWizard && importAccountId && accounts.find(a => a.id === importAccountId) && (
        <ImportWizard
          budgetId={budgetId}
          accountId={importAccountId}
          accountName={accounts.find(a => a.id === importAccountId)!.name}
          pendingBatch={pendingBatches[importAccountId]}
          onClose={() => setActiveWizard(false)}
        />
      )}

      {canEdit && showScheduledModal && (
        <ScheduledModal 
          budgetId={budgetId}
          accounts={accounts}
          groups={groups}
          onClose={() => setShowScheduledModal(false)}
        />
      )}
    </div>
  );
}
