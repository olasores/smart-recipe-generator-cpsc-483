'use client';

import Link from 'next/link';
import { useState } from 'react';

import { AuthModal } from './auth-modal';
import { LogoutButton } from './logout-button';

type LandingContentProps = {
  userEmail: string | null;
};

type ModalState = null | 'login' | 'signup';

export function LandingContent({ userEmail }: LandingContentProps) {
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.14),_transparent_28%),linear-gradient(180deg,_#fffaf7_0%,_#ffffff_45%,_#f8fafc_100%)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-700 sm:text-sm sm:tracking-[0.35em]">
          Smart Recipe Generator
        </p>

        {userEmail ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden max-w-[200px] truncate text-sm text-stone-600 sm:inline">
              Signed in as <span className="font-medium text-stone-900">{userEmail}</span>
            </span>
            <LogoutButton />
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setModal('login')}
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setModal('signup')}
              className="inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-rose-600/20 transition hover:bg-rose-500"
            >
              Sign up
            </button>
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:px-6 sm:py-12">
        <section className="flex flex-1 items-center justify-center py-8 text-center sm:py-16">
          <div className="max-w-3xl px-1 sm:px-0">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-700">
              Smart Recipe Generator
            </p>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-stone-950 sm:mt-6 sm:text-6xl lg:text-7xl">
              Turn random ingredients into dinner in one click.
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-600 sm:mt-5 sm:text-lg sm:leading-8 lg:text-xl">
              Clean recipe suggestions based on what you already have, how much time you have, and what
              you actually want to eat.
            </p>

            <div className="mt-7 flex justify-center sm:mt-8">
              {userEmail ? (
                <Link
                  href="/get-started"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-rose-600 px-7 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-500 sm:w-auto"
                >
                  Generate a recipe
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setModal('signup')}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-rose-600 px-7 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-500 sm:w-auto"
                >
                  Generate a recipe
                </button>
              )}
            </div>

            <p className="mt-5 text-sm text-stone-500 sm:mt-6">Fast. simple. no clutter.</p>
          </div>
        </section>
      </div>

      <AuthModal
        open={modal !== null}
        initialMode={modal ?? 'login'}
        onClose={() => setModal(null)}
      />
    </main>
  );
}
