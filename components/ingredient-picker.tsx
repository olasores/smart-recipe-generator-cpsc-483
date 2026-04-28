"use client";

import { useMemo, useState } from "react";

type Ingredient = {
  name: string;
  category: string;
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

export function IngredientPicker() {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [generated, setGenerated] = useState(false);

  const suggestedRecipe = useMemo(() => {
    if (selectedIngredients.length === 0) {
      return "Pick a few ingredients to generate a recipe.";
    }

    if (selectedIngredients.length === 1) {
      return `${selectedIngredients[0]} bowl with garlic, olive oil, and herbs.`;
    }

    return `${selectedIngredients[0]} and ${selectedIngredients[1]} skillet with simple seasonings.`;
  }, [selectedIngredients]);

  function toggleIngredient(name: string) {
    setGenerated(false);
    setSelectedIngredients((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    );
  }

  return (
    <section className="grid gap-6 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
          <span>Pick</span>
          <span>Mix</span>
          <span>Generate</span>
        </div>

        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950">
          Choose what is in your kitchen.
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
          Tap ingredients to build a quick recipe prompt. Keep it simple and use whatever you already
          have.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {ingredients.map((ingredient) => {
            const isSelected = selectedIngredients.includes(ingredient.name);

            return (
              <button
                key={ingredient.name}
                type="button"
                onClick={() => toggleIngredient(ingredient.name)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
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
      </div>

      <div className="rounded-[1.5rem] bg-stone-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">
          Selected ingredients
        </p>
        <p className="mt-3 text-3xl font-semibold text-stone-950">{selectedIngredients.length}</p>
        <p className="mt-1 text-sm text-stone-600">ingredients ready to turn into a recipe</p>

        <div className="mt-5 min-h-24 rounded-2xl border border-stone-200 bg-white p-4 text-sm leading-7 text-stone-700">
          {selectedIngredients.length > 0 ? selectedIngredients.join(", ") : "No ingredients selected yet."}
        </div>

        <button
          type="button"
          onClick={() => setGenerated(true)}
          disabled={selectedIngredients.length === 0}
          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-rose-600 px-6 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          Generate recipes
        </button>

        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-semibold text-stone-950">Recipe idea</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {generated ? suggestedRecipe : "Your recipe idea will show here after you hit generate."}
          </p>
        </div>
      </div>
    </section>
  );
}
