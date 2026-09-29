'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// BR-IDN-001: email normalised — trim + lowercase
// BR-IDN-002: password min 10 chars
// BR-IDN-003: password max 72 bytes
function passwordByteLength(p: string) {
  return new TextEncoder().encode(p).length;
}

const emailSchema = z
  .string()
  .email('Revisa tu correo (ej.: nombre@correo.com).')
  .transform((e) => e.trim().toLowerCase());

const passwordSchema = z
  .string()
  .min(10, 'Usa al menos 10 caracteres.')
  .refine((p) => passwordByteLength(p) <= 72, {
    message: 'La contraseña es demasiado larga (máx. 72 bytes). Usa una más corta.',
  });

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().max(80).optional(),
  acceptTerms: z.literal('on', { errorMap: () => ({ message: 'Debes aceptar los términos.' }) }),
});

export type AuthState = {
  error?: string;
  success?: string;
  field?: string;
};

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    // Return generic error to avoid revealing which field failed (BR-IDN-010)
    return { error: 'Correo o contraseña incorrectos.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // BR-IDN-010: same message regardless of whether email exists or password is wrong
    return { error: 'Correo o contraseña incorrectos.' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: (formData.get('name') as string) || undefined,
    acceptTerms: formData.get('acceptTerms') as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue.message, field: firstIssue.path[0] as string };
  }

  const supabase = await createClient();
  await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.name ?? parsed.data.email.split('@')[0] },
    },
  });

  // BR-IDN-010: Always respond with the same success message whether the email
  // already exists or not. Supabase sends an email to the real owner if duplicate.
  return { success: 'Revisa tu correo para confirmar tu cuenta.' };
}

export async function forgotPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  if (!email) return { error: 'Escribe tu correo.' };

  const supabase = await createClient();
  // Fire and forget — BR-IDN-010: always same response
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });

  return { success: 'Si el correo existe, te enviamos un enlace.' };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
