import { readFileSync } from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recipeId = parseInt(id);

    // Read the processed recipes CSV
    const csvPath = path.join(
      process.cwd(),
      "ml",
      "data",
      "processed",
      "recipes.csv"
    );
    const fileContent = readFileSync(csvPath, "utf-8");
    const lines = fileContent.split("\n");

    // Simple CSV parser that handles quoted fields with commas
    function parseCSVWithQuotes(line: string) {
      const result = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote mode
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ""));
          current = "";
        } else {
          current += char;
        }
      }

      result.push(current.trim().replace(/^"|"$/g, ""));
      return result;
    }

    // Parse header
    const headers = parseCSVWithQuotes(lines[0]);
    let recipe: any = null;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = parseCSVWithQuotes(lines[i]);
      const record: any = {};

      headers.forEach((header, idx) => {
        record[header] = values[idx] || "";
      });

      if (parseInt(record.id) === recipeId) {
        recipe = record;
        break;
      }
    }

    if (!recipe) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Parse ingredients and instructions from string representations
    let ingredients = [];
    let instructions = [];

    try {
      ingredients = JSON.parse(recipe.ingredients.replace(/'/g, '"'));
    } catch {
      ingredients = [];
    }

    try {
      instructions = JSON.parse(recipe.instructions.replace(/'/g, '"'));
    } catch {
      instructions = [];
    }

    return Response.json({
      id: recipe.id,
      title: recipe.title,
      ingredients,
      instructions,
      link: recipe.link,
      source: recipe.source,
    });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return Response.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}
