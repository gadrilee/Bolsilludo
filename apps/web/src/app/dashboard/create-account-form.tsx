'use client';

import { useState } from 'react';
import { createAccount } from '../actions/accounts';

export function CreateAccountForm({ budgetId, onClose }: { budgetId: string, onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    formData.append('budgetId', budgetId);
    
    // In a real app we parse a proper currency input into integer money.
    // For now we just append a placeholder parsing if needed, assuming user enters minor units.
    try {
      await createAccount(formData);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--glass-border)',
        padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '400px'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Agregar Cuenta</h3>
        <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre de la cuenta</label>
            <input name="name" required placeholder="Ej. Banco Mercantil" style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Tipo</label>
            <select name="type" required style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }}>
              <option value="checking">Cuenta Corriente</option>
              <option value="savings">Caja de Ahorro</option>
              <option value="cash">Efectivo</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Saldo Inicial (en centavos)</label>
            <input name="balance" type="number" defaultValue="0" style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'var(--bg)', borderRadius: '0.5rem', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Guardando...' : 'Guardar Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
