import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

type SuggestionsRequest = {
  ingredients?: unknown;
};

function extractIngredients(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

export async function POST(request: Request) {
  let body: SuggestionsRequest;

  try {
    body = (await request.json()) as SuggestionsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ingredients = extractIngredients(body.ingredients);

  if (ingredients.length === 0) {
    return NextResponse.json({ suggestedIngredients: [] });
  }

  try {
    // Run the Python prediction script
    const mlDir = path.join(process.cwd(), "ml", "src");
    const command = `cd ${mlDir} && python3 predict.py ${ingredients.map((ing) => `"${ing}"`).join(" ")}`;

    const output = execSync(command, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    const result = JSON.parse(output);

    return NextResponse.json({
      suggestedIngredients: result.suggestedIngredients || [],
    });
  } catch (error) {
    console.error("ML prediction error:", error);
    return NextResponse.json({ suggestedIngredients: [] });
  }
}
