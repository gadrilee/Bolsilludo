'use client';

import { useState, useTransition, useOptimistic } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createCategoryGroup, createCategory } from '../actions/categories';
import { assignMoney } from '../actions/allocations';
import { CreateAccountForm } from './create-account-form';
import { LedgerView } from './ledger-view';
import { GoalSheet } from './goal-sheet';
import { CreditCardCard } from './credit-card-card';
import { ReportsView } from './reports-view';
import { MembersView } from './members-view';
import { MonthPicker } from './month-picker';
import { sumAccountBalanceAsOf, type CreditCardStatusDTO } from '@bolsilludo/budget-engine';

type Category = { id: string; name: string; groupId: string; sortOrder: number; isHidden: number; icon: string | null; createdAt: Date };
type Group = { id: string; name: string; budgetId: string; sortOrder: number; isHidden: number; createdAt: Date; categories: Category[] };
type CategoryState = { categoryId: string; assigned: bigint; activity: bigint; available: bigint; goalResult?: any };
type MonthState = { rta: bigint; overspentFromPreviousMonth: bigint; categories: CategoryState[] };

type BudgetViewProps = {
  budgetId: string;
  budgetName: string;
  role: string;
  groups: Group[];
  accounts: any[];
  transactions: any[];
  monthState?: MonthState | null;
  currentMonth?: string;
  ccStatuses?: Record<string, CreditCardStatusDTO>;
  pendingBatches?: Record<string, any>;
  scheduledTransactions?: any[];
  members?: any[];
  invitations?: any[];
  userId?: string;
};

