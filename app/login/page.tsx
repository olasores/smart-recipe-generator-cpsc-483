"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log in");
      }

      router.push("/get-started");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fffaf7_0%,_#ffffff_40%,_#f8fafc_100%)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-stone-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          Or{" "}
          <Link href="/signup" className="font-medium text-rose-600 hover:text-rose-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-stone-200">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-stone-700">Email address</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-stone-300 px-3 py-2 placeholder-stone-400 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-rose-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-stone-300 px-3 py-2 placeholder-stone-400 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-rose-500 sm:text-sm"
                />
              </div>
            </div>

            {error && <div className="text-sm text-rose-600">{error}</div>}

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md border border-transparent bg-rose-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 cursor-pointer"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
