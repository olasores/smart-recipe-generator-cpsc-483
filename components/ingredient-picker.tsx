"use client";

import { useState } from "react";
import Link from "next/link";

type Ingredient = {
  name: string;
  category: string;
};

type ParsedRecipe = {
  title: string;
  summary: string;
  ingredients: string[];
  instructions: string[];
  fallback: string;
};

const ingredients: Ingredient[] = [
  { name: "Chicken", category: "Protein" },
  { name: "Eggs", category: "Protein" },
  { name: "Tofu", category: "Protein" },
  { name: "Rice", category: "Grain" },
  { name: "Pasta", category: "Grain" },
  { name: "Bread", category: "Grain" },
  { name: "Tomato", category: "Vegetable" },
  { name: "Spinach", category: "Vegetable" },
  { name: "Onion", category: "Vegetable" },
  { name: "Garlic", category: "Flavor" },
  { name: "Lemon", category: "Flavor" },
  { name: "Cheese", category: "Extra" },
];

function stripEmphasisAndEmoji(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanRecipeLine(text: string) {
  return stripEmphasisAndEmoji(
    text
      .replace(/^[-*•]\s*/, "")
      .replace(/^\d+[.)]\s*/, "")
      .replace(/^>\s*/, "")
  );
}

function parseTypedIngredients(text: string) {
  return text
    .split(/[\n,]/)
    .map((item) => cleanRecipeLine(item))
    .filter(Boolean);
}

