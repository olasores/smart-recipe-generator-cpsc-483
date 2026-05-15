import "server-only";

import { MetricEvent, MetricLabels, roundMs } from "@/lib/metrics/common";

type ApiRequestMetricInput = {
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  ingredientCount?: number;
  topK?: number;
  errorType?: string;
  isTimeout?: boolean;
  context?: Record<string, unknown>;
};

type AuthMetricInput = {
  action: "signup" | "login" | "logout" | "getUser";
  outcome: "ok" | "error";
  durationMs: number;
  errorType?: string;
};

export function nowMs(): number {
  return performance.now();
}

export function elapsedMs(startMs: number): number {
  return roundMs(performance.now() - startMs);
}

export function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const text = `${error.name} ${error.message}`.toLowerCase();
  return text.includes("timeout") || text.includes("abort");
}

export function classifyErrorType(error: unknown): string {
  if (!(error instanceof Error)) return "unknown";
  const text = `${error.name} ${error.message}`.toLowerCase();
  if (text.includes("timeout") || text.includes("abort")) return "timeout";
  if (text.includes("json")) return "parse";
  if (text.includes("network") || text.includes("fetch")) return "upstream";
  return "unknown";
}

export function recordServerMetric(event: MetricEvent): void {
  const payload = {
    ts: event.ts ?? new Date().toISOString(),
    service: "next-api",
    metric: event.metric,
    value: event.value,
    unit: event.unit,
    labels: sanitizeLabels(event.labels),
    context: event.context ?? {},
  };

  console.log(JSON.stringify(payload));
}

export function recordApiRequestMetrics(input: ApiRequestMetricInput): void {
  const labels: MetricLabels = {
    route: input.route,
    method: input.method,
    status_code: input.statusCode,
    outcome: input.statusCode >= 400 ? "error" : "ok",
    error_type: input.errorType,
  };

  const context = {
    ingredient_count: input.ingredientCount,
    top_k: input.topK,
    ...(input.context ?? {}),
  };

  recordServerMetric({
    metric: "app_api_request_duration_ms",
    value: roundMs(input.durationMs),
    unit: "ms",
    labels,
    context,
  });

  recordServerMetric({
    metric: "app_api_request_total",
    value: 1,
    unit: "count",
    labels,
    context,
  });

  if (input.statusCode >= 400) {
    recordServerMetric({
      metric: "app_api_request_errors_total",
      value: 1,
      unit: "count",
      labels,
      context,
    });
  }

  if (input.isTimeout) {
    recordServerMetric({
      metric: "app_api_request_timeouts_total",
      value: 1,
      unit: "count",
      labels,
      context,
    });
  }
}

export function recordAuthMetrics(input: AuthMetricInput): void {
  const labels: MetricLabels = {
    action: input.action,
    outcome: input.outcome,
    error_type: input.errorType,
  };

  recordServerMetric({
    metric: "auth_action_duration_ms",
    value: roundMs(input.durationMs),
    unit: "ms",
    labels,
  });

  if (input.outcome === "error") {
    recordServerMetric({
      metric: "auth_action_errors_total",
      value: 1,
      unit: "count",
      labels,
    });
  }
}

function sanitizeLabels(labels: MetricLabels | undefined): MetricLabels {
  if (!labels) return {};
  const out: MetricLabels = {};
  for (const [key, value] of Object.entries(labels)) {
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}
