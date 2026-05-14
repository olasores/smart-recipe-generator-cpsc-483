import { getSession } from "@/lib/auth";
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export default async function AuthNav() {
  const session = await getSession();

  return (
    <div className="flex items-center space-x-4">
      {session ? (
        <LogoutButton />
      ) : (
        <>
          <Link href="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900">
            Log in
          </Link>
          <Link href="/signup" className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-500">
            Sign up
          </Link>
        </>
      )}
    </div>
  );
}
