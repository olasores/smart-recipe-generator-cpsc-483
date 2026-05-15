"use client";

import { MetricEvent } from "@/lib/metrics/common";

const CLIENT_METRICS_ENDPOINT = "/api/metrics-events";

type ClientMetricInput = Omit<MetricEvent, "ts">;

export function recordClientMetric(event: ClientMetricInput): void {
  if (typeof window === "undefined") return;

  const payload: MetricEvent = {
    ...event,
    ts: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(CLIENT_METRICS_ENDPOINT, body);
    return;
  }

  void fetch(CLIENT_METRICS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Drop client telemetry errors to avoid impacting UX.
  });
}
