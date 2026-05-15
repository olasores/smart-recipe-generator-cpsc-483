import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);

/** Prefer project venv — `python3` often lacks pandas/sklearn used by `ml/src/predict.py`. */
function resolvePythonExe(projectRoot: string): string {
  const unixVenv = path.join(projectRoot, "ml", ".venv", "bin", "python");
  const winVenv = path.join(projectRoot, "ml", ".venv", "Scripts", "python.exe");
  if (fs.existsSync(unixVenv)) return unixVenv;
  if (fs.existsSync(winVenv)) return winVenv;
  return "python3";
}

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
    const pythonExe = resolvePythonExe(projectRoot);
    const pythonScript = path.join(projectRoot, "ml", "src", "predict.py");
    const ingredientsArg = ingredients
      .map((ing) => `"${ing.replace(/"/g, '\\"')}"`)
      .join(" ");
    const command = `cd "${projectRoot}" && "${pythonExe}" "${pythonScript}" ${ingredientsArg}`;

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
