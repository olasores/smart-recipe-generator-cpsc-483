"use client";

import { useReportWebVitals } from "next/web-vitals";

import { recordClientMetric } from "@/lib/metrics/client";

export function WebVitals() {
  useReportWebVitals((metric) => {
    recordClientMetric({
      metric: "ui_web_vital",
      value: metric.value,
      unit: "ms",
      labels: {
        name: metric.name,
        rating: metric.rating,
        navigation_type: metric.navigationType,
      },
      context: {
        id: metric.id,
        delta: metric.delta,
      },
    });
  });

  return null;
}
