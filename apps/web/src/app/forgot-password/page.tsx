'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { forgotPassword, type AuthState } from '@/app/auth/actions';

const initialState: AuthState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPassword, initialState);

  return (
    <main className="auth-shell">
      <div className="auth-glow" aria-hidden="true" />

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-b">B</span>
          <span className="auth-logo-name">olsilludo</span>
        </div>

        <h1 className="auth-heading">Restablecer contraseña</h1>
        <p className="auth-subheading">Te enviamos un enlace a tu correo para crear una nueva.</p>

        {state?.success ? (
          <div className="auth-success" role="status">
            <svg className="auth-success-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p>{state.success}</p>
          </div>
        ) : (
          <form action={formAction} className="auth-form" noValidate>
            <div className="field-group">
              <label htmlFor="email" className="field-label">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                className="field-input"
                placeholder="tu@correo.com"
              />
            </div>

            {state?.error && (
              <p className="auth-error" role="alert">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary"
              id="btn-forgot"
              aria-busy={isPending}
            >
              {isPending ? 'Enviando…' : 'Enviar enlace'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link href="/login" className="auth-link">← Volver al inicio de sesión</Link>
        </p>
      </div>
    </main>
  );
}
