"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  source?: string;
}

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const res = await fetch(`/api/recipes/${id}`);
        if (!res.ok) throw new Error("Recipe not found");
        const data = await res.json();
        setRecipe(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recipe");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fffaf7_0%,_#ffffff_40%,_#f8fafc_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-700">
              Smart Recipe Generator
            </p>
            <p className="mt-1 text-sm text-stone-500 sm:text-sm">
              A recipe from the database.
            </p>
          </div>
          <Link
            href="/get-started"
            className="inline-flex w-full items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 sm:w-auto"
          >
            ← Back to ingredients
          </Link>
        </header>

        <div className="flex flex-1 items-start py-8 sm:py-10">
          <div className="w-full">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 w-2/3 rounded-2xl bg-stone-200" />
                <div className="h-4 w-1/3 rounded-full bg-stone-200" />
                <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
                  <div className="h-64 rounded-[1.75rem] bg-stone-200" />
                  <div className="h-64 rounded-[1.75rem] bg-stone-200" />
                </div>
              </div>
            ) : error || !recipe ? (
              <div className="rounded-[1.75rem] border border-stone-200 bg-white p-8 text-center shadow-sm sm:rounded-[2rem]">
                <p className="text-base leading-7 text-stone-600">
                  {error || "Recipe not found"}
                </p>
              </div>
            ) : (
              <>
                <div className="max-w-2xl pb-7 sm:pb-8">
                  <p className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
                    Recipe from the database
                  </p>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:mt-5 sm:text-5xl">
                    {recipe.title}
                  </h1>
                  {recipe.source && (
                    <p className="mt-4 text-base leading-7 text-stone-600 sm:text-lg sm:leading-8">
                      Source: {recipe.source}
                    </p>
                  )}
                </div>

                <section className="grid gap-5 rounded-[1.75rem] border border-stone-200 bg-white p-4 shadow-sm sm:gap-6 sm:rounded-[2rem] sm:p-6 lg:grid-cols-[1fr_1.4fr]">
                  <div className="rounded-[1.5rem] bg-stone-50 p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                        Ingredients
                      </p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-500 ring-1 ring-stone-200">
                        {recipe.ingredients.length} items
                      </span>
                    </div>

                    <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
                      {recipe.ingredients.map((ingredient, idx) => (
                        <li
                          key={idx}
                          className="flex gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-stone-200"
                        >
                          <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />
                          <span>{ingredient}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-[1.5rem] bg-white p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                        Instructions
                      </p>
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
                        {recipe.instructions.length} steps
                      </span>
                    </div>

                    <ol className="mt-4 space-y-3">
                      {recipe.instructions.map((instruction, idx) => (
                        <li
                          key={idx}
                          className="flex gap-3 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-950 text-xs font-semibold text-white">
                            {idx + 1}
                          </span>
                          <p className="text-sm leading-6 text-stone-700">{instruction}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
