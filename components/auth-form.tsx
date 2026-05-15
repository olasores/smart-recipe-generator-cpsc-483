'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { login, signup, type AuthState } from '@/lib/auth';

type Mode = 'login' | 'signup';

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();
  const label = mode === 'login' ? 'Log in' : 'Create account';
  const pendingLabel = mode === 'login' ? 'Logging in…' : 'Creating account…';
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center rounded-full bg-rose-600 px-7 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

type AuthFormProps = {
  initialMode?: Mode;
};

export function AuthForm({ initialMode = 'login' }: AuthFormProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const action = mode === 'login' ? login : signup;
  const [state, formAction] = useActionState<AuthState, FormData>(action, null);

  return (
    <div className="text-left">
      <div className="flex rounded-full bg-stone-100 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 rounded-full px-4 py-2 transition ${
            mode === 'login' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 rounded-full px-4 py-2 transition ${
            mode === 'signup' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Sign up
        </button>
      </div>

      <p className="mt-5 text-sm text-stone-600">
        {mode === 'login'
          ? 'Log in to start generating recipes from your ingredients.'
          : 'Create a free account to start generating recipes from your ingredients.'}
      </p>

      <form action={formAction} className="mt-5 space-y-3">
        <div>
          <label htmlFor="auth-email" className="sr-only">
            Email address
          </label>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            className="block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-100"
          />
        </div>
        <div>
          <label htmlFor="auth-password" className="sr-only">
            Password
          </label>
          <input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            placeholder={mode === 'login' ? 'Password' : 'Password (6+ characters)'}
            className="block w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-100"
          />
        </div>

        {state?.error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">
            {state.error}
          </p>
        ) : null}
        {state?.info ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-100">
            {state.info}
          </p>
        ) : null}

        <SubmitButton mode={mode} />
      </form>

      <p className="mt-4 text-center text-xs text-stone-500">
        {mode === 'login' ? (
          <>
            New here?{' '}
            <button type="button" onClick={() => setMode('signup')} className="font-medium text-rose-700 hover:text-rose-600">
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button type="button" onClick={() => setMode('login')} className="font-medium text-rose-700 hover:text-rose-600">
              Log in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
