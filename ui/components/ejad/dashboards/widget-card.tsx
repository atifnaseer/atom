"use client";

import {
  ArrowLeft,
  ArrowRight,
  DatabaseZap,
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useStoreState } from "@/components/ejad/dashboards/use-widget-data";
import {
  DeviceStatusWidgetView,
  GaugeWidgetView,
  LineChartWidget,
  TableWidgetView,
  ValueWidgetView,
} from "@/components/ejad/dashboards/widgets";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Channel, channelLabel } from "@/lib/ejad/channels";
import {
  isChannelWidget,
  WIDGET_SIZES,
  type Widget,
  type WidgetSize,
  widgetTitle,
} from "@/lib/ejad/dashboards";
import { errorCode, errorText } from "@/lib/ejad/errors";
import { cn } from "@/lib/utils";

/** Columns a widget spans: 1 column on phones, 2 on tablets, 4 on desktops. */
export const WIDGET_SPAN: Record<WidgetSize, string> = {
  small: "col-span-1",
  medium: "col-span-1 md:col-span-2",
  large: "col-span-1 md:col-span-2 xl:col-span-4",
};

const SIZE_LABELS: Record<WidgetSize, string> = {
  small: "S",
  medium: "M",
  large: "L",
};

export type WidgetEditing = {
  index: number;
  count: number;
  onEdit: () => void;
  onRemove: () => void;
  onMove: (to: number) => void;
  onResize: (size: WidgetSize) => void;
};

function WidgetBody({
  widget,
  workspaceId,
}: {
  widget: Widget;
  workspaceId: string;
}) {
  switch (widget.type) {
    case "line":
      return <LineChartWidget widget={widget} />;
    case "value":
      return <ValueWidgetView widget={widget} />;
    case "gauge":
      return <GaugeWidgetView widget={widget} />;
    case "table":
      return <TableWidgetView widget={widget} />;
    case "device_status":
      return <DeviceStatusWidgetView workspaceId={workspaceId} />;
  }
}

/** A short note when the widget's channel does not store its messages. */
function StoreHint({ channelId }: { channelId: string }) {
  const { data, error } = useStoreState(channelId);
  if (error)
    return (
      <p className="text-xs text-destructive">
        {errorCode(error) === "NOT_FOUND"
          ? "This channel no longer exists."
          : errorText(error)}
      </p>
    );
  if (!data || data.enabled) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <DatabaseZap className="size-3.5 shrink-0" />
      <span>
        Store messages is off.{" "}
        <Link
          href={`/channels/${channelId}`}
          className="font-medium text-foreground underline underline-offset-2"
        >
          Turn it on
        </Link>
      </span>
    </p>
  );
}

export function WidgetCard({
  widget,
  workspaceId,
  channels,
  editing,
  dragging,
  dropTarget,
}: {
  widget: Widget;
  workspaceId: string;
  channels: Channel[] | undefined;
  editing: WidgetEditing | null;
  dragging?: boolean;
  dropTarget?: boolean;
}) {
  const channelId = isChannelWidget(widget) ? widget.channelId : null;
  const channel = channelId
    ? channels?.find((item) => item.id === channelId)
    : undefined;
  const title = widgetTitle(widget);

  return (
    <Card
      className={cn(
        "h-full gap-2 overflow-hidden py-3",
        editing && "border-2 border-dashed border-foreground/20 ring-0",
        dragging && "opacity-40",
        dropTarget && "border-primary",
      )}
    >
      <div className="flex min-w-0 items-start gap-1 px-4">
        {editing ? (
          <GripVertical
            className="mt-0.5 size-4 shrink-0 cursor-grab text-muted-foreground"
            aria-hidden
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-medium" title={title}>
            {title}
          </h2>
          {channelId ? (
            <p className="truncate text-xs text-muted-foreground">
              {channel ? channelLabel(channel) : "Channel"}
            </p>
          ) : null}
        </div>
        {editing ? (
          <WidgetEditControls widget={widget} editing={editing} />
        ) : null}
      </div>
      <div className="min-h-0 flex-1 px-4">
        <WidgetBody widget={widget} workspaceId={workspaceId} />
      </div>
      {channelId ? (
        <div className="px-4 empty:hidden">
          <StoreHint channelId={channelId} />
        </div>
      ) : null}
    </Card>
  );
}

function WidgetEditControls({
  widget,
  editing,
}: {
  widget: Widget;
  editing: WidgetEditing;
}) {
  const title = widgetTitle(widget);
  return (
    <div className="flex shrink-0 items-center gap-1">
      <fieldset
        className="flex rounded-md border p-0.5"
        aria-label={`Size of ${title}`}
      >
        {WIDGET_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            className={cn(
              "h-6 w-6 rounded-sm text-xs font-medium",
              widget.size === size
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
            aria-pressed={widget.size === size}
            aria-label={size}
            onClick={() => editing.onResize(size)}
          >
            {SIZE_LABELS[size]}
          </button>
        ))}
      </fieldset>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`Actions for ${title}`}
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={editing.onEdit}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={editing.index === 0}
            onSelect={() => editing.onMove(editing.index - 1)}
          >
            <ArrowLeft />
            Move earlier
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={editing.index === editing.count - 1}
            onSelect={() => editing.onMove(editing.index + 1)}
          >
            <ArrowRight />
            Move later
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={editing.onRemove}>
            <Trash2 />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
