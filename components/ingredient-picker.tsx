"use client";

import { useEffect, useRef, useState } from "react";

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

/** Fields returned from `/matching-recipes` for each row and for `user_query_model`. */
type TrainedModelAnnotation = {
  trained_label: string;
  trained_probabilities?: Record<string, number>;
};

type DatasetMatch = TrainedModelAnnotation & {
  title: string;
  similarity: number;
  snippet: string;
  ingredients?: string[];
  directions?: string[];
  ner_ingredient_hits?: number;
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
  const [userQueryModel, setUserQueryModel] = useState<TrainedModelAnnotation | null>(null);
  const [datasetMatches, setDatasetMatches] = useState<DatasetMatch[]>([]);
  const [matchNote, setMatchNote] = useState("");
  const [matchError, setMatchError] = useState("");
  const [isMatchLoading, setIsMatchLoading] = useState(false);
  const [requiredIngredients, setRequiredIngredients] = useState<string[]>([]);
  const [suggestedIngredients, setSuggestedIngredients] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const suggestRequestId = useRef(0);
  const parsedRecipe = parseRecipe(generatedRecipe);
  const typedIngredients = parseTypedIngredients(typedIngredientsText);
  const allIngredients = mergeIngredients(selectedIngredients, typedIngredients);

  useEffect(() => {
    if (allIngredients.length === 0) {
      setSuggestedIngredients([]);
      return;
    }

    const requestId = ++suggestRequestId.current;
    const timer = window.setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const response = await fetch("/api/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ingredients: allIngredients }),
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { suggestedIngredients?: string[] };
        if (requestId !== suggestRequestId.current) return;
        setSuggestedIngredients(
          (payload.suggestedIngredients ?? []).filter(
            (s) => !allIngredients.some((picked) => picked.toLowerCase() === s.toLowerCase())
          )
        );
      } catch {
        // network errors are non-fatal — just leave the list empty
      } finally {
        if (requestId === suggestRequestId.current) {
          setIsLoadingSuggestions(false);
        }
      }
    }, 300);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIngredients.join("|")]);

  function toggleIngredient(name: string) {
    setGeneratedRecipe("");
    setError("");
    setUserQueryModel(null);
    setDatasetMatches([]);
    setMatchNote("");
    setMatchError("");
    setRequiredIngredients([]);
    setSelectedIngredients((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    );
  }

  function addSuggestedIngredient(name: string) {
    const alreadyPicked = allIngredients.some(
      (picked) => picked.toLowerCase() === name.toLowerCase()
    );
    if (alreadyPicked) return;
    setGeneratedRecipe("");
    setError("");
    setUserQueryModel(null);
    setDatasetMatches([]);
    setMatchNote("");
    setMatchError("");
    setRequiredIngredients([]);
    setSelectedIngredients((current) => [...current, name]);
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

  async function findSimilarFromDataset() {
    if (allIngredients.length === 0 || isMatchLoading) {
      return;
    }

    setIsMatchLoading(true);
    setMatchError("");
    setDatasetMatches([]);
    setMatchNote("");
    setUserQueryModel(null);
    setRequiredIngredients([]);

    try {
      const response = await fetch("/api/recipes-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: allIngredients.join(", "), topK: 5 }),
      });

      const payload = (await response.json()) as {
        matches?: DatasetMatch[];
        user_query_model?: TrainedModelAnnotation;
        required_ingredients?: string[];
        note?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load similar recipes.");
      }

      setDatasetMatches(payload.matches ?? []);
      setMatchNote(payload.note ?? "");
      setRequiredIngredients(
        Array.isArray(payload.required_ingredients)
          ? payload.required_ingredients.filter((s): s is string => typeof s === "string")
          : []
      );
      const uqm = payload.user_query_model;
      if (uqm && typeof uqm.trained_label === "string") {
        setUserQueryModel({
          trained_label: uqm.trained_label,
          trained_probabilities: uqm.trained_probabilities,
        });
      }
    } catch (cause) {
      setMatchError(cause instanceof Error ? cause.message : "Match request failed.");
    } finally {
      setIsMatchLoading(false);
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

        {(suggestedIngredients.length > 0 || isLoadingSuggestions) && (
          <div className="mt-5 rounded-3xl border border-stone-200 bg-stone-50 p-4 sm:mt-6 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                Often paired with your picks
              </p>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-500 ring-1 ring-stone-200">
                Unsupervised · co-occurrence
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              Mined from 13K recipes by counting which ingredients appear together. Click to add.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {isLoadingSuggestions && suggestedIngredients.length === 0 ? (
                <span className="text-xs text-stone-500">Finding pairings...</span>
              ) : (
                suggestedIngredients.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addSuggestedIngredient(suggestion)}
                    className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:border-rose-400 hover:bg-rose-50"
                  >
                    + {suggestion}
                  </button>
                ))
              )}
            </div>
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
              setUserQueryModel(null);
              setDatasetMatches([]);
              setMatchNote("");
              setMatchError("");
              setRequiredIngredients([]);
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

        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">Trained model + RecipeNLG</p>
          <p className="mt-1 text-xs leading-5 text-emerald-900/80">
            Only shows recipes from the dataset that contain <strong className="font-medium">every</strong> ingredient you listed (matched across NER, ingredient lines, and title). Extra ingredients in the recipe are fine. Tap a result to open <strong className="font-medium">ingredients and numbered cooking steps</strong> from the CSV, similar layout to the Claude card below.
          </p>
          {requiredIngredients.length > 0 ? (
            <p className="mt-2 text-xs font-medium text-emerald-950">
              Must all appear: {requiredIngredients.join(", ")}
            </p>
          ) : null}
          <button
            type="button"
            onClick={findSimilarFromDataset}
            disabled={allIngredients.length === 0 || isMatchLoading || isGenerating}
            className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full border border-emerald-600 bg-white px-5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMatchLoading ? "Searching dataset..." : "Find recipes using all my ingredients"}
          </button>
          {matchError ? <p className="mt-2 text-xs leading-5 text-rose-700">{matchError}</p> : null}
          {userQueryModel ? (
            <div className="mt-3 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs leading-5 text-stone-800 ring-1 ring-emerald-100/80">
              <p>
                <span className="font-semibold text-emerald-900">Your ingredient text → model:</span>{" "}
                {userQueryModel.trained_label}
              </p>
              {userQueryModel.trained_probabilities ? (
                <p className="mt-1 text-stone-600">
                  {Object.entries(userQueryModel.trained_probabilities)
                    .map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
          ) : null}
          {datasetMatches.length > 0 ? (
            <ul className="mt-3 space-y-3 text-left text-sm text-stone-800">
              {datasetMatches.map((m, index) => {
                const ingList = Array.isArray(m.ingredients) ? m.ingredients : [];
                const steps = Array.isArray(m.directions) ? m.directions : [];

                return (
                  <li key={`${m.title}-${index}-${m.similarity}`} className="list-none">
                    <details className="overflow-hidden rounded-[1.4rem] border border-emerald-100 bg-white ring-1 ring-emerald-100/80 open:shadow-md">
                      <summary className="cursor-pointer list-none p-4 marker:hidden [&::-webkit-details-marker]:hidden sm:p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-800">
                          Dataset recipe · tap to expand
                        </p>
                        <h3 className="mt-2 text-lg font-semibold tracking-tight text-stone-950 sm:text-xl">{m.title}</h3>
                        <p className="mt-1 text-xs text-stone-500">
                          Rank score: {(m.similarity * 100).toFixed(1)}%
                          {typeof m.ner_ingredient_hits === "number" && requiredIngredients.length > 0
                            ? ` · Your words in NER: ${m.ner_ingredient_hits}/${requiredIngredients.length}`
                            : null}
                        </p>
                        <p className="mt-1 text-xs font-medium text-emerald-900">
                          Trained model: {m.trained_label ?? "—"}
                          {m.trained_probabilities
                            ? ` (${Object.entries(m.trained_probabilities)
                                .map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`)
                                .join(", ")})`
                            : null}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-stone-600">{m.snippet}</p>
                        <p className="mt-3 text-xs font-semibold text-emerald-800">▼ Show ingredients &amp; steps</p>
                      </summary>
                      <div className="border-t border-stone-200 bg-stone-50">
                        <div className="grid gap-px bg-stone-200 sm:grid-cols-[1fr_1.15fr]">
                          <section className="bg-stone-50 p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                                Ingredients
                              </h4>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-500 ring-1 ring-stone-200">
                                {ingList.length || 0} items
                              </span>
                            </div>
                            <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
                              {ingList.length > 0 ? (
                                ingList.map((line, li) => (
                                  <li
                                    key={`${index}-ing-${li}`}
                                    className="flex gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-stone-200"
                                  >
                                    <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                                    <span>{line}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-xs text-stone-500">No ingredient lines in this row.</li>
                              )}
                            </ul>
                          </section>
                          <section className="bg-white p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
                                Instructions
                              </h4>
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">
                                {steps.length} steps
                              </span>
                            </div>
                            <ol className="mt-4 space-y-3">
                              {steps.map((step, stepIndex) => (
                                <li
                                  key={`${index}-step-${stepIndex}`}
                                  className="flex gap-3 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200"
                                >
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-950 text-xs font-semibold text-white">
                                    {stepIndex + 1}
                                  </span>
                                  <p className="text-sm leading-6 text-stone-700">{step}</p>
                                </li>
                              ))}
                            </ol>
                          </section>
                        </div>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {matchNote ? <p className="mt-2 text-[0.65rem] leading-4 text-stone-500">{matchNote}</p> : null}
        </div>

        <button
          type="button"
          onClick={generateRecipe}
          disabled={allIngredients.length === 0 || isGenerating || isMatchLoading}
          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-rose-600 px-6 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-stone-300 sm:mt-4"
        >
          {isGenerating ? "Generating with Claude..." : "Generate recipes (optional, Claude)"}
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
