'use server';

import { redirect } from 'next/navigation';
import { elapsedMs, nowMs, recordAuthMetrics } from '@/lib/metrics/server';
import { getSupabaseServerClient } from './supabase/server';

export type AuthState = { error?: string; info?: string } | null;

export async function signup(_state: AuthState, formData: FormData): Promise<AuthState> {
  const startedAt = nowMs();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    recordAuthMetrics({
      action: 'signup',
      outcome: 'error',
      durationMs: elapsedMs(startedAt),
      errorType: 'validation',
    });
    return { error: 'Email and password are required' };
  }
  if (password.length < 6) {
    recordAuthMetrics({
      action: 'signup',
      outcome: 'error',
      durationMs: elapsedMs(startedAt),
      errorType: 'validation',
    });
    return { error: 'Password must be at least 6 characters' };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    recordAuthMetrics({
      action: 'signup',
      outcome: 'error',
      durationMs: elapsedMs(startedAt),
      errorType: 'supabase_auth',
    });
    return { error: error.message };
  }

  if (!data.session) {
    recordAuthMetrics({
      action: 'signup',
      outcome: 'ok',
      durationMs: elapsedMs(startedAt),
    });
    return { info: 'Check your email to confirm your account before logging in.' };
  }

  recordAuthMetrics({
    action: 'signup',
    outcome: 'ok',
    durationMs: elapsedMs(startedAt),
  });

  redirect('/get-started');
}

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const startedAt = nowMs();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    recordAuthMetrics({
      action: 'login',
      outcome: 'error',
      durationMs: elapsedMs(startedAt),
      errorType: 'validation',
    });
    return { error: 'Email and password are required' };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    recordAuthMetrics({
      action: 'login',
      outcome: 'error',
      durationMs: elapsedMs(startedAt),
      errorType: 'supabase_auth',
    });
    return { error: error.message };
  }

  recordAuthMetrics({
    action: 'login',
    outcome: 'ok',
    durationMs: elapsedMs(startedAt),
  });

  redirect('/get-started');
}

export async function logout() {
  const startedAt = nowMs();
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  recordAuthMetrics({
    action: 'logout',
    outcome: 'ok',
    durationMs: elapsedMs(startedAt),
  });
  redirect('/');
}

export async function getUser() {
  const startedAt = nowMs();
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    recordAuthMetrics({
      action: 'getUser',
      outcome: 'error',
      durationMs: elapsedMs(startedAt),
      errorType: error ? 'supabase_auth' : 'not_found',
    });
    return null;
  }

  recordAuthMetrics({
    action: 'getUser',
    outcome: 'ok',
    durationMs: elapsedMs(startedAt),
  });
  return { id: data.user.id, email: data.user.email ?? '' };
}
