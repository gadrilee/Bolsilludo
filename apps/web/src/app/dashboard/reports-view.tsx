'use client';

import { useState, useEffect, useTransition } from 'react';
import { getIncomeVsExpense, getSpendingByCategory, getNetWorth, getCashFlow, type IncomeVsExpenseResult, type SpendingByCategoryResult, type NetWorthResult, type CashFlowResult } from '../actions/reports';

type ReportsViewProps = {
  budgetId: string;
  canExport: boolean;
};

export function ReportsView({ budgetId, canExport }: ReportsViewProps) {
  const [activeReport, setActiveReport] = useState<'income-expense' | 'spending' | 'net-worth' | 'cash-flow'>('income-expense');
  
  const [isPending, startTransition] = useTransition();

  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
  });

  const [incExp, setIncExp] = useState<IncomeVsExpenseResult | null>(null);
  const [spending, setSpending] = useState<SpendingByCategoryResult | null>(null);
  const [netWorth, setNetWorth] = useState<NetWorthResult | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowResult | null>(null);

  useEffect(() => {
    startTransition(async () => {
      if (activeReport === 'income-expense') {
        const res = await getIncomeVsExpense(budgetId, dateRange.from, dateRange.to);
        setIncExp(res);
      } else if (activeReport === 'spending') {
        const res = await getSpendingByCategory(budgetId, dateRange.from, dateRange.to);
        setSpending(res);
      } else if (activeReport === 'net-worth') {
        const res = await getNetWorth(budgetId, dateRange.to);
        setNetWorth(res);
      } else if (activeReport === 'cash-flow') {
        const res = await getCashFlow(budgetId, dateRange.from, dateRange.to);
        setCashFlow(res);
      }
    });
  }, [activeReport, dateRange, budgetId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, overflowY: 'auto' }}>
      
      {/* Report selector & Filters */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '1rem' }}>
        <select 
          value={activeReport} 
          onChange={e => setActiveReport(e.target.value as any)}
          style={{ padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', color: 'var(--text)', borderRadius: '0.5rem', fontWeight: 600 }}
        >
          <option value="income-expense">Ingresos vs Gastos</option>
          <option value="spending">Gasto por Categoría</option>
          <option value="net-worth">Patrimonio Neto</option>
          <option value="cash-flow">Flujo de Caja</option>
        </select>

        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', alignItems: 'center' }}>
          {canExport && <a
            href={`/api/export?budgetId=${budgetId}`}
            download
            style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '0.5rem', fontWeight: 600, textDecoration: 'none', marginRight: '1rem', fontSize: '0.875rem' }}
          >
            Descargar CSV
          </a>}
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Desde:</span>
          <input type="date" value={dateRange.from} onChange={e => setDateRange(prev => ({...prev, from: e.target.value}))} style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', color: 'var(--text)', borderRadius: '0.5rem' }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Hasta:</span>
          <input type="date" value={dateRange.to} onChange={e => setDateRange(prev => ({...prev, to: e.target.value}))} style={{ padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', color: 'var(--text)', borderRadius: '0.5rem' }} />
        </div>
      </div>

      {isPending && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Calculando...</div>}

      {!isPending && activeReport === 'income-expense' && incExp && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>Total Ingresos</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>+ {incExp.income.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</p>
            </div>
            <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>Total Gastos</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--danger)' }}>- {incExp.expense.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</p>
            </div>
            <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>Neto (Ahorro)</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: incExp.net >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                {incExp.net >= 0 ? '+' : ''}{incExp.net.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          

        </div>
      )}

      {!isPending && activeReport === 'spending' && spending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--glass-bg)', borderRadius: '1rem', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Categoría</th>
                  <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'right' }}>Gasto (Bs)</th>
                </tr>
              </thead>
              <tbody>
                {spending.map(s => (
                  <tr key={s.categoryId} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{s.categoryName}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                      - {s.amount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {spending.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay gastos en este periodo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isPending && activeReport === 'net-worth' && netWorth && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>Activos Totales</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>+ {netWorth.assets.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</p>
            </div>
            <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>Pasivos (Deudas)</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--danger)' }}>- {netWorth.liabilities.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</p>
            </div>
            <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>Patrimonio Neto</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: netWorth.netWorth >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                {netWorth.netWorth >= 0 ? '+' : ''}{netWorth.netWorth.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {!isPending && activeReport === 'cash-flow' && cashFlow && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>Entradas de Efectivo</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>+ {cashFlow.inflows.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</p>
            </div>
            <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>Salidas de Efectivo</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--danger)' }}>- {cashFlow.outflows.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</p>
            </div>
            <div style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>Flujo de Caja Neto</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: cashFlow.netCashFlow >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                {cashFlow.netCashFlow >= 0 ? '+' : ''}{cashFlow.netCashFlow.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          
          {/* Visualización exclusiva de Flujo de Caja */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>Proporción de Liquidez</h3>
            <div style={{ display: 'flex', height: '1.5rem', borderRadius: '1rem', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ width: `${cashFlow.inflows === 0 && cashFlow.outflows === 0 ? 50 : (cashFlow.inflows / (cashFlow.inflows + cashFlow.outflows)) * 100}%`, background: 'var(--primary)', transition: 'width 0.5s' }} />
              <div style={{ width: `${cashFlow.inflows === 0 && cashFlow.outflows === 0 ? 50 : (cashFlow.outflows / (cashFlow.inflows + cashFlow.outflows)) * 100}%`, background: 'var(--danger)', transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              <span>Entradas ({Math.round(cashFlow.inflows === 0 && cashFlow.outflows === 0 ? 0 : (cashFlow.inflows / (cashFlow.inflows + cashFlow.outflows)) * 100)}%)</span>
              <span>Salidas ({Math.round(cashFlow.inflows === 0 && cashFlow.outflows === 0 ? 0 : (cashFlow.outflows / (cashFlow.inflows + cashFlow.outflows)) * 100)}%)</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
