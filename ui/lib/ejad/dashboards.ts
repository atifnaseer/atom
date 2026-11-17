// Ejad dashboards = Atom resources of kind "ejad_dashboard" in the workspace
// tenant, with attributes { source: "ejad", layout: Widget[] }. They are an
// Ejad feature (Magistrala has no dashboard object), hence the "ejad" source.
//
// Widgets read channel data through /api/ejad/messages (the Magistrala
// message reader). Reader times are Unix nanoseconds; see messages.ts.

import { formatNumber, type Locale, pageLocale } from "@/lib/ejad/i18n/core";
import {
  type AGGREGATION_INTERVALS,
  isUuid,
  messageDate,
  type ReaderMessage,
} from "@/lib/ejad/messages";
import type { GraphqlFn } from "@/lib/ejad/workspaces";

export const RESOURCE_KIND_DASHBOARD = "ejad_dashboard";
export const EJAD_SOURCE = "ejad";
export const DASHBOARD_NAME_MAX_LENGTH = 120;

/** Line charts redraw every 10 s; single values, tables and counts every 5 s. */
export const CHART_REFRESH_MS = 10_000;
export const VALUE_REFRESH_MS = 5_000;

// --- Widgets -----------------------------------------------------------------

export const WIDGET_TYPES = [
  "line",
  "value",
  "gauge",
  "table",
  "device_status",
] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  line: "Line chart",
  value: "Latest value",
  gauge: "Gauge",
  table: "Latest messages",
  device_status: "Device status",
};

export const WIDGET_SIZES = ["small", "medium", "large"] as const;
export type WidgetSize = (typeof WIDGET_SIZES)[number];

export const TIME_RANGES = ["15m", "1h", "6h", "24h", "7d"] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

type RangeSpec = {
  label: string;
  ms: number;
  /** Reader aggregation bucket; null reads raw messages. */
  interval: (typeof AGGREGATION_INTERVALS)[number] | null;
};

export const TIME_RANGE_SPECS: Record<TimeRange, RangeSpec> = {
  "15m": { label: "Last 15 minutes", ms: 15 * 60_000, interval: null },
  "1h": { label: "Last hour", ms: 60 * 60_000, interval: null },
  "6h": { label: "Last 6 hours", ms: 6 * 3_600_000, interval: "5m" },
  "24h": { label: "Last 24 hours", ms: 24 * 3_600_000, interval: "15m" },
  "7d": { label: "Last 7 days", ms: 7 * 24 * 3_600_000, interval: "1h" },
};

export const THRESHOLD_COLORS = [
  "good",
  "warning",
  "serious",
  "critical",
] as const;
export type ThresholdColor = (typeof THRESHOLD_COLORS)[number];

/** From `value` upwards the reading shows in `color`. */
export type Threshold = { value: number; color: ThresholdColor };

export const LINE_MAX_SERIES = 8;
export const TABLE_ROW_OPTIONS = [5, 10, 20, 50] as const;

type WidgetBase = { id: string; title: string; size: WidgetSize };

export type LineWidget = WidgetBase & {
  type: "line";
  channelId: string;
  names: string[];
  range: TimeRange;
};
export type ValueWidget = WidgetBase & {
  type: "value";
  channelId: string;
  name: string;
  /** Shown after the value; empty uses the message's own unit. */
  unit: string;
  thresholds: Threshold[];
};
export type GaugeWidget = WidgetBase & {
  type: "gauge";
  channelId: string;
  name: string;
  unit: string;
  min: number;
  max: number;
};
export type TableWidget = WidgetBase & {
  type: "table";
  channelId: string;
  /** Only messages with this name; empty shows all. */
  name: string;
  rows: number;
};
export type DeviceStatusWidget = WidgetBase & { type: "device_status" };

export type Widget =
  | LineWidget
  | ValueWidget
  | GaugeWidget
  | TableWidget
  | DeviceStatusWidget;

export type ChannelWidget = Exclude<Widget, DeviceStatusWidget>;

export function isChannelWidget(widget: Widget): widget is ChannelWidget {
  return widget.type !== "device_status";
}

