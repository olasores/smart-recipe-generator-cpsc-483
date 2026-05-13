import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

type RecipeRequest = {
  ingredients?: unknown;
};

function extractIngredients(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  let body: RecipeRequest;

  try {
    body = (await request.json()) as RecipeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ingredients = extractIngredients(body.ingredients);

  if (ingredients.length === 0) {
    return NextResponse.json({ error: "Pick at least one ingredient." }, { status: 400 });
  }

  // Get ML predictions for context
  let matchingRecipes = [];
  try {
    const mlDir = path.join(process.cwd(), "ml", "src");
    const command = `cd ${mlDir} && python3 predict.py ${ingredients.map((ing) => `"${ing}"`).join(" ")}`;
    const output = execSync(command, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    const result = JSON.parse(output);
    matchingRecipes = result.matchingRecipes || [];
  } catch (error) {
    console.error("ML prediction error:", error);
    // Continue without ML context if it fails
  }

  // Build context from matching recipes
  const recipeContext =
    matchingRecipes.length > 0
      ? `\n\nHere are similar recipes from our database that use these ingredients:\n${matchingRecipes
          .map((r) => `- ${r.title} (${(r.similarity * 100).toFixed(0)}% ingredient match)`)
          .join("\n")}\n\nUse these as inspiration for your recipe.`
      : "";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 700,
      temperature: 0.7,
      system:
        "You are a practical recipe generator. Write a concise, friendly recipe using the ingredients the user selected. Include a title, short summary, ingredient list, and 4 to 6 steps. Use plain text only. Do not use emojis, bold, italics, or decorative symbols. If helpful, mention a couple of pantry staples, but do not invent rare ingredients.",
      messages: [
        {
          role: "user",
          content: `Selected ingredients: ${ingredients.join(", ")}. Generate one recipe in plain text only. Avoid emojis, markdown emphasis, and decorative symbols.${recipeContext}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();

    return NextResponse.json(
      { error: "Anthropic request failed.", details },
      { status: 502 }
    );
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const recipe =
    data.content
      ?.filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n") ?? "";

  if (!recipe.trim()) {
    return NextResponse.json({ error: "Anthropic returned an empty response." }, { status: 502 });
  }

  return NextResponse.json({ recipe });
}