function mergeIngredients(...groups: string[][]) {
  const seen = new Set<string>();

  return groups.flat().filter((ingredient) => {
    const key = ingredient.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function parseRecipe(text: string): ParsedRecipe {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let title = "Recipe";
  let summary = "";
  const ingredientsList: string[] = [];
  const instructionsList: string[] = [];
  const fallback: string[] = [];
  let section: "ingredients" | "instructions" | "notes" | null = null;

  for (const line of lines) {
    if (/^---+$/.test(line)) {
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      const heading = cleanRecipeLine(line.replace(/^#{1,6}\s+/, ""));

      if (title === "Recipe") {
        title = heading;
        continue;
      }

      const normalizedHeading = heading.toLowerCase();

      if (normalizedHeading.includes("ingredient")) {
        section = "ingredients";
      } else if (normalizedHeading.includes("instruction") || normalizedHeading.includes("step")) {
        section = "instructions";
      } else {
        section = "notes";
      }

      continue;
    }

    if (/^".*"$/.test(line) || /^“.*”$/.test(line)) {
      summary = stripEmphasisAndEmoji(line.replace(/^"|"$/g, "").replace(/^“|”$/g, ""));
      continue;
    }

    if (section === "ingredients") {
      ingredientsList.push(cleanRecipeLine(line));
      continue;
    }

    if (section === "instructions") {
      instructionsList.push(cleanRecipeLine(line));
      continue;
    }

    fallback.push(cleanRecipeLine(line));
  }

  return {
    title,
    summary,
    ingredients: ingredientsList,
    instructions: instructionsList,
    fallback: fallback.join("\n"),
  };
}

export function IngredientPicker() {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [typedIngredientsText, setTypedIngredientsText] = useState("");
  const [generatedRecipe, setGeneratedRecipe] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [suggestedIngredients, setSuggestedIngredients] = useState<string[]>([]);
  const [matchingRecipes, setMatchingRecipes] = useState<Array<{ id: number; title: string; similarity: number }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  const parsedRecipe = parseRecipe(generatedRecipe);
  const typedIngredients = parseTypedIngredients(typedIngredientsText);
  const allIngredients = mergeIngredients(selectedIngredients, typedIngredients);

  // Fetch suggestions and matching recipes
  async function loadSuggestions(ingrs: string[]) {
    if (ingrs.length === 0) {
      setSuggestedIngredients([]);
      setMatchingRecipes([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients: ingrs }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestedIngredients(data.suggestedIngredients || []);
        setMatchingRecipes(data.matchingRecipes || []);
      }
    } catch (err) {
      console.error("Failed to load suggestions:", err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }

  function toggleIngredient(name: string) {
    setGeneratedRecipe("");
    setError("");
    const newSelected = selectedIngredients.includes(name)
      ? selectedIngredients.filter((item) => item !== name)
      : [...selectedIngredients, name];
    setSelectedIngredients(newSelected);
    
    // Load suggestions for new ingredient list
    const newAll = mergeIngredients(newSelected, typedIngredients);
    loadSuggestions(newAll);
  }

  async function generateRecipe() {
    if (allIngredients.length === 0 || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients: allIngredients }),
      });

      const payload = (await response.json()) as { recipe?: string; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Recipe generation failed.");
      }

      setGeneratedRecipe(payload.recipe ?? "Claude returned an empty recipe.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Recipe generation failed.");
      setGeneratedRecipe("");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="grid gap-5 rounded-[1.75rem] border border-stone-200 bg-white p-4 shadow-sm sm:gap-6 sm:rounded-[2rem] sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div className="flex flex-wrap gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-stone-500 sm:text-xs">
          <span>Pick</span>
          <span>Mix</span>
          <span>Generate</span>
        </div>

        <h2 className="mt-4 text-xl font-semibold tracking-tight text-stone-950 sm:text-2xl">
          Choose what is in your kitchen.
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600 sm:text-base sm:leading-7">
          Tap ingredients or type your own list if your ingredient is not shown below.
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-6 sm:gap-3">
          {ingredients.map((ingredient) => {
            const isSelected = selectedIngredients.includes(ingredient.name);

            return (
              <button
                key={ingredient.name}
                type="button"
                onClick={() => toggleIngredient(ingredient.name)}
                className={`rounded-full border px-3 py-2 text-sm font-medium transition sm:px-4 ${
                  isSelected
                    ? "border-rose-600 bg-rose-600 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50"
                }`}
              >
                {ingredient.name}
              </button>
            );
          })}
        </div>

        {/* Suggestions section */}
        {(suggestedIngredients.length > 0 || matchingRecipes.length > 0) && (
          <div className="mt-5 space-y-4 rounded-3xl border border-stone-200 bg-stone-50 p-4 sm:mt-6 sm:p-5">
            {suggestedIngredients.length > 0 && (
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Suggested ingredients
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestedIngredients.map((ing) => (
                    <button
                      key={ing}
                      onClick={() => {
                        if (!allIngredients.includes(ing)) {
                          const newSelected = [...selectedIngredients, ing];
                          setSelectedIngredients(newSelected);
                          const newAll = mergeIngredients(newSelected, typedIngredients);
                          loadSuggestions(newAll);
                        }
                      }}
                      className="rounded-full border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                    >
                      + {ing}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {matchingRecipes.length > 0 && (
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Similar recipes in database
                </p>
                <ul className="mt-3 space-y-2">
                  {matchingRecipes.slice(0, 3).map((recipe) => (
                    <li
                      key={recipe.id}
                      className="rounded-lg bg-white ring-1 ring-stone-200 transition hover:ring-orange-400"
                    >
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="flex items-center justify-between p-2 px-3 text-sm text-stone-600 hover:text-orange-600"
                      >
                        <span className="font-medium">{recipe.title}</span>
                        <span className="text-xs text-stone-500">
                          {(recipe.similarity * 100).toFixed(0)}% match
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 rounded-3xl border border-stone-200 bg-stone-50 p-4 sm:mt-6 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                Or enter your own
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Type ingredients separated by commas or new lines if they are not listed above.
              </p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-500 ring-1 ring-stone-200">
              {typedIngredients.length} typed
            </span>
          </div>

          <textarea
            value={typedIngredientsText}
            onChange={(event) => {
              setTypedIngredientsText(event.target.value);
              setGeneratedRecipe("");
              setError("");
              // Update suggestions with new typed ingredients
              const newTyped = parseTypedIngredients(event.target.value);
              const newAll = mergeIngredients(selectedIngredients, newTyped);
              loadSuggestions(newAll);
            }}
            placeholder="For example: salmon, broccoli, soy sauce, rice"
            rows={4}
            className="mt-4 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
          />
        </div>
      </div>

      <div className="rounded-[1.5rem] bg-stone-50 p-4 sm:p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">
          Ingredients for recipe
        </p>
        <p className="mt-3 text-2xl font-semibold text-stone-950 sm:text-3xl">{allIngredients.length}</p>
        <p className="mt-1 text-sm text-stone-600">ingredients ready to turn into a recipe</p>

        <div className="mt-4 min-h-24 rounded-2xl border border-stone-200 bg-white p-4 text-sm leading-7 text-stone-700 sm:mt-5">
          {allIngredients.length > 0 ? allIngredients.join(", ") : "No ingredients entered yet."}
        </div>

        <button
          type="button"
          onClick={generateRecipe}
          disabled={allIngredients.length === 0 || isGenerating}
          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-rose-600 px-6 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-stone-300 sm:mt-4"
        >
          {isGenerating ? "Generating with Claude..." : "Generate recipes"}
        </button>

        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 sm:mt-4">
          <p className="text-sm font-semibold text-stone-950">Recipe idea</p>
          {error ? (
            <p className="mt-2 text-sm leading-6 text-rose-700">{error}</p>
          ) : generatedRecipe ? (
            <article className="mt-3 overflow-hidden rounded-[1.4rem] border border-stone-200 bg-stone-50">
              <div className="border-b border-stone-200 bg-white px-4 py-4 sm:px-5">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-700">
                  Chef&apos;s note
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-stone-950 sm:text-2xl">
                  {parsedRecipe.title}
                </h3>
                {parsedRecipe.summary ? (
                  <p className="mt-2 max-w-prose text-sm leading-6 text-stone-600">
                    {parsedRecipe.summary}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-px bg-stone-200 sm:grid-cols-[1fr_1.15fr]">
                <section className="bg-stone-50 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                      Ingredients
                    </h4>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-500 ring-1 ring-stone-200">
                      {parsedRecipe.ingredients.length || allIngredients.length} items
                    </span>
                  </div>

                  <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
                    {(parsedRecipe.ingredients.length > 0
                      ? parsedRecipe.ingredients
                      : allIngredients.map((ingredient) => `${ingredient} (selected)`)
                    ).map((ingredient) => (
                      <li key={ingredient} className="flex gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-stone-200">
                        <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <span>{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                      Instructions
                    </h4>
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
                      {parsedRecipe.instructions.length || 0} steps
                    </span>
                  </div>

                  <ol className="mt-4 space-y-3">
                    {(parsedRecipe.instructions.length > 0
                      ? parsedRecipe.instructions
                      : parsedRecipe.fallback
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                    ).map((step, index) => (
                      <li key={`${index}-${step}`} className="flex gap-3 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-950 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <p className="text-sm leading-6 text-stone-700">{step}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            </article>
          ) : (
            <div className="mt-3 rounded-[1.4rem] border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm leading-6 text-stone-500">
              Your recipe will appear here as a styled card with ingredients and steps once Claude finishes.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
