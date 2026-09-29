'use client';

import { useState } from 'react';
import { createAccount } from '../actions/accounts';

const ACCOUNT_TYPES = [
  { value: 'checking', label: '🏦 Cuenta Corriente', desc: 'Cuenta bancaria estándar' },
  { value: 'savings', label: '💰 Caja de Ahorro', desc: 'Cuenta de ahorro' },
  { value: 'cash', label: '💵 Efectivo', desc: 'Dinero en mano' },
  { value: 'credit_card', label: '💳 Tarjeta de Crédito', desc: 'Se crea categoría de pago automáticamente' },
  { value: 'loan', label: '📋 Préstamo', desc: 'Seguimiento de deuda (pasivo)' },
];

export function CreateAccountForm({ budgetId, onClose }: { budgetId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('checking');

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.append('budgetId', budgetId);

    try {
      await createAccount(formData);
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar la cuenta.');
    } finally {
      setLoading(false);
    }
  }

  const isCreditCard = selectedType === 'credit_card';
  const isLoan = selectedType === 'loan';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
    }}>
      <div className="glass" style={{
        padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '440px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Agregar Cuenta</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
        </div>

        <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Account Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Nombre de la cuenta
            </label>
            <input
              name="name"
              required
              placeholder="Ej. Visa Gold / Banco Mercantil"
              className="glass"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', color: 'var(--text)', boxSizing: 'border-box' }}
            />
          </div>

          {/* Account Type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Tipo de cuenta
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ACCOUNT_TYPES.map(t => (
                <label
                  key={t.value}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer',
                    border: `1px solid ${selectedType === t.value ? 'var(--primary)' : 'var(--glass-border)'}`,
                    background: selectedType === t.value ? 'rgba(16,185,129,0.08)' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t.value}
                    checked={selectedType === t.value}
                    onChange={() => setSelectedType(t.value)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{t.label}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Credit card note */}
          {isCreditCard && (
            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              💳 Se creará automáticamente la categoría <strong>"Pago: [nombre]"</strong> en el grupo <strong>"Pagos de Tarjetas"</strong>.
            </div>
          )}

          {/* Opening Balance */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {isCreditCard ? 'Deuda actual (Bs)' : isLoan ? 'Saldo de préstamo (Bs)' : 'Saldo inicial (Bs)'}
            </label>
            <input
              name="balance"
              type="number"
              step="0.01"
              defaultValue="0"
              className="glass"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', color: 'var(--text)', boxSizing: 'border-box' }}
            />
            {isCreditCard && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Ingresa la deuda existente como número positivo. El sistema lo registrará como saldo negativo.
              </p>
            )}
          </div>

          {/* Currency (hidden, default BOB) */}
          <input type="hidden" name="currency" value="BOB" />

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'var(--bg)', borderRadius: '0.5rem', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
              {loading ? 'Guardando...' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
