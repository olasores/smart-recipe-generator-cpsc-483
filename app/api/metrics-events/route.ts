import { NextResponse } from "next/server";

import { MetricEvent } from "@/lib/metrics/common";
import { recordServerMetric } from "@/lib/metrics/server";

function isMetricEvent(value: unknown): value is MetricEvent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.metric === "string" &&
    typeof candidate.value === "number" &&
    typeof candidate.unit === "string"
  );
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const events = Array.isArray(payload) ? payload : [payload];
  const validEvents = events.filter(isMetricEvent);

  if (validEvents.length === 0) {
    return NextResponse.json({ error: "No valid metric events provided." }, { status: 400 });
  }

  for (const event of validEvents) {
    recordServerMetric({
      ...event,
      labels: {
        source: "ui-client",
        ...(event.labels ?? {}),
      },
    });
  }

  return NextResponse.json({ ok: true, accepted: validEvents.length });
}
