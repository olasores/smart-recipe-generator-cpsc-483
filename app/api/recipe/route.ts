import { NextResponse } from "next/server";

import {
  elapsedMs,
  nowMs,
  recordApiRequestMetrics,
  recordServerMetric,
} from "@/lib/metrics/server";

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
  const startedAt = nowMs();
  const route = "/api/recipe";
  const method = "POST";
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    recordApiRequestMetrics({
      route,
      method,
      statusCode: 500,
      durationMs: elapsedMs(startedAt),
      errorType: "configuration",
    });
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  let body: RecipeRequest;

  try {
    body = (await request.json()) as RecipeRequest;
  } catch {
    recordApiRequestMetrics({
      route,
      method,
      statusCode: 400,
      durationMs: elapsedMs(startedAt),
      errorType: "parse",
    });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ingredients = extractIngredients(body.ingredients);

  if (ingredients.length === 0) {
    recordApiRequestMetrics({
      route,
      method,
      statusCode: 400,
      durationMs: elapsedMs(startedAt),
      ingredientCount: 0,
      errorType: "validation",
    });
    return NextResponse.json({ error: "Pick at least one ingredient." }, { status: 400 });
  }

  const llmStart = nowMs();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
      max_tokens: 700,
      temperature: 0.7,
      system:
        "You are a practical recipe generator. Write a concise, friendly recipe using the ingredients the user selected. Include a title, short summary, ingredient list, and 4 to 6 steps. Use plain text only. Do not use emojis, bold, italics, or decorative symbols. If helpful, mention a couple of pantry staples, but do not invent rare ingredients.",
      messages: [
        {
          role: "user",
          content: `Selected ingredients: ${ingredients.join(", ")}. Generate one recipe in plain text only. Avoid emojis, markdown emphasis, and decorative symbols.`,
        },
      ],
    }),
  });

  const llmDuration = elapsedMs(llmStart);
  recordServerMetric({
    metric: "llm_request_duration_ms",
    value: llmDuration,
    unit: "ms",
    labels: {
      route,
      method,
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
      status_code: response.status,
      outcome: response.ok ? "ok" : "error",
    },
    context: { ingredient_count: ingredients.length },
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("[api/recipe] Anthropic error", response.status, details);

    recordServerMetric({
      metric: "llm_request_errors_total",
      value: 1,
      unit: "count",
      labels: {
        route,
        method,
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
        status_code: response.status,
        error_type: "upstream",
      },
      context: { ingredient_count: ingredients.length },
    });

    recordApiRequestMetrics({
      route,
      method,
      statusCode: 502,
      durationMs: elapsedMs(startedAt),
      ingredientCount: ingredients.length,
      errorType: "upstream",
      context: { upstream_status_code: response.status },
    });

    return NextResponse.json(
      { error: `Anthropic request failed (${response.status}): ${details}` },
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
    recordServerMetric({
      metric: "llm_empty_response_total",
      value: 1,
      unit: "count",
      labels: {
        route,
        method,
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
      },
      context: { ingredient_count: ingredients.length },
    });

    recordApiRequestMetrics({
      route,
      method,
      statusCode: 502,
      durationMs: elapsedMs(startedAt),
      ingredientCount: ingredients.length,
      errorType: "upstream-empty",
    });

    return NextResponse.json({ error: "Anthropic returned an empty response." }, { status: 502 });
  }

  recordApiRequestMetrics({
    route,
    method,
    statusCode: 200,
    durationMs: elapsedMs(startedAt),
    ingredientCount: ingredients.length,
  });

  return NextResponse.json({ recipe });
}
