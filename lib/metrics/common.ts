export type MetricUnit = "ms" | "count" | "ratio" | "bytes";

export type MetricLabels = Record<string, string | number | boolean | null | undefined>;

export type MetricEvent = {
  metric: string;
  value: number;
  unit: MetricUnit;
  labels?: MetricLabels;
  context?: Record<string, unknown>;
  ts?: string;
};

export function roundMs(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}
