'use client';

import { useEffect } from 'react';
import { AuthForm } from './auth-form';

type AuthModalProps = {
  open: boolean;
  initialMode: 'login' | 'signup';
  onClose: () => void;
};

export function AuthModal({ open, initialMode, onClose }: AuthModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close login dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-stone-950/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-stone-200 sm:p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <h2 id="auth-modal-title" className="pr-8 text-lg font-semibold tracking-tight text-stone-950">
          Welcome to Smart Recipe Generator
        </h2>
        <div className="mt-4">
          <AuthForm initialMode={initialMode} />
        </div>
      </div>
    </div>
  );
}
