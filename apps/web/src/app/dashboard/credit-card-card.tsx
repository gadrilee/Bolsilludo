'use client';

import { useState, useTransition } from 'react';
import { transferMoney } from '../actions/transactions';
import type { CreditCardStatusDTO } from '@bolsilludo/budget-engine';

type CreditCardCardProps = {
  account: {
    id: string;
    name: string;
    type: string;
  };
  budgetId: string;
  accounts: { id: string; name: string; type: string }[];
  status: CreditCardStatusDTO | null;
  canEdit: boolean;
};

function StatusBadge({ status }: { status: CreditCardStatusDTO['status'] | undefined }) {
  if (!status) return null;
  const config: Record<string, { label: string; color: string; bg: string }> = {
    FUNDED:                  { label: '✓ Cubierta',        color: 'var(--primary)', bg: 'rgba(16,185,129,0.1)' },
    PAYMENT_UNDERFUNDED:     { label: '⚠ Falta cobertura', color: '#f59e0b',        bg: 'rgba(245,158,11,0.1)' },
    PAYMENT_OVERSHOOT:       { label: '🔴 Sobrepago',       color: 'var(--danger)',  bg: 'rgba(239,68,68,0.1)'  },
    POSITIVE_CREDIT_BALANCE: { label: '+ Saldo a favor',   color: 'var(--primary)', bg: 'rgba(16,185,129,0.1)' },
  };
  const cfg = config[status] ?? { label: status, color: 'var(--text-muted)', bg: 'transparent' };
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
      {cfg.label}
    </span>
  );
}

export function CreditCardCard({ account, budgetId, accounts, status, canEdit }: CreditCardCardProps) {
  const [showPayModal, setShowPayModal] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [fromAccount, setFromAccount] = useState('');
  const [isPending, startTransition] = useTransition();
  const [payError, setPayError] = useState<string | null>(null);

  const eligibleFromAccounts = accounts.filter(a => a.id !== account.id && a.type !== 'credit_card');

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payAmount || !fromAccount) return;
    setPayError(null);

    const formData = new FormData();
    formData.append('budgetId', budgetId);
    formData.append('fromAccountId', fromAccount);
    formData.append('toAccountId', account.id);
    formData.append('amount', payAmount);
    formData.append('date', new Date().toISOString().split('T')[0]);

    startTransition(async () => {
      try {
        await transferMoney(formData);
        setShowPayModal(false);
        setPayAmount('');
      } catch (err: any) {
        setPayError(err.message);
      }
    });
  }

  const workingBalance = status ? Number(status.workingBalance) / 100 : 0;
  const paymentAvailable = status ? Number(status.paymentAvailable) / 100 : 0;
  const coveragePct = status?.coveragePct ?? 0;
  const underfunded = status ? Number(status.underfundedAmount) / 100 : 0;

  return (
    <>
      <div style={{
        background: 'var(--glass-bg)', border: `1px solid ${status?.status === 'PAYMENT_UNDERFUNDED' ? 'rgba(245,158,11,0.4)' : status?.status === 'PAYMENT_OVERSHOOT' ? 'rgba(239,68,68,0.4)' : 'var(--glass-border)'}`,
        borderRadius: '0.75rem', padding: '1rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>💳</span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{account.name}</span>
            </div>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: workingBalance < 0 ? 'var(--text)' : 'var(--primary)', marginTop: '0.25rem' }}>
              {workingBalance.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs
            </p>
          </div>
          <StatusBadge status={status?.status} />
        </div>

        {/* Coverage bar */}
        {status && status.status !== 'POSITIVE_CREDIT_BALANCE' && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              <span>Pago disponible: <strong>{paymentAvailable.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs</strong></span>
              <span>Cobertura {Math.min(100, Math.round(coveragePct))}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, coveragePct)}%`,
                background: coveragePct >= 100 ? 'var(--primary)' : coveragePct >= 50 ? '#f59e0b' : 'var(--danger)',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            {underfunded > 0 && (
              <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                Falta {underfunded.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs para cubrir la deuda
              </p>
            )}
          </div>
        )}

        {/* Float risk warning */}
        {status?.floatRisk && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.5rem', padding: '0.5rem', fontSize: '0.75rem', color: '#f59e0b', marginBottom: '0.75rem' }}>
            ⚠ <strong>Posible float de tarjeta</strong> — Tu plan podría depender de ingresos futuros para cubrir esta deuda.
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {canEdit && <button
            onClick={() => setShowPayModal(true)}
            style={{ flex: 1, padding: '0.5rem', background: 'var(--primary)', color: 'var(--bg)', border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
          >
            💸 Pagar tarjeta
          </button>}
          <button
            onClick={() => setShowInspector(s => !s)}
            style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            {showInspector ? '▲' : '▼'} Inspector
          </button>
        </div>

        {/* Inspector panel */}
        {showInspector && status && (
          <div style={{ marginTop: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.8rem' }}>
            <p style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>Inspector</p>
            {[
              { label: 'Compras', value: Number(status.inspector.purchases) / 100, color: 'var(--danger)' },
              { label: 'Reembolsos', value: Number(status.inspector.refunds) / 100, color: 'var(--primary)' },
              { label: 'Pagos realizados', value: Number(status.inspector.payments) / 100, color: 'var(--primary)' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: row.color }}>{row.value.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}

            {/* Explanation */}
            {status.explanation.length > 0 && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>¿Por qué?</p>
                {status.explanation.map((e, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.15rem 0' }}>
                    <span>{e.label}</span>
                    <span style={{ fontWeight: 600 }}>{e.amount !== 0n ? (Number(e.amount) / 100).toLocaleString('es-BO', { minimumFractionDigits: 2 }) : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '380px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Pagar {account.name}</h3>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
            </div>

            {/* Summary */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Saldo de tarjeta</span>
                <span style={{ fontWeight: 700 }}>{workingBalance.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pago disponible</span>
                <span style={{ fontWeight: 700, color: paymentAvailable > 0 ? 'var(--primary)' : 'var(--danger)' }}>
                  {paymentAvailable.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs
                </span>
              </div>
            </div>

            <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Pagar desde</label>
                <select value={fromAccount} onChange={e => setFromAccount(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)' }}>
                  <option value="">Seleccionar cuenta...</option>
                  {eligibleFromAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Monto a pagar (Bs)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  required
                  placeholder={`Máx. recomendado: ${paymentAvailable.toFixed(2)} Bs`}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text)', boxSizing: 'border-box' }}
                />
                {Number(payAmount) > paymentAvailable && paymentAvailable >= 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                    ⚠ Pagarás más de lo disponible — el exceso quedará como sobrepago.
                  </p>
                )}
              </div>

              {payError && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{payError}</p>}

              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
                <button type="button" onClick={() => setShowPayModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending} style={{ flex: 1, padding: '0.75rem', background: 'var(--primary)', color: 'var(--bg)', border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer' }}>
                  {isPending ? 'Procesando...' : 'Confirmar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
