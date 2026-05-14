import { NextResponse } from "next/server";

const DEFAULT_ML_URL = "http://127.0.0.1:8765";

type PredictBody = {
  text?: unknown;
};

export async function POST(request: Request) {
  const mlBase = (process.env.ML_API_URL ?? DEFAULT_ML_URL).replace(/\/$/, "");

  let body: PredictBody;
  try {
    body = (await request.json()) as PredictBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 2) {
    return NextResponse.json({ error: "Send { \"text\": \"...\" } with your recipe text or ingredients." }, { status: 400 });
  }

  try {
    const response = await fetch(`${mlBase}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(60_000),
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const detail = payload.detail;
      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail) && detail[0] && typeof (detail[0] as { msg?: string }).msg === "string"
            ? (detail[0] as { msg: string }).msg
            : "ML service returned an error.";

      return NextResponse.json({ error: message, details: payload }, { status: response.status >= 400 ? response.status : 502 });
    }

    return NextResponse.json(payload);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Request failed.";
    return NextResponse.json(
      {
        error:
          "Could not reach the Python ML service. In a second terminal run: cd ml && source .venv/bin/activate && uvicorn serve_predict:app --host 127.0.0.1 --port 8765",
        details: message,
      },
      { status: 503 }
    );
  }
}
