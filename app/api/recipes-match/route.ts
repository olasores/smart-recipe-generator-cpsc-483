import { NextResponse } from "next/server";

import {
  classifyErrorType,
  elapsedMs,
  isTimeoutError,
  nowMs,
  recordApiRequestMetrics,
  recordServerMetric,
} from "@/lib/metrics/server";

const DEFAULT_ML_URL = "http://127.0.0.1:8765";

type Body = {
  ingredients?: unknown;
  topK?: unknown;
};

export async function POST(request: Request) {
  const startedAt = nowMs();
  const route = "/api/recipes-match";
  const method = "POST";
  const mlBase = (process.env.ML_API_URL ?? DEFAULT_ML_URL).replace(/\/$/, "");

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    recordApiRequestMetrics({
      route,
      method,
      statusCode: 400,
      durationMs: elapsedMs(startedAt),
      errorType: "parse",
    });
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ingredients = typeof body.ingredients === "string" ? body.ingredients.trim() : "";
  if (ingredients.length < 2) {
    recordApiRequestMetrics({
      route,
      method,
      statusCode: 400,
      durationMs: elapsedMs(startedAt),
      ingredientCount: 0,
      errorType: "validation",
    });
    return NextResponse.json({ error: "Send { \"ingredients\": \"chicken, rice, ...\" }." }, { status: 400 });
  }

  const topK = typeof body.topK === "number" && Number.isFinite(body.topK) ? Math.min(20, Math.max(1, body.topK)) : 5;

  try {
    const upstreamStart = nowMs();
    const response = await fetch(`${mlBase}/matching-recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients, top_k: topK }),
      signal: AbortSignal.timeout(120_000),
    });
    recordServerMetric({
      metric: "ml_inference_duration_ms",
      value: elapsedMs(upstreamStart),
      unit: "ms",
      labels: { route, method, service: "ml-api", status_code: response.status },
      context: { ingredient_count: ingredients.split(",").filter(Boolean).length, top_k: topK },
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const detail = payload.detail;
      const message =
        typeof detail === "string"
          ? detail
          : "ML service returned an error.";
      recordApiRequestMetrics({
        route,
        method,
        statusCode: response.status >= 400 ? response.status : 502,
        durationMs: elapsedMs(startedAt),
        ingredientCount: ingredients.split(",").filter(Boolean).length,
        topK,
        errorType: "upstream",
      });
      return NextResponse.json({ error: message, details: payload }, { status: response.status >= 400 ? response.status : 502 });
    }

    const matches = Array.isArray(payload.matches) ? payload.matches.length : 0;
    recordServerMetric({
      metric: "ml_matches_returned_count",
      value: matches,
      unit: "count",
      labels: { route, method, kind: "dataset_matches" },
      context: { ingredient_count: ingredients.split(",").filter(Boolean).length, top_k: topK },
    });

    recordApiRequestMetrics({
      route,
      method,
      statusCode: 200,
      durationMs: elapsedMs(startedAt),
      ingredientCount: ingredients.split(",").filter(Boolean).length,
      topK,
      context: { matches_count: matches },
    });

    return NextResponse.json(payload);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Request failed.";
    recordApiRequestMetrics({
      route,
      method,
      statusCode: 503,
      durationMs: elapsedMs(startedAt),
      ingredientCount: ingredients.split(",").filter(Boolean).length,
      topK,
      errorType: classifyErrorType(cause),
      isTimeout: isTimeoutError(cause),
    });
    return NextResponse.json(
      {
        error:
          "Could not reach the Python ML service. Run: cd ml && source .venv/bin/activate && uvicorn serve_predict:app --host 127.0.0.1 --port 8765",
        details: message,
      },
      { status: 503 }
    );
  }
}