export const DEFAULT_WIDGET_SIZE: Record<WidgetType, WidgetSize> = {
  line: "large",
  value: "small",
  gauge: "small",
  table: "medium",
  device_status: "small",
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function oneOf<T extends string>(
  list: readonly T[],
  value: unknown,
  fallback: T,
): T {
  return list.includes(value as T) ? (value as T) : fallback;
}

export function sortThresholds(thresholds: Threshold[]): Threshold[] {
  return [...thresholds].sort((a, b) => a.value - b.value);
}

function parseThresholds(value: unknown): Threshold[] {
  if (!Array.isArray(value)) return [];
  return sortThresholds(
    value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const { value: v, color } = item as Record<string, unknown>;
      if (typeof v !== "number" || !Number.isFinite(v)) return [];
      if (!THRESHOLD_COLORS.includes(color as ThresholdColor)) return [];
      return [{ value: v, color: color as ThresholdColor }];
    }),
  );
}

/**
 * One widget from stored JSON, or null when it cannot be shown. Missing
 * optional fields get defaults, so older layouts keep working.
 */
export function parseWidget(raw: unknown): Widget | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const type = item.type as WidgetType;
  if (!WIDGET_TYPES.includes(type)) return null;
  const id = str(item.id);
  if (!id) return null;
  const base = {
    id,
    title: str(item.title),
    size: oneOf(WIDGET_SIZES, item.size, DEFAULT_WIDGET_SIZE[type]),
  };
  if (type === "device_status") return { ...base, type };

  const channelId = str(item.channelId);
  if (!isUuid(channelId)) return null;
  switch (type) {
    case "line": {
      const names = Array.isArray(item.names)
        ? [
            ...new Set(
              item.names.filter(
                (name): name is string =>
                  typeof name === "string" && name.trim() !== "",
              ),
            ),
          ].slice(0, LINE_MAX_SERIES)
        : [];
      if (names.length === 0) return null;
      return {
        ...base,
        type,
        channelId,
        names,
        range: oneOf(TIME_RANGES, item.range, "1h"),
      };
    }
    case "value":
      if (!str(item.name)) return null;
      return {
        ...base,
        type,
        channelId,
        name: str(item.name),
        unit: str(item.unit),
        thresholds: parseThresholds(item.thresholds),
      };
    case "gauge": {
      if (!str(item.name)) return null;
      const min = num(item.min, 0);
      const max = num(item.max, 100);
      if (max <= min) return null;
      return {
        ...base,
        type,
        channelId,
        name: str(item.name),
        unit: str(item.unit),
        min,
        max,
      };
    }
    case "table":
      return {
        ...base,
        type,
        channelId,
        name: str(item.name),
        rows: TABLE_ROW_OPTIONS.includes(item.rows as never)
          ? (item.rows as number)
          : 10,
      };
  }
}

/** The widgets stored in a dashboard's attributes, skipping broken ones. */
export function parseLayout(attributes: Record<string, unknown> | null) {
  const layout = attributes?.layout;
  if (!Array.isArray(layout)) return [];
  return layout.flatMap((raw) => parseWidget(raw) ?? []);
}

/** Default heading of a widget without its own title. */
export function widgetTitle(widget: Widget): string {
  if (widget.title.trim()) return widget.title.trim();
  switch (widget.type) {
    case "line":
      return widget.names.join(", ");
    case "value":
    case "gauge":
      return widget.name;
    case "table":
      return widget.name ? `Latest ${widget.name}` : "Latest messages";
    case "device_status":
      return "Device status";
  }
}

export function newWidgetId(): string {
  return globalThis.crypto.randomUUID();
}

/** Moves the widget at `from` to index `to` (both within the list). */
export function moveWidget(layout: Widget[], from: number, to: number) {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= layout.length ||
    to >= layout.length
  )
    return layout;
  const next = [...layout];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function replaceWidget(layout: Widget[], widget: Widget) {
  const index = layout.findIndex((item) => item.id === widget.id);
  if (index === -1) return [...layout, widget];
  const next = [...layout];
  next[index] = widget;
  return next;
}

// --- Values --------------------------------------------------------------------

