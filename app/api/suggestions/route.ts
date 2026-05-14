const DEFAULT_ML_URL = "http://127.0.0.1:8765";

type SuggestionsRequest = {
  ingredients?: unknown;
};

export async function POST(request: Request) {
  const mlBase = (process.env.ML_API_URL ?? DEFAULT_ML_URL).replace(/\/$/, "");

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
    ? body.ingredients.filter((item): item is string => typeof item === "string").map((item) => item.trim())
    : [];

  if (ingredients.length === 0) {
    return Response.json({
      matchingRecipes: [],
      suggestedIngredients: [],
    });
  }

  try {
    // Call the ML service /matching-recipes endpoint
    const response = await fetch(`${mlBase}/matching-recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients: ingredients.join(", "), top_k: 5 }),
      signal: AbortSignal.timeout(60_000),
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      console.error("ML service error:", payload);
      return Response.json(
        { matchingRecipes: [], suggestedIngredients: [], error: "ML service error" },
        { status: 503 }
      );
    }

    // Extract matches from ML response
    const matches = (payload.matches as any[]) || [];
    const userQueryModel = (payload.user_query_model as Record<string, unknown>) || {};
    const note = typeof payload.note === "string" ? payload.note : "";
    const matchingRecipes = matches.slice(0, 3).map((m: any) => ({
      id: m.title?.hashCode?.() ?? Math.random(),
      title: m.title || "Unknown Recipe",
      similarity: m.similarity || 0,
      snippet: typeof m.snippet === "string" ? m.snippet : "",
      trainedLabel: typeof m.trained_label === "string" ? m.trained_label : "",
      trainedProbabilities: (m.trained_probabilities as Record<string, number>) || {},
    }));

    // Extract suggested ingredients from NER field of matches
    const suggestedSet = new Set<string>();
    matches.forEach((m: any) => {
      if (m.ner_ingredient_hits && typeof m.ner_ingredient_hits === "number") {
        // Suggest ingredients that had good NER hits
        if (m.ingredients && Array.isArray(m.ingredients)) {
          m.ingredients.slice(0, 2).forEach((ing: string) => suggestedSet.add(ing));
        }
      }
    });
    const suggestedIngredients = Array.from(suggestedSet).slice(0, 5);

    return Response.json({
      matchingRecipes,
      suggestedIngredients,
      matches,
      userQueryModel,
      note,
    });
  } catch (error) {
    console.error("Error calling ML service:", error);
    return Response.json(
      {
        matchingRecipes: [],
        suggestedIngredients: [],
        error: "Could not reach the Python ML service. Run: cd ml && source .venv/bin/activate && uvicorn serve_predict:app --host 127.0.0.1 --port 8765",
      },
      { status: 503 }
    );
  }
}
