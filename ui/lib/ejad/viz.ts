// Colours for dashboard widgets. Series colours are a validated categorical
// palette (fixed order, a light and a dark step per hue); status colours are
// reserved for thresholds and device states and always come with a label.

import type { ThresholdColor } from "@/lib/ejad/dashboards";

/** Categorical series colours in fixed order: blue, orange, aqua, yellow, … */
export const SERIES_COLORS: { light: string; dark: string }[] = [
  { light: "#2a78d6", dark: "#3987e5" },
  { light: "#eb6834", dark: "#d95926" },
  { light: "#1baf7a", dark: "#199e70" },
  { light: "#eda100", dark: "#c98500" },
  { light: "#e87ba4", dark: "#d55181" },
  { light: "#008300", dark: "#0ca30c" },
  { light: "#6250d6", dark: "#9085e9" },
  { light: "#e34948", dark: "#e66767" },
];

export const STATUS_COLORS: Record<ThresholdColor, string> = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export const STATUS_LABELS: Record<ThresholdColor, string> = {
  good: "Good",
  warning: "Warning",
  serious: "Serious",
  critical: "Critical",
};
