'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { login, type AuthState } from '@/app/auth/actions';

const initialState: AuthState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <main className="auth-shell">
      {/* Background radial glow */}
      <div className="auth-glow" aria-hidden="true" />

      <div className="auth-card">
        {/* Logo mark */}
        <div className="auth-logo">
          <span className="auth-logo-b">B</span>
          <span className="auth-logo-name">olsilludo</span>
        </div>

        <h1 className="auth-heading">Bienvenido de vuelta</h1>
        <p className="auth-subheading">Ingresa a tu sistema operativo financiero</p>

        <form action={formAction} className="auth-form" noValidate>
          <div className="field-group">
            <label htmlFor="email" className="field-label">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="field-input"
              placeholder="tu@correo.com"
            />
          </div>

          <div className="field-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label htmlFor="password" className="field-label" style={{ margin: 0 }}>
                Contraseña
              </label>
              <Link href="/forgot-password" className="auth-link" style={{ fontSize: '0.8rem' }}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="field-input"
              placeholder="Tu contraseña"
            />
          </div>

          {state?.error && (
            <p className="auth-error" role="alert">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary"
            id="btn-login"
          >
            {isPending ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="auth-footer">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="auth-link">
            Regístrate gratis
          </Link>
        </p>
      </div>
    </main>
  );
}
