import Link from "next/link";
import { redirect } from "next/navigation";

import { IngredientPicker } from "@/components/ingredient-picker";
import { LogoutButton } from "@/components/logout-button";
import { getUser } from "@/lib/auth";

export default async function GetStartedPage() {
  const user = await getUser();
  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fffaf7_0%,_#ffffff_40%,_#f8fafc_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-700">
              Smart Recipe Generator
            </p>
            <p className="mt-1 text-sm text-stone-500 sm:text-sm">
              Build a recipe from ingredients you already have.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <span className="text-xs text-stone-500 sm:text-sm">
              Signed in as <span className="font-medium text-stone-700">{user.email}</span>
            </span>
            <Link
              href="/my-recipes"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
            >
              My recipes
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
            >
              Home
            </Link>
            <LogoutButton />
          </div>
        </header>

        <div className="flex flex-1 items-start py-8 sm:items-center sm:py-14">
          <div className="w-full">
            <div className="max-w-2xl pb-7 sm:pb-8">
              <p className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
                Choose ingredients, then generate a recipe
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:mt-5 sm:text-5xl">
                Pick what you have and get a simple meal idea.
              </h1>
              <p className="mt-4 text-base leading-7 text-stone-600 sm:text-lg sm:leading-8">
                Select a few ingredients from your kitchen, and the app will suggest something quick,
                practical, and easy to make.
              </p>
            </div>

            <IngredientPicker />
          </div>
        </div>
      </div>
    </main>
  );
}
