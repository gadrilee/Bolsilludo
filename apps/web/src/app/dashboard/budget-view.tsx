import { useState } from 'react';
import { createCategoryGroup, createCategory } from '../actions/categories';
import { CreateAccountForm } from './create-account-form';

type BudgetViewProps = {
  budgetId: string;
  budgetName: string;
  groups: any[]; 
  accounts: any[];
};

export function BudgetView({ budgetId, budgetName, groups, accounts }: BudgetViewProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName) return;
    await createCategoryGroup(budgetId, newGroupName);
    setNewGroupName('');
  }

  // Calculate Total Ready to Assign
  // In a real app this is derived from the Budget Engine (all unassigned transactions + starting balances)
  // For now, let's just sum the account balances from the UI mockup perspective.
  // Wait, accounts don't have balance column, transactions do. We mock this for now.
  const mockRTA = 0; 

  return (
    <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
      
      {/* Sidebar: Accounts */}
      <aside style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cuentas</h3>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {accounts.length === 0 ? (
              <li style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sin cuentas aún.</li>
            ) : (
              accounts.map(acc => (
                <li key={acc.id} style={{ fontSize: '0.95rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{acc.name}</span>
                </li>
              ))
            )}
          </ul>

          <button 
            onClick={() => setShowAccountModal(true)}
            style={{ marginTop: '1.5rem', width: '100%', padding: '0.5rem', background: 'transparent', border: '1px dashed var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)', cursor: 'pointer' }}
          >
            + Añadir Cuenta
          </button>
        </div>
      </aside>

      {/* Main: Budget */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Ready to Assign Banner */}
        <div
          style={{
            background: 'var(--primary)',
            color: 'var(--bg)',
            borderRadius: '1rem',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.2)'
          }}
        >
          <p style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
            Listo para Asignar
          </p>
          <h2 style={{ fontSize: '3rem', fontWeight: 700, margin: '0.5rem 0' }}>${(mockRTA / 100).toFixed(2)}</h2>
          <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
            Asigna todos tus ingresos hasta llegar a cero.
          </p>
        </div>

        {/* Categories Section */}
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Categorías</h3>
            <form onSubmit={handleAddGroup} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Nuevo grupo..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                style={{ padding: '0.5rem 1rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }}
              />
              <button type="submit" style={{ padding: '0.5rem 1rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                + Grupo
              </button>
            </form>
          </div>

          <div>
            {groups.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No tienes categorías todavía. Crea tu primer grupo arriba.
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.02)', fontWeight: 600, color: 'var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{group.name}</span>
                  </div>
                  <div style={{ padding: '0.5rem 1.5rem' }}>
                    <button style={{ color: 'var(--text-muted)', fontSize: '0.875rem', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem 0' }}>
                      + Añadir categoría
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showAccountModal && (
        <CreateAccountForm budgetId={budgetId} onClose={() => setShowAccountModal(false)} />
      )}
    </div>
  );
}