/** The colour of the highest threshold the value reaches, or null. */
export function thresholdColor(
  value: number,
  thresholds: Threshold[],
): ThresholdColor | null {
  let color: ThresholdColor | null = null;
  for (const threshold of sortThresholds(thresholds)) {
    if (value >= threshold.value) color = threshold.color;
  }
  return color;
}

/** Where the value sits between min and max, from 0 to 1. */
export function gaugeFraction(value: number, min: number, max: number) {
  if (!(max > min)) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/** A number for display: at most 2 decimals, no trailing zeros. */
export function formatReading(
  value: number,
  locale: Locale = pageLocale(),
): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
  return formatNumber(locale, value, { maximumFractionDigits: digits });
}

function msToNanos(ms: number): string {
  return (BigInt(Math.round(ms)) * BigInt(1_000_000)).toString();
}

/** Reader parameters for one series of a line chart. */
export function seriesParams(
  name: string,
  range: TimeRange,
  nowMs = Date.now(),
): URLSearchParams {
  const spec = TIME_RANGE_SPECS[range];
  const params = new URLSearchParams({
    name,
    from: msToNanos(nowMs - spec.ms),
    to: msToNanos(nowMs),
    limit: "1000",
  });
  if (spec.interval) {
    params.set("aggregation", "avg");
    params.set("interval", spec.interval);
  }
  return params;
}

export type SeriesRow = { t: number } & Record<string, number>;

/**
 * Joins each name's messages into rows keyed by time, oldest first. Values
 * sharing a timestamp are averaged (the reader's aggregated buckets come
 * back once per publisher).
 */
export function mergeSeries(
  series: { name: string; messages: ReaderMessage[] }[],
): SeriesRow[] {
  const sums = new Map<number, Map<string, { sum: number; n: number }>>();
  for (const { name, messages } of series) {
    for (const message of messages) {
      if (typeof message.value !== "number") continue;
      const date = messageDate(message.time);
      if (!date) continue;
      const t = date.getTime();
      let row = sums.get(t);
      if (!row) {
        row = new Map();
        sums.set(t, row);
      }
      const cell = row.get(name) ?? { sum: 0, n: 0 };
      cell.sum += message.value;
      cell.n += 1;
      row.set(name, cell);
    }
  }
  return [...sums.entries()]
    .sort(([a], [b]) => a - b)
    .map(([t, row]) => {
      const out: SeriesRow = { t } as SeriesRow;
      for (const [name, cell] of row) out[name] = cell.sum / cell.n;
      return out;
    });
}

/** The newest message per name, in order of first appearance (newest first). */
export function latestByName(messages: ReaderMessage[]): ReaderMessage[] {
  const seen = new Map<string, ReaderMessage>();
  for (const message of messages) {
    const name = message.name ?? "";
    const current = seen.get(name);
    if (!current || (message.time ?? 0) > (current.time ?? 0))
      seen.set(name, message);
  }
  return [...seen.values()];
}

