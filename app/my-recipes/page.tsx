import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { getUser } from "@/lib/auth";
import { deleteSavedRecipe, getMyRecipes } from "@/lib/recipes";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default async function MyRecipesPage() {
  const user = await getUser();
  if (!user) {
    redirect("/");
  }

  const recipes = await getMyRecipes();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fffaf7_0%,_#ffffff_40%,_#f8fafc_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-700">
              Smart Recipe Generator
            </p>
            <p className="mt-1 text-sm text-stone-500 sm:text-sm">Your saved recipes.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <span className="hidden text-xs text-stone-500 sm:inline sm:text-sm">
              Signed in as <span className="font-medium text-stone-700">{user.email}</span>
            </span>
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              Generate a recipe
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

        <div className="flex-1 py-8 sm:py-10">
          <div className="max-w-2xl pb-7 sm:pb-8">
            <p className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700 ring-1 ring-rose-100">
              Saved recipes
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:mt-5 sm:text-5xl">
              Your recipe library
            </h1>
            <p className="mt-4 text-base leading-7 text-stone-600 sm:text-lg sm:leading-8">
              Recipes you saved from the trained model and from Claude live here. Tap any card to
              expand the ingredients and steps.
            </p>
          </div>

          {recipes.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-stone-300 bg-white p-8 text-center shadow-sm sm:rounded-[2rem] sm:p-10">
              <p className="text-base leading-7 text-stone-600">
                You have not saved any recipes yet.
              </p>
              <Link
                href="/get-started"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-rose-600 px-5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-500"
              >
                Generate your first recipe
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4 sm:gap-5">
              {recipes.map((r) => {
                const sourceLabel = r.source === "claude" ? "Claude" : "Trained model";
                const sourceClass =
                  r.source === "claude"
                    ? "bg-rose-50 text-rose-700 ring-rose-100"
                    : "bg-emerald-50 text-emerald-800 ring-emerald-100";

                return (
                  <li key={r.id} className="list-none">
                    <details className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm open:shadow-md sm:rounded-[2rem]">
                      <summary className="cursor-pointer list-none p-4 marker:hidden [&::-webkit-details-marker]:hidden sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${sourceClass}`}
                              >
                                {sourceLabel}
                              </span>
                              <span className="text-xs text-stone-500">{formatDate(r.created_at)}</span>
                            </div>
                            <h2 className="mt-2 text-lg font-semibold tracking-tight text-stone-950 sm:text-xl">
                              {r.title}
                            </h2>
                            {r.summary ? (
                              <p className="mt-1 max-w-prose text-sm leading-6 text-stone-600">
                                {r.summary}
                              </p>
                            ) : null}
                          </div>
                          <span className="text-xs font-semibold text-rose-700">▼ Expand</span>
                        </div>
                      </summary>

                      <div className="border-t border-stone-200 bg-stone-50">
                        <div className="grid gap-px bg-stone-200 sm:grid-cols-[1fr_1.15fr]">
                          <section className="bg-stone-50 p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                                Ingredients
                              </h3>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-500 ring-1 ring-stone-200">
                                {r.ingredients.length} items
                              </span>
                            </div>
                            <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
                              {r.ingredients.length > 0 ? (
                                r.ingredients.map((line, idx) => (
                                  <li
                                    key={`${r.id}-ing-${idx}`}
                                    className="flex gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-stone-200"
                                  >
                                    <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
                                    <span>{line}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-xs text-stone-500">No ingredients saved.</li>
                              )}
                            </ul>
                          </section>

                          <section className="bg-white p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                                Instructions
                              </h3>
                              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
                                {r.instructions.length} steps
                              </span>
                            </div>
                            <ol className="mt-4 space-y-3">
                              {r.instructions.length > 0 ? (
                                r.instructions.map((step, idx) => (
                                  <li
                                    key={`${r.id}-step-${idx}`}
                                    className="flex gap-3 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200"
                                  >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-950 text-xs font-semibold text-white">
                                      {idx + 1}
                                    </span>
                                    <p className="text-sm leading-6 text-stone-700">{step}</p>
                                  </li>
                                ))
                              ) : (
                                <li className="text-xs text-stone-500">No steps saved.</li>
                              )}
                            </ol>
                          </section>
                        </div>

                        <div className="flex justify-end border-t border-stone-200 bg-white px-4 py-3 sm:px-5">
                          <form action={deleteSavedRecipe}>
                            <input type="hidden" name="id" value={r.id} />
                            <button
                              type="submit"
                              className="inline-flex h-9 items-center justify-center rounded-full border border-stone-300 bg-white px-4 text-xs font-medium text-stone-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
