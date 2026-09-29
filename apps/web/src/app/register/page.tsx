'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { register, type AuthState } from '@/app/auth/actions';

const initialState: AuthState = {};

function PasswordStrength({ password }: { password: string }) {
  const len = password.length;
  const byteLen = new TextEncoder().encode(password).length;
  
  let strength = 0;
  let label = '';
  let color = 'var(--text-muted)';
  
  if (len === 0) return null;
  if (byteLen > 72) return <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>Demasiado larga (máx. 72 bytes).</p>;
  
  if (len >= 10) strength++;
  if (len >= 14) strength++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  if (strength <= 1) { label = 'Débil'; color = 'var(--danger)'; }
  else if (strength === 2) { label = 'Aceptable'; color = '#f59e0b'; }
  else { label = 'Fuerte'; color = 'var(--primary)'; }
  
  return (
    <div style={{ marginTop: '0.4rem' }}>
      <div style={{ display: 'flex', gap: '3px', marginBottom: '0.25rem' }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: '3px', flex: 1, borderRadius: '2px', background: strength >= i ? color : 'var(--glass-border)', transition: 'background 0.2s' }} />
        ))}
      </div>
      <span style={{ fontSize: '0.75rem', color }}>{label}</span>
    </div>
  );
}

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, initialState);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="auth-shell">
      <div className="auth-glow" aria-hidden="true" />

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-b">B</span>
          <span className="auth-logo-name">olsilludo</span>
        </div>

        <h1 className="auth-heading">Crea tu cuenta</h1>
        <p className="auth-subheading">Tu dinero merece un sistema que lo entienda</p>

        {state?.success ? (
          <div className="auth-success" role="status">
            <svg className="auth-success-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p>{state.success}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Revisa tu bandeja de entrada y tu carpeta de spam.
            </p>
          </div>
        ) : (
          <form action={formAction} className="auth-form" noValidate>
            {/* Name */}
            <div className="field-group">
              <label htmlFor="name" className="field-label">Nombre (opcional)</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                className="field-input"
                placeholder="Tu nombre"
              />
            </div>

            {/* Email */}
            <div className="field-group">
              <label htmlFor="email" className="field-label">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                className={`field-input ${state?.field === 'email' ? 'field-input--error' : ''}`}
                placeholder="tu@correo.com"
                aria-describedby={state?.field === 'email' ? 'email-error' : undefined}
              />
            </div>

            {/* Password */}
            <div className="field-group">
              <label htmlFor="password" className="field-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className={`field-input ${state?.field === 'password' ? 'field-input--error' : ''}`}
                  placeholder="Mínimo 10 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  aria-describedby="password-strength"
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-pressed={showPassword}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <div id="password-strength">
                <PasswordStrength password={password} />
              </div>
            </div>

            {/* Accept Terms */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                required
                style={{ marginTop: '0.2rem', width: '1rem', height: '1rem', accentColor: 'var(--primary)', flexShrink: 0 }}
              />
              <label htmlFor="acceptTerms" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Acepto los <a href="/terms" style={{ color: 'var(--primary)' }}>Términos de uso</a> y la <a href="/privacy" style={{ color: 'var(--primary)' }}>Política de privacidad</a>.
              </label>
            </div>

            {state?.error && (
              <p className="auth-error" role="alert" id="email-error">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary"
              id="btn-register"
              aria-busy={isPending}
            >
              {isPending ? 'Creando cuenta…' : 'Crear cuenta gratis'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="auth-link">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}
