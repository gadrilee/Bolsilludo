import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { db, budgetInvitations, budgets } from '@bolsilludo/db';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'crypto';
import { acceptInvitation } from '../../actions/collaboration';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  const token = resolvedParams.token;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Si no está autenticado, redirigir a login con un parámetro next
    redirect(`/login?next=/invite/${token}`);
  }

  // Obtener info de la invitación usando el hash
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const invitation = await db.select({
    id: budgetInvitations.id,
    email: budgetInvitations.email,
    role: budgetInvitations.role,
    expiresAt: budgetInvitations.expiresAt,
    acceptedAt: budgetInvitations.acceptedAt,
    revokedAt: budgetInvitations.revokedAt,
    budgetId: budgetInvitations.budgetId,
    budgetName: budgets.name,
  })
  .from(budgetInvitations)
  .innerJoin(budgets, eq(budgetInvitations.budgetId, budgets.id))
  .where(eq(budgetInvitations.tokenHash, tokenHash))
  .then(res => res[0]);

  if (!invitation) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
        <div style={{ padding: '2rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem', textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--danger)', marginBottom: '1rem' }}>Enlace Inválido</h1>
          <p style={{ color: 'var(--text-muted)' }}>El enlace de invitación no es válido o ya no existe.</p>
        </div>
      </main>
    );
  }

  if (invitation.acceptedAt || invitation.revokedAt || new Date(invitation.expiresAt) < new Date()) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
        <div style={{ padding: '2rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem', textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--danger)', marginBottom: '1rem' }}>Invitación Expirada</h1>
          <p style={{ color: 'var(--text-muted)' }}>Esta invitación ya ha sido usada, fue revocada o expiró.</p>
        </div>
      </main>
    );
  }

  if (user.email !== invitation.email) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
        <div style={{ padding: '2rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem', textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--danger)', marginBottom: '1rem' }}>Correo Incorrecto</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Estás conectado como <strong>{user.email}</strong>, pero esta invitación es para <strong>{invitation.email}</strong>.</p>
          <form action={async () => {
            'use server';
            const { createClient } = await import('@/lib/supabase/server');
            const { redirect } = await import('next/navigation');
            const supabase = await createClient();
            await supabase.auth.signOut();
            redirect(`/login?next=/invite/${token}`);
          }}>
            <button style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', border: 'none', color: 'var(--bg)', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Cerrar Sesión</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ padding: '2.5rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '1.5rem', textAlign: 'center', maxWidth: '450px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--text)', marginBottom: '0.5rem', fontWeight: 700 }}>Invitación a Presupuesto</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Has sido invitado a unirte al presupuesto <strong>{invitation.budgetName}</strong> con el rol de <strong>{invitation.role}</strong>.
        </p>

        <form action={async () => {
          'use server';
          try {
            await acceptInvitation(token);
          } catch (e: any) {
            console.error('Error accepting invitation:', e);
            // Ignore error here and redirect anyway, or handle it in a more robust way
          }
          const { redirect } = await import('next/navigation');
          redirect('/dashboard');
        }}>
          <button type="submit" style={{ width: '100%', padding: '1rem', background: 'var(--primary)', border: 'none', color: 'var(--bg)', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', transition: 'all 0.2s' }}>
            Aceptar Invitación
          </button>
        </form>

        <a href="/dashboard" style={{ display: 'inline-block', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>Volver al Dashboard</a>
      </div>
    </main>
  );
}
