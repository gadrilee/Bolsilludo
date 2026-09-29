'use client';

import { useState, useTransition, useOptimistic } from 'react';
import { createCategoryGroup, createCategory } from '../actions/categories';
import { assignMoney } from '../actions/allocations';
import { CreateAccountForm } from './create-account-form';
import { LedgerView } from './ledger-view';

type Category = { id: string; name: string; groupId: string; sortOrder: number; isHidden: number; icon: string | null; createdAt: Date };
type Group = { id: string; name: string; budgetId: string; sortOrder: number; isHidden: number; createdAt: Date; categories: Category[] };
type CategoryState = { categoryId: string; assigned: bigint; activity: bigint; available: bigint };
type MonthState = { rta: bigint; overspentFromPreviousMonth: bigint; categories: CategoryState[] };

type BudgetViewProps = {
  budgetId: string;
  budgetName: string;
  groups: Group[];
  accounts: any[];
  transactions: any[];
  monthState?: MonthState | null;
  currentMonth?: string;
};

export function BudgetView({ budgetId, budgetName, groups, accounts, transactions, monthState, currentMonth }: BudgetViewProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [addingCategoryToGroup, setAddingCategoryToGroup] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'budget' | 'ledger'>('budget');
  const [isPending, startTransition] = useTransition();

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await createCategoryGroup(budgetId, newGroupName.trim());
    setNewGroupName('');
  }

  async function handleAddCategory(groupId: string) {
    if (!newCategoryName.trim()) return;
    await createCategory(groupId, newCategoryName.trim());
    setNewCategoryName('');
    setAddingCategoryToGroup(null);
  }

  // RTA from the pure budget engine (always a bigint, display in currency units)
  const rtaMinor = monthState ? Number(monthState.rta) : 0;
  const rtaDisplay = (rtaMinor / 100).toFixed(2);
  const rtaColor = rtaMinor > 0 ? 'var(--primary)' : rtaMinor < 0 ? 'var(--danger)' : 'var(--text)';

  // Total balance across all accounts
  const totalBalance = accounts.reduce((sum, acc) => {
    const accBalance = transactions
      .filter(tx => tx.accountId === acc.id)
      .reduce((s, tx) => s + Number(tx.amountMinor), 0);
    return sum + accBalance;
  }, 0);

  return (
    <div style={{ width: '100%', maxWidth: '1280px', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>

      {/* Sidebar: Accounts */}
      <aside style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ padding: '1.5rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Cuentas
          </h2>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {accounts.length === 0 ? (
              <li style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                Sin cuentas aún.
              </li>
            ) : (
              accounts.map(acc => {
                const accBalance = transactions
                  .filter(tx => tx.accountId === acc.id)
                  .reduce((sum, tx) => sum + Number(tx.amountMinor), 0);
                return (
                  <li key={acc.id} style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
                    <span style={{ color: 'var(--text)' }}>{acc.name}</span>
                    <span style={{ fontWeight: 600, color: accBalance >= 0 ? 'var(--text)' : 'var(--danger)' }}>
                      {(accBalance / 100).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                  </li>
                );
              })
            )}
          </ul>

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total</span>
            <span style={{ fontWeight: 700, color: totalBalance >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
              {(totalBalance / 100).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={() => setShowAccountModal(true)}
            style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', background: 'transparent', border: '1px dashed var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            + Añadir Cuenta
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>

        {/* Tabs */}
        <nav style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
          {(['budget', 'ledger'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1.25rem',
                background: activeTab === tab ? 'var(--primary)' : 'transparent',
                color: activeTab === tab ? 'var(--bg)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.15s ease',
              }}
            >
              {tab === 'budget' ? '📊 Presupuesto' : '📋 Transacciones'}
            </button>
          ))}
        </nav>

        {activeTab === 'budget' ? (
          <>
            {/* Ready to Assign Banner */}
            <div style={{
              background: rtaMinor >= 0 ? 'var(--primary)' : 'var(--danger)',
              color: 'var(--bg)',
              borderRadius: '1rem',
              padding: '1.5rem 2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: rtaMinor >= 0 ? '0 4px 24px rgba(16,185,129,0.25)' : '0 4px 24px rgba(239,68,68,0.25)',
            }}>
              <div>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85, marginBottom: '0.25rem' }}>
                  Listo para Asignar
                </p>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>
                  Bs {rtaDisplay}
                </h2>
                <p style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: '0.25rem' }}>
                  {rtaMinor > 0 ? 'Asigna todos tus ingresos hasta llegar a cero.' : rtaMinor < 0 ? '¡Sobregiro! Cubre el déficit en tus categorías.' : '¡Perfecto! Todo está asignado.'}
                </p>
              </div>
              <div style={{ textAlign: 'right', opacity: 0.8 }}>
                <p style={{ fontSize: '0.75rem' }}>{currentMonth}</p>
              </div>
            </div>

            {/* Category Groups */}
            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem', overflow: 'hidden' }}>

              {/* Header row */}
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Categorías</h3>
                <form onSubmit={handleAddGroup} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Nuevo grupo..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    style={{ padding: '0.4rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)', fontSize: '0.875rem' }}
                  />
                  <button type="submit" style={{ padding: '0.4rem 0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    + Grupo
                  </button>
                </form>
              </div>

              {/* Column headers */}
              {groups.length > 0 && (
                <div style={{ padding: '0.5rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}>
                  {['Asignado', 'Actividad', 'Disponible'].map(col => (
                    <span key={col} style={{ width: '100px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {col}
                    </span>
                  ))}
                </div>
              )}

              {groups.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p style={{ marginBottom: '0.5rem' }}>No tienes grupos de categorías todavía.</p>
                  <p style={{ fontSize: '0.875rem' }}>Crea tu primer grupo usando el campo de arriba.</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    {/* Group header */}
                    <div style={{ padding: '0.6rem 1.5rem', background: 'rgba(255,255,255,0.025)', fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {group.name}
                    </div>

                    {/* Categories */}
                    {group.categories?.map((cat) => {
                      const catState = monthState?.categories.find(c => c.categoryId === cat.id);
                      const assigned = catState ? Number(catState.assigned) / 100 : 0;
                      const activity = catState ? Number(catState.activity) / 100 : 0;
                      const available = catState ? Number(catState.available) / 100 : 0;

                      return (
                        <div
                          key={cat.id}
                          style={{ padding: '0.6rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        >
                          <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{cat.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {/* Assigned input */}
                            <div style={{ width: '100px', textAlign: 'right' }}>
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={assigned.toFixed(2)}
                                onBlur={(e) => {
                                  if (currentMonth) {
                                    const val = Math.round(Number(e.target.value) * 100);
                                    startTransition(() => { assignMoney(cat.id, currentMonth, BigInt(val)); });
                                  }
                                }}
                                style={{
                                  width: '90px',
                                  textAlign: 'right',
                                  padding: '0.3rem 0.4rem',
                                  background: 'var(--bg)',
                                  border: '1px solid var(--glass-border)',
                                  color: 'var(--text)',
                                  borderRadius: '0.3rem',
                                  fontSize: '0.875rem',
                                }}
                              />
                            </div>
                            {/* Activity */}
                            <span style={{ width: '100px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                              {activity.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </span>
                            {/* Available */}
                            <span style={{ width: '100px', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: available > 0 ? 'var(--primary)' : available < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                              {available.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add category row */}
                    <div style={{ padding: '0.4rem 1.5rem' }}>
                      {addingCategoryToGroup === group.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            autoFocus
                            type="text"
                            placeholder="Nombre de la categoría..."
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddCategory(group.id);
                              if (e.key === 'Escape') { setAddingCategoryToGroup(null); setNewCategoryName(''); }
                            }}
                            style={{ padding: '0.3rem 0.5rem', background: 'var(--bg)', border: '1px solid var(--primary)', borderRadius: '0.3rem', color: 'var(--text)', fontSize: '0.875rem', flex: 1 }}
                          />
                          <button onClick={() => handleAddCategory(group.id)} style={{ padding: '0.3rem 0.6rem', background: 'var(--primary)', border: 'none', color: 'var(--bg)', borderRadius: '0.3rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                            OK
                          </button>
                          <button onClick={() => { setAddingCategoryToGroup(null); setNewCategoryName(''); }} style={{ padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', borderRadius: '0.3rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingCategoryToGroup(group.id)}
                          style={{ color: 'var(--text-muted)', fontSize: '0.8rem', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
                        >
                          + Añadir categoría
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <LedgerView budgetId={budgetId} accounts={accounts} transactions={transactions} groups={groups} />
        )}
      </div>

      {showAccountModal && (
        <CreateAccountForm budgetId={budgetId} onClose={() => setShowAccountModal(false)} />
      )}
    </div>
  );
}
