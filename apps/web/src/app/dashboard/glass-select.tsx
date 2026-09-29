'use client';

import { useState, useRef, useEffect } from 'react';

type Option = {
  value: string;
  label: string;
};

type Props = {
  name: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
};

export function GlassSelect({ name, options, placeholder = 'Seleccionar...', required }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === selectedValue);

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

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={popoverRef}>
      {/* Hidden input for FormData */}
      <input type="hidden" name={name} value={selectedValue} required={required} />
      
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="glass"
        style={{
          width: '100%',
          padding: '0.5rem 2rem 0.5rem 0.75rem',
          borderRadius: '0.5rem',
          color: selectedOption ? 'var(--text)' : 'var(--text-muted)',
          fontSize: '0.875rem',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span style={{ position: 'absolute', right: '0.75rem', fontSize: '0.6rem', opacity: 0.6 }}>▼</span>
      </button>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '0.5rem',
            background: 'var(--surface-1)',
            border: '1px solid var(--glass-border)',
            borderRadius: '0.5rem',
            padding: '0.25rem',
            zIndex: 100,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            width: '100%',
            maxHeight: '300px',
            overflowY: 'auto',
            color: 'var(--text)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.125rem'
          }}
        >
          {/* Allow empty selection if not required, or if we want "RTA" as an option */}
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                setSelectedValue(o.value);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.5rem 0.75rem',
                background: o.value === selectedValue ? 'var(--primary)' : 'transparent',
                color: o.value === selectedValue ? 'var(--bg)' : 'var(--text)',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: o.value === selectedValue ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (o.value !== selectedValue) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                if (o.value !== selectedValue) e.currentTarget.style.background = 'transparent';
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