/** Distinct measurement names seen in a batch of messages, sorted. */
export function measurementNames(messages: ReaderMessage[]): string[] {
  return [
    ...new Set(messages.map((message) => message.name ?? "").filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
}

// --- Dashboards (Atom resources) --------------------------------------------

export type Dashboard = {
  id: string;
  kind: string;
  name: string | null;
  tenantId: string | null;
  attributes: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
};

export const DASHBOARD_FIELDS =
  "id kind name tenantId attributes createdAt updatedAt";

export const DASHBOARDS_QUERY = `
  query EjadDashboards($tenantId: ID!) {
    resources(kind: "${RESOURCE_KIND_DASHBOARD}", tenantId: $tenantId, order: created_at, dir: desc, limit: 200) {
      total
      items { ${DASHBOARD_FIELDS} }
    }
  }
`;

export const DASHBOARD_QUERY = `
  query EjadDashboard($id: ID!) {
    resource(id: $id) { ${DASHBOARD_FIELDS} }
  }
`;

export const CREATE_DASHBOARD_MUTATION = `
  mutation EjadCreateDashboard($input: CreateResourceInput!) {
    createResource(input: $input) { ${DASHBOARD_FIELDS} }
  }
`;

export const UPDATE_DASHBOARD_MUTATION = `
  mutation EjadUpdateDashboard($id: ID!, $input: UpdateResourceInput!) {
    updateResource(id: $id, input: $input) { ${DASHBOARD_FIELDS} }
  }
`;

export const DELETE_DASHBOARD_MUTATION = `
  mutation EjadDeleteDashboard($id: ID!) { deleteResource(id: $id) }
`;

export function dashboardName(dashboard: Pick<Dashboard, "id" | "name">) {
  return dashboard.name || "Untitled dashboard";
}

export function isDashboardOf(
  dashboard: Dashboard | null,
  workspaceId: string,
): dashboard is Dashboard {
  return (
    dashboard !== null &&
    dashboard.kind === RESOURCE_KIND_DASHBOARD &&
    dashboard.tenantId === workspaceId
  );
}

export function validateDashboardName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name is required.";
  if (trimmed.length > DASHBOARD_NAME_MAX_LENGTH)
    return `Name must be at most ${DASHBOARD_NAME_MAX_LENGTH} characters.`;
  return null;
}

/**
 * Attributes holding `layout`. Atom replaces attributes wholesale on update,
 * so every other attribute is carried over.
 */
export function layoutAttributes(
  attributes: Record<string, unknown> | null,
  layout: Widget[],
): Record<string, unknown> {
  return { ...(attributes ?? {}), source: EJAD_SOURCE, layout };
}

export function createDashboardInput(
  tenantId: string,
  name: string,
  layout: Widget[] = [],
) {
  return {
    kind: RESOURCE_KIND_DASHBOARD,
    name: name.trim(),
    tenantId,
    attributes: { source: EJAD_SOURCE, layout },
  };
}

/** "Plant" → "Plant (copy)", "Plant (copy)" → "Plant (copy 2)", … */
export function copyName(name: string, taken: string[] = []): string {
  const base = name.replace(/ \(copy(?: \d+)?\)$/, "");
  const names = new Set(taken);
  let candidate = `${base} (copy)`;
  for (let n = 2; names.has(candidate); n++) candidate = `${base} (copy ${n})`;
  return candidate.slice(0, DASHBOARD_NAME_MAX_LENGTH);
}

export async function createDashboard(
  gql: GraphqlFn,
  tenantId: string,
  name: string,
  layout: Widget[] = [],
): Promise<Dashboard> {
  const problem = validateDashboardName(name);
  if (problem) throw new Error(problem);
  const { createResource } = await gql<{ createResource: Dashboard }>({
    query: CREATE_DASHBOARD_MUTATION,
    variables: { input: createDashboardInput(tenantId, name, layout) },
  });
  return createResource;
}

export async function renameDashboard(
  gql: GraphqlFn,
  id: string,
  name: string,
): Promise<Dashboard> {
  const problem = validateDashboardName(name);
  if (problem) throw new Error(problem);
  const { updateResource } = await gql<{ updateResource: Dashboard }>({
    query: UPDATE_DASHBOARD_MUTATION,
    variables: { id, input: { name: name.trim() } },
  });
  return updateResource;
}

/** A copy with fresh widget IDs, so the two layouts never share one. */
export async function duplicateDashboard(
  gql: GraphqlFn,
  dashboard: Dashboard,
  name: string,
): Promise<Dashboard> {
  const layout = parseLayout(dashboard.attributes).map((widget) => ({
    ...widget,
    id: newWidgetId(),
  }));
  if (!dashboard.tenantId) throw new Error("The dashboard has no workspace.");
  return createDashboard(gql, dashboard.tenantId, name, layout);
}

/** Saves the layout, re-reading the dashboard first to keep other attributes. */
export async function saveDashboardLayout(
  gql: GraphqlFn,
  id: string,
  layout: Widget[],
): Promise<Dashboard> {
  const { resource } = await gql<{ resource: Dashboard | null }>({
    query: DASHBOARD_QUERY,
    variables: { id },
  });
  if (!resource || resource.kind !== RESOURCE_KIND_DASHBOARD)
    throw new Error("The dashboard no longer exists.");
  const { updateResource } = await gql<{ updateResource: Dashboard }>({
    query: UPDATE_DASHBOARD_MUTATION,
    variables: {
      id,
      input: { attributes: layoutAttributes(resource.attributes, layout) },
    },
  });
  return updateResource;
}
