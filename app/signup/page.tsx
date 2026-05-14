'use client';

import { useActionState } from 'react';
import { signup } from '@/lib/auth';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50"
    >
      {pending ? 'Signing up...' : 'Sign up'}
    </button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useActionState(signup, null);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,_#fffaf7_0%,_#ffffff_40%,_#f8fafc_100%)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-stone-900">
            Create a new account
          </h2>
          <p className="mt-2 text-center text-sm text-stone-600">
            Or{' '}
            <Link href="/login" className="font-medium text-rose-600 hover:text-rose-500">
              log in to your existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" action={formAction}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-stone-300 placeholder-stone-500 text-stone-900 focus:outline-none focus:ring-rose-500 focus:border-rose-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-stone-300 placeholder-stone-500 text-stone-900 focus:outline-none focus:ring-rose-500 focus:border-rose-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          {state?.error && (
            <div className="text-red-500 text-sm text-center">{state.error}</div>
          )}

          <div>
            <SubmitButton />
          </div>
          <div className="text-center mt-4">
             <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-500">
               Back home
             </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
