import Link from "next/link";

import { IngredientPicker } from "@/components/ingredient-picker";

export default function GetStartedPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fffaf7_0%,_#ffffff_40%,_#f8fafc_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-stone-200 pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-700">
              Smart Recipe Generator
            </p>
            <p className="mt-1 text-sm text-stone-500">Build a recipe from ingredients you already have.</p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            Back home
          </Link>
        </header>

        <div className="flex flex-1 items-center py-10 sm:py-14">
          <div className="w-full">
            <div className="max-w-2xl pb-8">
              <p className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
                Choose ingredients, then generate a recipe
              </p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                Pick what you have and get a simple meal idea.
              </h1>
              <p className="mt-4 text-lg leading-8 text-stone-600">
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
