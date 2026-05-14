'use client';

import { logout } from '@/lib/auth';

export function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="inline-flex w-full items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 sm:w-auto"
    >
      Log out
    </button>
  );
}
