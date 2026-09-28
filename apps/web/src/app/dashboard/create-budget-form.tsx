'use client';

import { useState } from 'react';
import { createBudget } from '../actions/budgets';

export function CreateBudgetForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      await createBudget(formData);
    } catch (err: any) {
      setError(err.message || 'Error al crear presupuesto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: '2.5rem 3rem',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: '1.25rem',
        backdropFilter: 'blur(var(--glass-blur))',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}
    >
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text)' }}>
        Crea tu primer Presupuesto
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Dale un nombre a tu presupuesto para empezar a organizar tu dinero.
      </p>

      <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          name="name"
          placeholder="Ej: Presupuesto Familiar"
          required
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '0.5rem',
            color: 'var(--text)',
            fontSize: '1rem'
          }}
        />

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.875rem',
            background: 'var(--primary)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.2s'
          }}
        >
          {loading ? 'Creando...' : 'Crear Presupuesto'}
        </button>
      </form>
    </div>
  );
}
