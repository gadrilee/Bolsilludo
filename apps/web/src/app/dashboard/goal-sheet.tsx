'use client';

import { useState, useTransition } from 'react';
import { createGoal, snoozeGoal, deleteGoal } from '../actions/goals';

type GoalSheetProps = {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  existingGoal: any | null; // GoalResultDTO from engine state + raw goal info
  currentMonth: string;
  onClose: () => void;
};

export function GoalSheet({ budgetId, categoryId, categoryName, existingGoal, currentMonth, onClose }: GoalSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [cadence, setCadence] = useState(existingGoal?.goal?.cadence || 'MONTHLY');
  const [behavior, setBehavior] = useState(existingGoal?.goal?.behavior || 'SET_ASIDE');
  const [amount, setAmount] = useState(existingGoal?.goal?.amountMinor ? (existingGoal.goal.amountMinor / 100).toString() : '');
  
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;

    const formData = new FormData();
    formData.append('budgetId', budgetId);
    formData.append('categoryId', categoryId);
    formData.append('cadence', cadence);
    formData.append('behavior', behavior);
    formData.append('amount', amount);
    
    // Default repeat handling for Weekly/Yearly
    if (cadence === 'WEEKLY') {
        formData.append('weekStartDay', '1'); // Default monday
    }

    startTransition(async () => {
      try {
        await createGoal(formData);
        onClose();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  async function handleDelete() {
    if (!existingGoal?.goal?.id) return;
    startTransition(async () => {
      await deleteGoal(existingGoal.goal.id);
      onClose();
    });
  }

  async function handleSnooze() {
    if (!existingGoal?.goal?.id) return;
    startTransition(async () => {
      await snoozeGoal(existingGoal.goal.id, currentMonth);
      onClose();
    });
  }

  const isSnoozedThisMonth = existingGoal?.goal?.snoozedMonth === currentMonth;

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderLeft: '1px solid var(--glass-border)', boxShadow: '-4px 0 24px rgba(0,0,0,0.5)', padding: '2rem', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Meta: {categoryName}</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
      </div>

      {existingGoal && existingGoal.goalResult && (
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Estado Actual</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: existingGoal.goalResult.status === 'FUNDED' ? 'var(--primary)' : 'var(--text)' }}>
            {(Number(existingGoal.goalResult.targetAmount) / 100).toFixed(2)} Bs
          </p>
          <div style={{ display: 'flex', gap: '2px', height: '8px', margin: '0.5rem 0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ flex: existingGoal.goalResult.progressParts.currentAssigned, background: 'var(--primary)' }} />
            <div style={{ flex: existingGoal.goalResult.progressParts.needed, background: 'rgba(255,255,255,0.1)' }} />
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Necesitas { (Number(existingGoal.goalResult.requiredThisMonth) / 100).toFixed(2) } Bs este mes.
            {isSnoozedThisMonth && <span style={{ color: '#f59e0b', marginLeft: '0.5rem' }}>(Pospuesta)</span>}
          </p>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tipo de Meta</label>
          <select value={cadence} onChange={e => setCadence(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }}>
            <option value="MONTHLY">Mensual</option>
            <option value="WEEKLY">Semanal</option>
            <option value="YEARLY">Anual</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Comportamiento</label>
          <select value={behavior} onChange={e => setBehavior(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }}>
            <option value="SET_ASIDE">Separar fondos (Set Aside)</option>
            <option value="REFILL_UP_TO">Rellenar hasta (Refill Up To)</option>
          </select>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            {behavior === 'SET_ASIDE' ? 'Pide el monto completo cada mes, acumulando sobrantes.' : 'Pide solo lo necesario para llegar al monto meta.'}
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Monto (Bs)</label>
          <input
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)', fontSize: '1rem' }}
          />
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>}

        <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
          <button type="submit" disabled={isPending} style={{ padding: '0.75rem', background: 'var(--primary)', color: 'var(--bg)', border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer' }}>
            {isPending ? 'Guardando...' : 'Guardar Meta'}
          </button>
          
          {existingGoal?.goal?.id && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={handleSnooze} disabled={isPending || isSnoozedThisMonth} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                {isSnoozedThisMonth ? 'Pospuesta' : 'Posponer mes'}
              </button>
              <button type="button" onClick={handleDelete} disabled={isPending} style={{ flex: 1, padding: '0.75rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                Eliminar
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
