"use client";

import { format } from "date-fns";
import {
  CircleAlert,
  CircleCheck,
  CircleMinus,
  OctagonAlert,
  TriangleAlert,
} from "lucide-react";
import type * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  type DeviceStatusCounts,
  useDeviceStatusCounts,
  useLatestMessages,
  useSeries,
} from "@/components/ejad/dashboards/use-widget-data";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatReading,
  type GaugeWidget,
  gaugeFraction,
  type LineWidget,
  type TableWidget,
  type ThresholdColor,
  TIME_RANGE_SPECS,
  thresholdColor,
  type ValueWidget,
} from "@/lib/ejad/dashboards";
import { errorText } from "@/lib/ejad/errors";
import {
  messageDate,
  messageValue,
  type ReaderMessage,
} from "@/lib/ejad/messages";
import { SERIES_COLORS, STATUS_COLORS, STATUS_LABELS } from "@/lib/ejad/viz";
import { cn } from "@/lib/utils";

function Problem({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-full place-items-center p-2 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function NoData({ what = "No stored messages yet." }: { what?: string }) {
  return <Problem>{what}</Problem>;
}

function timeLabel(message: ReaderMessage | undefined) {
  const date = messageDate(message?.time);
  return date ? format(date, "PP HH:mm:ss") : null;
}

// --- Line chart --------------------------------------------------------------

export function LineChartWidget({ widget }: { widget: LineWidget }) {
  const { data, error, isPending } = useSeries(widget);
  if (isPending) return <Skeleton className="h-full w-full" />;
  if (error) return <Problem>{errorText(error)}</Problem>;
  const rows = data?.rows ?? [];
  if (rows.length === 0)
    return (
      <NoData
        what={`No values in the ${TIME_RANGE_SPECS[widget.range].label.toLowerCase()}.`}
      />
    );

  const config: ChartConfig = Object.fromEntries(
    widget.names.map((name, index) => [
      `s${index}`,
      { label: name, theme: SERIES_COLORS[index % SERIES_COLORS.length] },
    ]),
  );
  const spec = TIME_RANGE_SPECS[widget.range];
  const now = data?.now ?? Date.now();
  const longRange = spec.ms > 24 * 3_600_000;
  const tickFormat = (t: number) => format(t, longRange ? "MMM d" : "HH:mm");

  return (
    <ChartContainer config={config} className="aspect-auto h-full w-full">
      <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={[now - spec.ms, now]}
          tickFormatter={tickFormat}
          tickLine={false}
          axisLine={false}
          minTickGap={32}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(value: number) => formatReading(value)}
          domain={["auto", "auto"]}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const t = payload?.[0]?.payload?.t;
                return typeof t === "number"
                  ? format(t, longRange ? "PP HH:mm" : "HH:mm:ss")
                  : "";
              }}
            />
          }
        />
        {widget.names.length > 1 ? (
          <ChartLegend content={<ChartLegendContent />} />
        ) : null}
        {widget.names.map((name, index) => (
          <Line
            key={name}
            dataKey={`s${index}`}
            name={`s${index}`}
            type="monotone"
            stroke={`var(--color-s${index})`}
            strokeWidth={2}
            dot={rows.length <= 1 ? { r: 4 } : false}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

// --- Latest value ------------------------------------------------------------

const STATUS_ICONS: Record<ThresholdColor, React.ElementType> = {
  good: CircleCheck,
  warning: TriangleAlert,
  serious: CircleAlert,
  critical: OctagonAlert,
};

export function StatusLabel({ color }: { color: ThresholdColor }) {
  const Icon = STATUS_ICONS[color];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      <Icon className="size-4" style={{ color: STATUS_COLORS[color] }} />
      {STATUS_LABELS[color]}
    </span>
  );
}

export function ValueWidgetView({ widget }: { widget: ValueWidget }) {
  const { data, error, isPending } = useLatestMessages(
    widget.channelId,
    widget.name,
    1,
  );
  if (isPending) return <Skeleton className="h-full w-full" />;
  if (error) return <Problem>{errorText(error)}</Problem>;
  const message = data?.messages[0];
  if (!message) return <NoData />;

  const numeric = typeof message.value === "number" ? message.value : null;
  const color =
    numeric !== null ? thresholdColor(numeric, widget.thresholds) : null;
  const unit = widget.unit || message.unit || "";
  return (
    <div
      className="flex h-full flex-col justify-center gap-2 border-l-4 pl-4"
      style={{
        borderColor: color ? STATUS_COLORS[color] : "var(--border)",
      }}
    >
      <p className="flex flex-wrap items-baseline gap-x-2 break-all">
        <span className="text-4xl font-semibold tabular-nums tracking-tight">
          {numeric !== null ? formatReading(numeric) : messageValue(message)}
        </span>
        {unit ? (
          <span className="text-lg text-muted-foreground">{unit}</span>
        ) : null}
      </p>
      {color ? <StatusLabel color={color} /> : null}
      <p className="text-xs text-muted-foreground">{timeLabel(message)}</p>
    </div>
  );
}

// --- Gauge -------------------------------------------------------------------

const ARC_RADIUS = 80;
const ARC_LENGTH = Math.PI * ARC_RADIUS;
const ARC_PATH = `M 10 90 A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 170 90`;

export function GaugeWidgetView({ widget }: { widget: GaugeWidget }) {
  const { data, error, isPending } = useLatestMessages(
    widget.channelId,
    widget.name,
    1,
  );
  if (isPending) return <Skeleton className="h-full w-full" />;
  if (error) return <Problem>{errorText(error)}</Problem>;
  const message = data?.messages[0];
  if (!message) return <NoData />;
  if (typeof message.value !== "number")
    return <Problem>The latest “{widget.name}” is not a number.</Problem>;

  const fraction = gaugeFraction(message.value, widget.min, widget.max);
  const unit = widget.unit || message.unit || "";
  const outside = message.value < widget.min || message.value > widget.max;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      <svg
        viewBox="0 0 180 100"
        className="w-full max-w-64"
        role="img"
        aria-label={`${formatReading(message.value)} ${unit} on a scale from ${widget.min} to ${widget.max}`}
      >
        <path
          d={ARC_PATH}
          fill="none"
          strokeWidth={14}
          strokeLinecap="round"
          className="stroke-muted"
        />
        <path
          d={ARC_PATH}
          fill="none"
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${fraction * ARC_LENGTH} ${ARC_LENGTH}`}
          className="stroke-[#2a78d6] dark:stroke-[#3987e5]"
          opacity={fraction === 0 ? 0 : 1}
        />
        <text
          x="90"
          y="78"
          textAnchor="middle"
          className="fill-foreground text-[26px] font-semibold tabular-nums"
        >
          {formatReading(message.value)}
        </text>
        <text
          x="90"
          y="96"
          textAnchor="middle"
          className="fill-muted-foreground text-[11px]"
        >
          {unit}
        </text>
      </svg>
      <div className="flex w-full max-w-64 justify-between px-1 text-xs text-muted-foreground tabular-nums">
        <span>{formatReading(widget.min)}</span>
        <span>{formatReading(widget.max)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {outside ? "Outside the scale · " : ""}
        {timeLabel(message)}
      </p>
    </div>
  );
}

// --- Table -------------------------------------------------------------------

export function TableWidgetView({ widget }: { widget: TableWidget }) {
  const { data, error, isPending } = useLatestMessages(
    widget.channelId,
    widget.name,
    widget.rows,
  );
  if (isPending) return <Skeleton className="h-full w-full" />;
  if (error) return <Problem>{errorText(error)}</Problem>;
  const messages = data?.messages ?? [];
  if (messages.length === 0) return <NoData />;
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-1 pr-3 font-medium">Time</th>
            <th className="py-1 pr-3 font-medium">Name</th>
            <th className="py-1 pr-3 text-right font-medium">Value</th>
            <th className="py-1 font-medium">Unit</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((message, index) => {
            const date = messageDate(message.time);
            return (
              <tr
                // Messages have no ID; time + name + position is stable enough.
                key={`${message.time}-${message.name}-${index}`}
                className="border-t"
              >
                <td className="py-1 pr-3 whitespace-nowrap text-muted-foreground tabular-nums">
                  {date ? format(date, "HH:mm:ss") : "—"}
                </td>
                <td className="max-w-40 truncate py-1 pr-3">
                  {message.name || "—"}
                </td>
                <td className="py-1 pr-3 text-right tabular-nums">
                  {typeof message.value === "number"
                    ? formatReading(message.value)
                    : messageValue(message)}
                </td>
                <td className="py-1 text-muted-foreground">
                  {message.unit ?? ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- Device status -----------------------------------------------------------

const DEVICE_STATES: {
  key: keyof DeviceStatusCounts;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    key: "active",
    label: "Active",
    icon: CircleCheck,
    color: STATUS_COLORS.good,
  },
  {
    key: "inactive",
    label: "Inactive",
    icon: CircleMinus,
    color: "var(--muted-foreground)",
  },
  {
    key: "suspended",
    label: "Suspended",
    icon: TriangleAlert,
    color: STATUS_COLORS.warning,
  },
];

export function DeviceStatusWidgetView({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const { data, error, isPending } = useDeviceStatusCounts(workspaceId);
  if (isPending) return <Skeleton className="h-full w-full" />;
  if (error) return <Problem>{errorText(error)}</Problem>;
  const counts = data ?? { active: 0, inactive: 0, suspended: 0 };
  const total = counts.active + counts.inactive + counts.suspended;
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <p className="flex items-baseline gap-2">
        <span className="text-4xl font-semibold tabular-nums">{total}</span>
        <span className="text-sm text-muted-foreground">
          device{total === 1 ? "" : "s"}
        </span>
      </p>
      <ul className="grid gap-1.5">
        {DEVICE_STATES.map((state) => (
          <li
            key={state.key}
            className={cn(
              "flex items-center justify-between gap-2 text-sm",
              counts[state.key] === 0 && "text-muted-foreground",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <state.icon className="size-4" style={{ color: state.color }} />
              {state.label}
            </span>
            <span className="font-medium tabular-nums">
              {counts[state.key]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
