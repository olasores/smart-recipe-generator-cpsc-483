import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);

type SuggestionsRequest = {
  ingredients?: unknown;
};

export async function POST(request: Request) {
  let body: SuggestionsRequest;
  try {
    body = (await request.json()) as SuggestionsRequest;
  } catch {
    return Response.json(
      { matchingRecipes: [], suggestedIngredients: [], error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const ingredients = Array.isArray(body.ingredients)
    ? body.ingredients
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  if (ingredients.length === 0) {
    return Response.json({ matchingRecipes: [], suggestedIngredients: [] });
  }

  try {
    const projectRoot = process.cwd();
    const pythonScript = path.join(projectRoot, "ml", "src", "predict.py");
    const ingredientsArg = ingredients
      .map((ing) => `"${ing.replace(/"/g, '\\"')}"`)
      .join(" ");
    const command = `cd "${projectRoot}" && python3 "${pythonScript}" ${ingredientsArg}`;

    const { stdout } = await execPromise(command, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 15_000,
    });

    const predictions = JSON.parse(stdout.trim());
    return Response.json({
      matchingRecipes: predictions.matchingRecipes ?? [],
      suggestedIngredients: predictions.suggestedIngredients ?? [],
    });
  } catch (error) {
    console.error("Suggestions error:", error);
    return Response.json(
      {
        matchingRecipes: [],
        suggestedIngredients: [],
        error: "Failed to compute suggestions.",
      },
      { status: 500 }
    );
  }
}
