'use server';

import { db, budgetMembers, budgetInvitations, auditEvents } from '@bolsilludo/db';
import { eq, and, gt } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

// T12.2: requireMember en dominio
export async function checkRole(budgetId: string, minRole: 'owner' | 'admin' | 'editor' | 'viewer') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const member = await db.select().from(budgetMembers).where(
    and(eq(budgetMembers.budgetId, budgetId), eq(budgetMembers.userId, user.id))
  ).then(res => res[0]);

  if (!member) throw new Error('Not a member');

  const roleWeights = { owner: 4, admin: 3, editor: 2, viewer: 1 };
  if (roleWeights[member.role as keyof typeof roleWeights] < roleWeights[minRole]) {
    throw new Error('Permission denied');
  }

  return { user, member };
}

// T12.3: inviteMember
export async function inviteMember(budgetId: string, email: string, role: string) {
  const { user } = await checkRole(budgetId, 'admin');
  
  if (role === 'owner') {
    throw new Error('Cannot invite as owner');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

  await db.insert(budgetInvitations).values({
    budgetId,
    email,
    role,
    tokenHash,
    invitedBy: user.id,
    expiresAt,
  });

  await db.insert(auditEvents).values({
    budgetId,
    actorUserId: user.id,
    entityType: 'member',
    action: 'invited',
    details: JSON.stringify({ email, role })
  });

  // Emulate sending email (in a real app, send actual email with token)
  console.log(`Email sent to ${email} with token: ${token}`);
  revalidatePath('/dashboard');
  return { success: true, message: 'Invitation sent', token };
}

export async function acceptInvitation(token: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error('Unauthorized');

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const invitation = await db.select().from(budgetInvitations).where(
    and(
      eq(budgetInvitations.tokenHash, tokenHash),
      gt(budgetInvitations.expiresAt, new Date())
    )
  ).then(res => res[0]);

  if (!invitation) throw new Error('INVITE_EXPIRED_OR_INVALID');
  if (invitation.email !== user.email) throw new Error('INVITE_EMAIL_MISMATCH');
  if (invitation.acceptedAt || invitation.revokedAt) throw new Error('INVITE_ALREADY_USED');

  // Check if already a member
  const existingMember = await db.select().from(budgetMembers).where(
    and(eq(budgetMembers.budgetId, invitation.budgetId), eq(budgetMembers.userId, user.id))
  ).then(res => res[0]);

  if (existingMember) throw new Error('INVITE_ALREADY_MEMBER');

  await db.transaction(async (tx) => {
    await tx.insert(budgetMembers).values({
      budgetId: invitation.budgetId,
      userId: user.id,
      role: invitation.role,
    });

    await tx.update(budgetInvitations).set({ acceptedAt: new Date() }).where(eq(budgetInvitations.id, invitation.id));

    await tx.insert(auditEvents).values({
      budgetId: invitation.budgetId,
      actorUserId: user.id,
      entityType: 'member',
      entityId: user.id,
      action: 'joined',
    });
  });

  revalidatePath('/dashboard');
  return { success: true, budgetId: invitation.budgetId };
}

// T12.4: changeMemberRole, removeMember, transferOwnership, leaveBudget
export async function changeMemberRole(budgetId: string, targetUserId: string, newRole: string) {
  const { user } = await checkRole(budgetId, 'admin');

  if (newRole === 'owner') throw new Error('Cannot change role to owner');

  const targetMember = await db.select().from(budgetMembers).where(
    and(eq(budgetMembers.budgetId, budgetId), eq(budgetMembers.userId, targetUserId))
  ).then(res => res[0]);

  if (!targetMember) throw new Error('Member not found');
  if (targetMember.role === 'owner') throw new Error('Cannot modify owner role');

  await db.update(budgetMembers).set({ role: newRole }).where(
    and(eq(budgetMembers.budgetId, budgetId), eq(budgetMembers.userId, targetUserId))
  );

  await db.insert(auditEvents).values({
    budgetId,
    actorUserId: user.id,
    entityType: 'member',
    entityId: targetUserId,
    action: 'role_changed',
    details: JSON.stringify({ oldRole: targetMember.role, newRole })
  });

  revalidatePath('/dashboard');
  return { success: true };
}

export async function removeMember(budgetId: string, targetUserId: string) {
  const { user } = await checkRole(budgetId, 'admin');

  const targetMember = await db.select().from(budgetMembers).where(
    and(eq(budgetMembers.budgetId, budgetId), eq(budgetMembers.userId, targetUserId))
  ).then(res => res[0]);

  if (!targetMember) throw new Error('Member not found');
  if (targetMember.role === 'owner') throw new Error('Cannot remove owner');

  await db.delete(budgetMembers).where(
    and(eq(budgetMembers.budgetId, budgetId), eq(budgetMembers.userId, targetUserId))
  );

  await db.insert(auditEvents).values({
    budgetId,
    actorUserId: user.id,
    entityType: 'member',
    entityId: targetUserId,
    action: 'removed',
  });

  revalidatePath('/dashboard');
  return { success: true };
}

export async function leaveBudget(budgetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const member = await db.select().from(budgetMembers).where(
    and(eq(budgetMembers.budgetId, budgetId), eq(budgetMembers.userId, user.id))
  ).then(res => res[0]);

  if (!member) throw new Error('Not a member');

  if (member.role === 'owner') {
    // Check if it's the last owner
    const owners = await db.select().from(budgetMembers).where(
      and(eq(budgetMembers.budgetId, budgetId), eq(budgetMembers.role, 'owner'))
    );
    if (owners.length <= 1) {
      throw new Error('LAST_OWNER_CANNOT_LEAVE');
    }
  }

  await db.delete(budgetMembers).where(
    and(eq(budgetMembers.budgetId, budgetId), eq(budgetMembers.userId, user.id))
  );

  await db.insert(auditEvents).values({
    budgetId,
    actorUserId: user.id,
    entityType: 'member',
    entityId: user.id,
    action: 'left',
  });

  return { success: true };
}

export async function transferOwnership(budgetId: string, targetUserId: string) {
  const { user } = await checkRole(budgetId, 'owner');

  const targetMember = await db.select().from(budgetMembers).where(
    and(eq(budgetMembers.budgetId, budgetId), eq(budgetMembers.userId, targetUserId))
  ).then(res => res[0]);

  if (!targetMember) throw new Error('Member not found');

  await db.transaction(async (tx) => {
    // Make the target member an owner
    await tx.update(budgetMembers).set({ role: 'owner' }).where(
      and(eq(budgetMembers.budgetId, budgetId), eq(budgetMembers.userId, targetUserId))
    );

    // Downgrade the current user to admin
    await tx.update(budgetMembers).set({ role: 'admin' }).where(
      and(eq(budgetMembers.budgetId, budgetId), eq(budgetMembers.userId, user.id))
    );

    await tx.insert(auditEvents).values({
      budgetId,
      actorUserId: user.id,
      entityType: 'member',
      entityId: targetUserId,
      action: 'ownership_transferred',
    });
  });

  revalidatePath('/dashboard');
  return { success: true };
}

export async function revokeInvitation(invitationId: string) {
  // First, we need to get the budgetId for this invitation
  const invitation = await db.select().from(budgetInvitations).where(eq(budgetInvitations.id, invitationId)).then(res => res[0]);
  if (!invitation) throw new Error('Invitation not found');

  const { user } = await checkRole(invitation.budgetId, 'admin');

  await db.update(budgetInvitations).set({ revokedAt: new Date() }).where(eq(budgetInvitations.id, invitationId));

  await db.insert(auditEvents).values({
    budgetId: invitation.budgetId,
    actorUserId: user.id,
    entityType: 'member',
    action: 'invite_revoked',
    details: JSON.stringify({ email: invitation.email })
  });

  revalidatePath('/dashboard');
  return { success: true };
}

// T12.5: getActivityFeed
export async function getActivityFeed(budgetId: string) {
  await checkRole(budgetId, 'viewer');
  
  // Note: Depending on the role, the query could be filtered. For now, fetch all events for the budget.
  return db.select().from(auditEvents).where(eq(auditEvents.budgetId, budgetId)).orderBy(auditEvents.createdAt);
}

export async function getMembers(budgetId: string) {
  await checkRole(budgetId, 'viewer');
  return db.select().from(budgetMembers).where(eq(budgetMembers.budgetId, budgetId)).orderBy(budgetMembers.joinedAt);
}

export async function getInvitations(budgetId: string) {
  await checkRole(budgetId, 'admin');
  return db.select().from(budgetInvitations).where(eq(budgetInvitations.budgetId, budgetId)).orderBy(budgetInvitations.invitedAt);
}

