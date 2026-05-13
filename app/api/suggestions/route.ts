import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ingredients } = body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return Response.json(
        { 
          matchingRecipes: [],
          suggestedIngredients: [],
          error: 'Please provide a list of ingredients'
        },
        { status: 400 }
      );
    }

    // Call Python predict script
    const projectRoot = process.cwd();
    const pythonScript = path.join(projectRoot, 'ml', 'src', 'predict.py');

    // Build command with properly escaped ingredients
    const ingredientsArg = ingredients
      .map(ing => `"${ing.replace(/"/g, '\\"')}"`)
      .join(' ');
    const command = `cd "${projectRoot}" && python3 "${pythonScript}" ${ingredientsArg}`;

    const { stdout, stderr } = await execPromise(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (stderr) {
      console.warn('Python script stderr:', stderr);
    }

    // Parse JSON output from Python script
    const output = stdout.trim();
    const predictions = JSON.parse(output);

    return Response.json({
      matchingRecipes: predictions.matchingRecipes || [],
      suggestedIngredients: predictions.suggestedIngredients || [],
    });
  } catch (error) {
    console.error('Error in suggestions API:', error);
    return Response.json(
      {
        matchingRecipes: [],
        suggestedIngredients: [],
        error: 'Failed to get suggestions',
      },
      { status: 500 }
    );
  }
}
