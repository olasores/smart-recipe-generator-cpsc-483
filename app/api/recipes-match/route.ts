import { NextResponse } from "next/server";

const DEFAULT_ML_URL = "http://127.0.0.1:8765";

type Body = {
  ingredients?: unknown;
  topK?: unknown;
};

export async function POST(request: Request) {
  const mlBase = (process.env.ML_API_URL ?? DEFAULT_ML_URL).replace(/\/$/, "");

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ingredients = typeof body.ingredients === "string" ? body.ingredients.trim() : "";
  if (ingredients.length < 2) {
    return NextResponse.json({ error: "Send { \"ingredients\": \"chicken, rice, ...\" }." }, { status: 400 });
  }

  const topK = typeof body.topK === "number" && Number.isFinite(body.topK) ? Math.min(20, Math.max(1, body.topK)) : 5;

  try {
    const response = await fetch(`${mlBase}/matching-recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients, top_k: topK }),
      signal: AbortSignal.timeout(120_000),
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const detail = payload.detail;
      const message =
        typeof detail === "string"
          ? detail
          : "ML service returned an error.";
      return NextResponse.json({ error: message, details: payload }, { status: response.status >= 400 ? response.status : 502 });
    }

    return NextResponse.json(payload);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Request failed.";
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
