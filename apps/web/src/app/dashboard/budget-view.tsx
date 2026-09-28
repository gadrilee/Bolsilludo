'use client';

import { useState } from 'react';
import { createCategoryGroup, createCategory } from '../actions/categories';

type BudgetViewProps = {
  budgetId: string;
  budgetName: string;
  groups: any[]; // We will type this properly later
};

export function BudgetView({ budgetId, budgetName, groups }: BudgetViewProps) {
  const [newGroupName, setNewGroupName] = useState('');

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName) return;
    await createCategoryGroup(budgetId, newGroupName);
    setNewGroupName('');
  }

  return (
    <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
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
        <h2 style={{ fontSize: '3rem', fontWeight: 700, margin: '0.5rem 0' }}>$0.00</h2>
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
                {/* Categories inside this group would go here */}
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
  );
}
