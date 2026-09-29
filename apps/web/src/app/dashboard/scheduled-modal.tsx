'use client';

import { useState, useTransition } from 'react';
import { createScheduledTransaction } from '../actions/scheduled';

export function ScheduledModal({ budgetId, accounts, groups, onClose }: any) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allCategories = groups.flatMap((g: any) =>
    (g.categories ?? []).map((c: any) => ({ id: c.id, name: `${g.name} › ${c.name}` }))
  );

  function handleSave(formData: FormData) {
    setError(null);
    formData.append('budgetId', budgetId);
    
    startTransition(async () => {
      try {
        await createScheduledTransaction(formData);
        onClose();
      } catch (e: any) {
        setError(e.message ?? 'Error saving scheduled transaction.');
      }
    });
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '400px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Nueva Transacción Programada</h3>
        
        <form action={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Frecuencia</label>
            <select name="frequencyType" required style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }}>
              <option value="MONTHLY">Mensual</option>
              <option value="WEEKLY">Semanal</option>
              <option value="BIWEEKLY">Quincenal</option>
              <option value="YEARLY">Anual</option>
              <option value="ONCE">Una vez</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Fecha de inicio (ancla)</label>
            <input type="date" name="startAt" required defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Cuenta</label>
            <select name="accountId" required style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }}>
              <option value="">Seleccionar cuenta...</option>
              {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Monto (Bs) — Negativo para gastos</label>
            <input type="number" name="amount" step="0.01" required placeholder="-150.00" style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Beneficiario</label>
            <input type="text" name="payeeName" required placeholder="Netflix, Alquiler, etc." style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Categoría (Opcional)</label>
            <select name="categoryId" style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }}>
              <option value="">Ninguna</option>
              {allCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input type="checkbox" name="autoPost" value="true" />
            Registrar automáticamente (Auto-Post)
          </label>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={isPending} style={{ flex: 1, padding: '0.75rem', background: 'var(--primary)', border: 'none', color: 'var(--bg)', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer' }}>
              {isPending ? 'Guardando...' : 'Programar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
