'use client';

import { logout } from '@/lib/auth';

export function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
    >
      Log out
    </button>
  );
}
