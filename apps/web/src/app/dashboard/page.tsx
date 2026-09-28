import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const name = user.user_metadata?.full_name ?? user.email;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1.5rem',
        color: 'var(--text)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        style={{
          padding: '2.5rem 3rem',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: '1.25rem',
          backdropFilter: 'blur(var(--glass-blur))',
          textAlign: 'center',
          maxWidth: '480px',
          width: '100%',
        }}
      >
        <p
          style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}
        >
          Bienvenido a
        </p>
        <h1
          style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}
        >
          Bolsilludo
        </h1>
        <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>
          ¡Hola, {name}! 👋
        </p>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Tu dashboard está en construcción. Estamos en el Milestone M1.
        </p>
      </div>

      <form
        action={async () => {
          'use server';
          const { createClient } = await import('@/lib/supabase/server');
          const { redirect } = await import('next/navigation');
          const supabase = await createClient();
          await supabase.auth.signOut();
          redirect('/login');
        }}
      >
        <button
          type="submit"
          style={{
            padding: '0.625rem 1.5rem',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '0.625rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
