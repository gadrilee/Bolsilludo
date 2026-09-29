'use client';

import { useState, useTransition } from 'react';
import { inviteMember, changeMemberRole, removeMember, transferOwnership, leaveBudget, revokeInvitation } from '../actions/collaboration';

type MembersViewProps = {
  budgetId: string;
  members: any[];
  invitations: any[];
  userId: string;
};

export function MembersView({ budgetId, members, invitations, userId }: MembersViewProps) {
  const [isPending, startTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [error, setError] = useState<string | null>(null);
  
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const currentUserMember = members.find(m => m.userId === userId);
  const userRole = currentUserMember?.role || 'viewer';
  const isAdmin = userRole === 'owner' || userRole === 'admin';
  const isOwner = userRole === 'owner';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    startTransition(async () => {
      try {
        setError(null);
        setInviteLink(null);
        const res = await inviteMember(budgetId, inviteEmail, inviteRole);
        if (res.token) {
          setInviteLink(`${window.location.origin}/invite/${res.token}`);
        }
        setInviteEmail('');
      } catch (err: any) {
        setError(err.message || 'Error al invitar miembro');
      }
    });
  };

  const handleRoleChange = (targetUserId: string, newRole: string) => {
    if (!isAdmin) return;
    startTransition(async () => {
      try {
        setError(null);
        await changeMemberRole(budgetId, targetUserId, newRole);
      } catch (err: any) {
        setError(err.message || 'Error al cambiar rol');
      }
    });
  };

  const handleRemove = (targetUserId: string) => {
    if (!isAdmin || !confirm('¿Estás seguro de que deseas eliminar a este miembro del presupuesto? Perderá acceso inmediatamente.')) return;
    startTransition(async () => {
      try {
        setError(null);
        await removeMember(budgetId, targetUserId);
      } catch (err: any) {
        setError(err.message || 'Error al eliminar miembro');
      }
    });
  };

  const handleTransfer = (targetUserId: string) => {
    if (!isOwner || !confirm('¿Estás seguro de que deseas transferir la propiedad del presupuesto a este usuario? Serás degradado a administrador.')) return;
    startTransition(async () => {
      try {
        setError(null);
        await transferOwnership(budgetId, targetUserId);
      } catch (err: any) {
        setError(err.message || 'Error al transferir propiedad');
      }
    });
  };

  const handleLeave = () => {
    if (!confirm('¿Estás seguro de que deseas salir de este presupuesto? Ya no tendrás acceso.')) return;
    startTransition(async () => {
      try {
        setError(null);
        await leaveBudget(budgetId);
        window.location.reload();
      } catch (err: any) {
        setError(err.message || 'Error al salir del presupuesto');
      }
    });
  };

  const handleRevoke = (invitationId: string) => {
    if (!isAdmin) return;
    startTransition(async () => {
      try {
        setError(null);
        await revokeInvitation(invitationId);
      } catch (err: any) {
        setError(err.message || 'Error al revocar invitación');
      }
    });
  };

  return (
    <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '1rem', padding: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Miembros del Presupuesto</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>
        Administra quién tiene acceso a tu presupuesto. Hay 4 roles disponibles: Dueño (Owner), Administrador (Admin), Editor y Espectador (Viewer).
      </p>

      {error && (
        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Lista de Miembros Activos */}
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Miembros Activos ({members.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {members.map(member => (
          <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg)', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
            <div>
              <span style={{ fontWeight: 600 }}>Usuario ID: {member.userId.substring(0, 8)}...</span>
              {member.userId === userId && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: 'var(--primary)', color: 'var(--bg)', padding: '0.1rem 0.4rem', borderRadius: '1rem' }}>Tú</span>}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Unido el: {new Date(member.joinedAt).toLocaleDateString()}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <select
                value={member.role}
                disabled={isPending || !isAdmin || member.role === 'owner' || (member.userId === userId && member.role === 'admin')}
                onChange={e => handleRoleChange(member.userId, e.target.value)}
                style={{ padding: '0.4rem 0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text)', borderRadius: '0.5rem', fontSize: '0.875rem' }}
              >
                <option value="owner" disabled>Dueño</option>
                <option value="admin">Administrador</option>
                <option value="editor">Editor</option>
                <option value="viewer">Espectador</option>
              </select>

              {isAdmin && member.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(member.userId)}
                  disabled={isPending}
                  style={{ padding: '0.4rem 0.75rem', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Quitar
                </button>
              )}

              {isOwner && member.role !== 'owner' && (
                <button
                  onClick={() => handleTransfer(member.userId)}
                  disabled={isPending}
                  style={{ padding: '0.4rem 0.75rem', background: 'var(--primary)', border: 'none', color: 'var(--bg)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
                >
                  Transferir Propiedad
                </button>
              )}

              {member.userId === userId && (
                <button
                  onClick={handleLeave}
                  disabled={isPending || (member.role === 'owner' && members.filter(m => m.role === 'owner').length === 1)}
                  style={{ padding: '0.4rem 0.75rem', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Salir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Invitaciones Pendientes */}
      {isAdmin && (
        <>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Invitaciones Pendientes</h3>
          {invitations.filter(i => !i.acceptedAt && !i.revokedAt && new Date(i.expiresAt) > new Date()).length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>No hay invitaciones pendientes.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              {invitations.filter(i => !i.acceptedAt && !i.revokedAt && new Date(i.expiresAt) > new Date()).map(inv => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg)', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{inv.email}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Rol: {inv.role} | Expira: {new Date(inv.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    disabled={isPending}
                    style={{ padding: '0.4rem 0.75rem', background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    Revocar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Formulario de Invitación */}
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Invitar Miembro</h3>
            <form onSubmit={handleInvite} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo Electrónico</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  required
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', color: 'var(--text)', borderRadius: '0.5rem' }}
                />
              </div>
              <div style={{ width: '200px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rol Inicial</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', color: 'var(--text)', borderRadius: '0.5rem' }}
                >
                  <option value="admin">Administrador</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Espectador</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isPending || !inviteEmail}
                style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', border: 'none', color: 'var(--bg)', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 700 }}
              >
                {isPending ? 'Enviando...' : 'Invitar'}
              </button>
            </form>
            
            {inviteLink && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '0.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 600 }}>Invitación generada exitosamente.</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Copia este enlace y envíalo al usuario (en producción esto se enviaría por correo electrónico):</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input type="text" readOnly value={inviteLink} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg)', border: '1px solid var(--glass-border)', color: 'var(--text)', borderRadius: '0.25rem', fontSize: '0.875rem' }} />
                  <button onClick={() => navigator.clipboard.writeText(inviteLink)} style={{ padding: '0.5rem 1rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text)', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}>Copiar</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
