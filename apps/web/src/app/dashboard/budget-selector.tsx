'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Budget = {
  id: string;
  name: string;
  role: string;
};

type Props = {
  budgets: Budget[];
  activeBudgetId: string;
  currentMonth: string;
};

export function BudgetSelector({ budgets, activeBudgetId, currentMonth }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const activeBudget = budgets.find(b => b.id === activeBudgetId) || budgets[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function selectBudget(id: string) {
    if (id) {
      router.push(`/dashboard?budgetId=${id}&month=${currentMonth}`);
      setIsOpen(false);
    }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '0.6rem 2.5rem 0.6rem 1.25rem',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: '0.75rem',
          color: 'var(--text)',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(var(--glass-blur))',
          WebkitBackdropFilter: 'blur(var(--glass-blur))',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          position: 'relative'
        }}
      >
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>
          {activeBudget?.name} <span style={{ opacity: 0.6, fontSize: '0.8rem', fontWeight: 400 }}>({activeBudget?.role})</span>
        </span>
        <span style={{ position: 'absolute', right: '1rem', fontSize: '0.6rem', opacity: 0.6 }}>▼</span>
      </button>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            background: 'var(--surface-1)',
            border: '1px solid var(--glass-border)',
            borderRadius: '1rem',
            padding: '0.5rem',
            zIndex: 50,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            width: 'max-content',
            minWidth: '240px',
            color: 'var(--text)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}
        >
          {budgets.map(b => (
            <button
              key={b.id}
              onClick={() => selectBudget(b.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.75rem 1rem',
                background: b.id === activeBudgetId ? 'rgba(22, 183, 140, 0.15)' : 'transparent',
                color: b.id === activeBudgetId ? 'var(--primary)' : 'var(--text)',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: b.id === activeBudgetId ? 600 : 400,
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (b.id !== activeBudgetId) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                if (b.id !== activeBudgetId) e.currentTarget.style.background = 'transparent';
              }}
            >
              {b.name} <span style={{ opacity: 0.6, fontSize: '0.75rem', fontWeight: 400 }}>({b.role})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