export function BudgetView({ budgetId, budgetName, role, groups, accounts, transactions, monthState, currentMonth, ccStatuses = {}, pendingBatches = {}, scheduledTransactions = [], members = [], invitations = [], userId = '' }: BudgetViewProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [addingCategoryToGroup, setAddingCategoryToGroup] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'budget' | 'ledger' | 'reports' | 'members'>('budget');
  const [selectedCategoryGoal, setSelectedCategoryGoal] = useState<{ id: string, name: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const canEdit = role === 'owner' || role === 'admin' || role === 'editor';

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

  // Total balance across all accounts (only non-credit accounts for net worth)
  const regularAccounts = accounts.filter(a => a.type !== 'credit_card');
  const creditCardAccounts = accounts.filter(a => a.type === 'credit_card');
  
  const asOf = new Date();
  const balancesByAccount = new Map(accounts.map((account) => [
    account.id,
    sumAccountBalanceAsOf(transactions, account.id, asOf),
  ]));
  const totalBalanceMinor = Array.from(balancesByAccount.values()).reduce((sum, balance) => sum + balance, 0n);
  const totalBalance = Number(totalBalanceMinor);

  // Net worth = assets + liabilities (cards are negative)
  const netWorth = totalBalance;

  return (
    <div style={{ width: '100%', maxWidth: '1280px', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>

      {/* Sidebar: Accounts */}
      <aside style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Regular Accounts */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Cuentas
          </h2>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {regularAccounts.length === 0 ? (
              <li style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                Sin cuentas aún.
              </li>
            ) : (
              regularAccounts.map(acc => {
                const accBalance = Number(balancesByAccount.get(acc.id) ?? 0n);
                return (
                  <li key={acc.id} style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
                    <span style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {acc.type === 'checking' ? '🏦' : acc.type === 'savings' ? '💰' : acc.type === 'loan' ? '📋' : '💵'}
                      {acc.name}
                    </span>
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
            <span style={{ fontWeight: 700, color: netWorth >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
              {(netWorth / 100).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {canEdit && <button
            onClick={() => setShowAccountModal(true)}
            style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', background: 'transparent', border: '1px dashed var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            + Añadir Cuenta
          </button>}
        </div>

        {/* Credit Card Accounts */}
        {creditCardAccounts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0, padding: '0 0.25rem' }}>
              Tarjetas de Crédito
            </h2>
            {creditCardAccounts.map(cc => (
              <CreditCardCard
                key={cc.id}
                account={cc}
                budgetId={budgetId}
                accounts={accounts}
                status={ccStatuses[cc.id] ?? null}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </aside>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>

        {/* Tabs */}
        <nav style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
          {(['budget', 'ledger', 'reports', 'members'] as const).map(tab => (
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
              {tab === 'budget' ? '📊 Presupuesto' : tab === 'ledger' ? '📋 Transacciones' : tab === 'reports' ? '📈 Reportes' : '👥 Config. y Miembros'}
            </button>
          ))}
        </nav>

        {activeTab === 'budget' ? (
          <>
            {/* Ready to Assign Banner */}
            <div className="glass" style={{
              background: rtaMinor >= 0 ? 'rgba(22, 183, 140, 0.25)' : 'rgba(239, 68, 68, 0.25)',
              borderColor: rtaMinor >= 0 ? 'rgba(22, 183, 140, 0.5)' : 'rgba(239, 68, 68, 0.5)',
              color: 'var(--text)',
              borderRadius: '1rem',
              padding: '1.5rem 2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: rtaMinor >= 0 ? '0 4px 32px rgba(22, 183, 140, 0.15)' : '0 4px 32px rgba(239, 68, 68, 0.15)',
            }}>
              <div>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85, marginBottom: '0.25rem' }}>
                  Listo para Asignar
                </p>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: rtaMinor >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                  Bs {rtaDisplay}
                </h2>
                <p style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: '0.25rem' }}>
                  {rtaMinor > 0 ? 'Asigna todos tus ingresos hasta llegar a cero.' : rtaMinor < 0 ? '¡Sobregiro! Cubre el déficit en tus categorías.' : '¡Perfecto! Todo está asignado.'}
                </p>
              </div>
              <div style={{ textAlign: 'right', opacity: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MonthPicker currentMonth={currentMonth || ''} budgetId={budgetId} />
              </div>
            </div>

            {/* Category Groups */}
            <div className="glass" style={{ borderRadius: '1rem', overflow: 'hidden' }}>

              {/* Header row */}
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Categorías</h3>
                {canEdit && <form onSubmit={handleAddGroup} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Nuevo grupo..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="glass"
                    style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', color: 'var(--text)', fontSize: '0.875rem' }}
                  />
                  <button type="submit" className="glass" style={{ padding: '0.4rem 0.75rem', color: 'var(--text)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    + Grupo
                  </button>
                </form>}
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
                  {canEdit && <p style={{ fontSize: '0.875rem' }}>Crea tu primer grupo usando el campo de arriba.</p>}
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <button
                              disabled={!canEdit}
                              onClick={() => setSelectedCategoryGoal({ id: cat.id, name: cat.name })}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text)', textAlign: 'left', cursor: canEdit ? 'pointer' : 'default', padding: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                              {cat.name}
                              {catState?.goalResult && (
                                <span style={{ 
                                  display: 'inline-block', 
                                  width: '8px', height: '8px', 
                                  borderRadius: '50%', 
                                  background: catState.goalResult.status === 'FUNDED' ? 'var(--primary)' : catState.goalResult.status === 'SNOOZED' ? '#f59e0b' : 'var(--danger)' 
                                }} title={catState.goalResult.status} />
                              )}
                            </button>
                            {catState?.goalResult && catState.goalResult.status !== 'SNOOZED' && (
                              <div style={{ width: '100px', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', display: 'flex' }}>
                                <div style={{ flex: catState.goalResult.progressParts.currentAssigned, background: 'var(--primary)' }} />
                                <div style={{ flex: catState.goalResult.progressParts.needed, background: 'transparent' }} />
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {/* Assigned input */}
                            <div style={{ width: '100px', textAlign: 'right' }}>
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={assigned.toFixed(2)}
                                disabled={!canEdit}
                                onBlur={(e) => {
                                  if (currentMonth) {
                                    const val = Math.round(Number(e.target.value) * 100);
                                    startTransition(() => { assignMoney(cat.id, currentMonth, BigInt(val)); });
                                  }
                                }}
                                className="glass"
                                style={{
                                  width: '90px',
                                  textAlign: 'right',
                                  padding: '0.3rem 0.4rem',
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
                    {canEdit && <div style={{ padding: '0.4rem 1.5rem' }}>
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
                    </div>}
                  </div>
                ))
              )}
            </div>
          </>
        ) : activeTab === 'ledger' ? (
          <LedgerView 
            budgetId={budgetId} 
            accounts={accounts} 
            transactions={transactions} 
            groups={groups} 
            pendingBatches={pendingBatches}
            scheduledTransactions={scheduledTransactions}
            canEdit={canEdit}
          />
        ) : activeTab === 'reports' ? (
          <ReportsView budgetId={budgetId} canExport={canEdit} />
        ) : (
          <MembersView budgetId={budgetId} members={members} invitations={invitations} userId={userId} />
        )}
      </div>

      {canEdit && showAccountModal && (
        <CreateAccountForm budgetId={budgetId} onClose={() => setShowAccountModal(false)} />
      )}

      {canEdit && selectedCategoryGoal && (
        <GoalSheet
          budgetId={budgetId}
          categoryId={selectedCategoryGoal.id}
          categoryName={selectedCategoryGoal.name}
          existingGoal={monthState?.categories.find(c => c.categoryId === selectedCategoryGoal.id) as any}
          currentMonth={currentMonth ?? ''}
          onClose={() => setSelectedCategoryGoal(null)}
        />
      )}
    </div>
  );
}
