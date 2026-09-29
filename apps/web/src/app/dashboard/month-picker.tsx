'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Props = {
  currentMonth: string; // YYYY-MM
  budgetId: string;
};

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function MonthPicker({ currentMonth, budgetId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  
  // Local state for the year currently being viewed in the dropdown
  const [viewYear, setViewYear] = useState(() => {
    return currentMonth ? parseInt(currentMonth.split('-')[0]) : new Date().getFullYear();
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
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

  // Sync viewYear when reopening if currentMonth changed from outside
  useEffect(() => {
    if (isOpen && currentMonth) {
      setViewYear(parseInt(currentMonth.split('-')[0]));
    }
  }, [isOpen, currentMonth]);

  function changeMonth(offset: number) {
    if (!currentMonth) return;
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', newMonth);
    params.set('budgetId', budgetId);
    router.push(`/dashboard?${params.toString()}`);
  }

  function selectSpecificMonth(monthIndex: number) {
    const newMonth = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', newMonth);
    params.set('budgetId', budgetId);
    router.push(`/dashboard?${params.toString()}`);
    setIsOpen(false);
  }

  const currentMonthDate = currentMonth ? new Date(currentMonth + '-02') : new Date();

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button 
        onClick={() => changeMonth(-1)}
        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        &lt;
      </button>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', 
          padding: '0.5rem', borderRadius: '0.5rem', minWidth: '160px', textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
        }}
      >
        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontWeight: 700 }}>
          {currentMonthDate.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })}
        </span>
        <span style={{ fontSize: '0.6rem' }}>▼</span>
      </button>

      <button 
        onClick={() => changeMonth(1)}
        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '2rem', height: '2rem', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        &gt;
      </button>

      {isOpen && (
        <div 
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '0.5rem',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(16px)',
            borderRadius: '1rem',
            padding: '1rem',
            zIndex: 50,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            width: '260px',
            color: 'var(--text)'
          }}
        >
          {/* Year Navigator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button 
              onClick={() => setViewYear(y => y - 1)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '1.75rem', height: '1.75rem', color: 'inherit', cursor: 'pointer' }}
            >
              &lt;
            </button>
            <span style={{ fontWeight: 700 }}>{viewYear}</span>
            <button 
              onClick={() => setViewYear(y => y + 1)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '1.75rem', height: '1.75rem', color: 'inherit', cursor: 'pointer' }}
            >
              &gt;
            </button>
          </div>

          {/* Month Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {MONTH_NAMES.map((m, idx) => {
              const isCurrentView = currentMonth === `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
              
              return (
                <button
                  key={m}
                  onClick={() => selectSpecificMonth(idx)}
                  style={{
                    padding: '0.5rem 0',
                    background: isCurrentView ? 'var(--primary)' : 'transparent',
                    color: isCurrentView ? 'var(--bg)' : 'var(--text)',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: isCurrentView ? 700 : 500,
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
