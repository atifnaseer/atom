"use client";

import {
  Activity,
  Cpu,
  Gauge,
  Hash,
  type LucideIcon,
  Plus,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import * as React from "react";
import { useMeasurementNames } from "@/components/ejad/dashboards/use-widget-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Channel, channelLabel } from "@/lib/ejad/channels";
import {
  DEFAULT_WIDGET_SIZE,
  LINE_MAX_SERIES,
  newWidgetId,
  parseWidget,
  sortThresholds,
  TABLE_ROW_OPTIONS,
  THRESHOLD_COLORS,
  type ThresholdColor,
  TIME_RANGE_SPECS,
  TIME_RANGES,
  type TimeRange,
  WIDGET_SIZES,
  WIDGET_TYPE_LABELS,
  WIDGET_TYPES,
  type Widget,
  type WidgetSize,
  type WidgetType,
} from "@/lib/ejad/dashboards";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/ejad/viz";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<WidgetType, LucideIcon> = {
  line: Activity,
  value: Hash,
  gauge: Gauge,
  table: Table2,
  device_status: Cpu,
};

const TYPE_HINTS: Record<WidgetType, string> = {
  line: "One or more measurements over time",
  value: "The newest reading, with colour thresholds",
  gauge: "The newest reading between a min and max",
  table: "The newest messages of a channel",
  device_status: "Devices by status in this workspace",
};

const MAX_THRESHOLDS = 4;

type Draft = {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  channelId: string;
  names: string[];
  range: TimeRange;
  name: string;
  unit: string;
  thresholds: { value: string; color: ThresholdColor }[];
  min: string;
  max: string;
  rows: number;
};

function emptyDraft(type: WidgetType): Draft {
  return {
    id: newWidgetId(),
    type,
    title: "",
    size: DEFAULT_WIDGET_SIZE[type],
    channelId: "",
    names: [],
    range: "1h",
    name: "",
    unit: "",
    thresholds: [],
    min: "0",
    max: "100",
    rows: 10,
  };
}

function draftFrom(widget: Widget): Draft {
  const draft = { ...emptyDraft(widget.type), id: widget.id };
  draft.title = widget.title;
  draft.size = widget.size;
  switch (widget.type) {
    case "line":
      return {
        ...draft,
        channelId: widget.channelId,
        names: widget.names,
        range: widget.range,
      };
    case "value":
      return {
        ...draft,
        channelId: widget.channelId,
        name: widget.name,
        unit: widget.unit,
        thresholds: widget.thresholds.map((t) => ({
          value: String(t.value),
          color: t.color,
        })),
      };
    case "gauge":
      return {
        ...draft,
        channelId: widget.channelId,
        name: widget.name,
        unit: widget.unit,
        min: String(widget.min),
        max: String(widget.max),
      };
    case "table":
      return {
        ...draft,
        channelId: widget.channelId,
        name: widget.name,
        rows: widget.rows,
      };
    case "device_status":
      return draft;
  }
}

/** The widget the draft describes, or the first problem with it. */
function buildWidget(draft: Draft): Widget | string {
  const needsChannel = draft.type !== "device_status";
  if (needsChannel && !draft.channelId) return "Pick a channel.";
  if (draft.type === "line" && draft.names.length === 0)
    return "Pick at least one measurement.";
  if ((draft.type === "value" || draft.type === "gauge") && !draft.name.trim())
    return "Enter a measurement name.";
  let thresholds: { value: number; color: ThresholdColor }[] = [];
  if (draft.type === "value") {
    for (const t of draft.thresholds) {
      if (t.value.trim() === "" || !Number.isFinite(Number(t.value)))
        return "Every threshold needs a number.";
    }
    thresholds = sortThresholds(
      draft.thresholds.map((t) => ({ value: Number(t.value), color: t.color })),
    );
  }
  let min = 0;
  let max = 100;
  if (draft.type === "gauge") {
    min = Number(draft.min);
    max = Number(draft.max);
    if (draft.min.trim() === "" || !Number.isFinite(min))
      return "Min must be a number.";
    if (draft.max.trim() === "" || !Number.isFinite(max))
      return "Max must be a number.";
    if (max <= min) return "Max must be greater than min.";
  }
  const widget = parseWidget({
    id: draft.id,
    type: draft.type,
    title: draft.title.trim(),
    size: draft.size,
    channelId: draft.channelId,
    names: draft.names,
    range: draft.range,
    name: draft.name.trim(),
    unit: draft.unit.trim(),
    thresholds,
    min,
    max,
    rows: draft.rows,
  });
  return widget ?? "The widget is not complete.";
}

/** Add a widget (target "new") or edit one. */
export function WidgetFormDialog({
  target,
  channels,
  onOpenChange,
  onSave,
}: {
  target: Widget | "new" | null;
  channels: Channel[] | undefined;
  onOpenChange: (open: boolean) => void;
  onSave: (widget: Widget) => void;
}) {
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);

  React.useEffect(() => {
    setProblem(null);
    setDraft(target && target !== "new" ? draftFrom(target) : null);
  }, [target]);

  const update = (patch: Partial<Draft>) => {
    setProblem(null);
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const result = buildWidget(draft);
    if (typeof result === "string") {
      setProblem(result);
      return;
    }
    onSave(result);
    onOpenChange(false);
  };

  const editing = target !== null && target !== "new";

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? "Edit widget"
              : draft
                ? `Add ${WIDGET_TYPE_LABELS[draft.type].toLowerCase()}`
                : "Add widget"}
          </DialogTitle>
          <DialogDescription>
            {draft
              ? TYPE_HINTS[draft.type]
              : "Pick what the widget shows. Channel data comes from stored messages."}
          </DialogDescription>
        </DialogHeader>

        {draft ? (
          <form className="grid min-w-0 gap-4" onSubmit={submit}>
            <WidgetFields draft={draft} channels={channels} update={update} />
            {problem ? (
              <p role="alert" className="text-sm text-destructive">
                {problem}
              </p>
            ) : null}
            <DialogFooter>
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDraft(null)}
                >
                  Back
                </Button>
              )}
              <Button type="submit">{editing ? "Apply" : "Add widget"}</Button>
            </DialogFooter>
          </form>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {WIDGET_TYPES.map((type) => {
              const Icon = TYPE_ICONS[type];
              return (
                <li key={type}>
                  <button
                    type="button"
                    onClick={() => setDraft(emptyDraft(type))}
                    className="flex h-full w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    <span className="grid gap-0.5">
                      <span className="text-sm font-medium">
                        {WIDGET_TYPE_LABELS[type]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {TYPE_HINTS[type]}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function WidgetFields({
  draft,
  channels,
  update,
}: {
  draft: Draft;
  channels: Channel[] | undefined;
  update: (patch: Partial<Draft>) => void;
}) {
  const id = React.useId();
  const needsChannel = draft.type !== "device_status";
  const names = useMeasurementNames(
    needsChannel ? draft.channelId || null : null,
  );
  const suggestions = names.data ?? [];

  return (
    <>
      <Field label="Title" htmlFor={`${id}-title`}>
        <Input
          id={`${id}-title`}
          placeholder="Optional"
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
        />
      </Field>

      {needsChannel ? (
        <Field label="Channel" htmlFor={`${id}-channel`}>
          <Select
            value={draft.channelId}
            onValueChange={(channelId) =>
              update({ channelId, names: [], name: "" })
            }
          >
            <SelectTrigger id={`${id}-channel`} className="w-full">
              <SelectValue
                placeholder={
                  channels && channels.length === 0
                    ? "No channels in this workspace"
                    : "Pick a channel"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {(channels ?? []).map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channelLabel(channel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {draft.type === "line" && draft.channelId ? (
        <SeriesPicker
          selected={draft.names}
          suggestions={suggestions}
          loading={names.isPending}
          onChange={(selected) => update({ names: selected })}
        />
      ) : null}

      {(draft.type === "value" ||
        draft.type === "gauge" ||
        draft.type === "table") &&
      draft.channelId ? (
        <Field
          label={draft.type === "table" ? "Measurement filter" : "Measurement"}
          htmlFor={`${id}-name`}
          hint={
            draft.type === "table"
              ? "Leave empty to show every measurement."
              : undefined
          }
        >
          <Input
            id={`${id}-name`}
            placeholder={
              draft.type === "table" ? "All measurements" : "temperature"
            }
            value={draft.name}
            onChange={(event) => update({ name: event.target.value })}
          />
          <NameChips
            suggestions={suggestions}
            loading={names.isPending}
            isSelected={(name) => draft.name === name}
            onPick={(name) => update({ name })}
          />
        </Field>
      ) : null}

      {draft.type === "line" ? (
        <Field label="Time range" htmlFor={`${id}-range`}>
          <Select
            value={draft.range}
            onValueChange={(range) => update({ range: range as TimeRange })}
          >
            <SelectTrigger id={`${id}-range`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map((range) => (
                <SelectItem key={range} value={range}>
                  {TIME_RANGE_SPECS[range].label}
                  {TIME_RANGE_SPECS[range].interval
                    ? ` (average per ${TIME_RANGE_SPECS[range].interval})`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {draft.type === "value" || draft.type === "gauge" ? (
        <Field
          label="Unit"
          htmlFor={`${id}-unit`}
          hint="Leave empty to use the unit sent with the message."
        >
          <Input
            id={`${id}-unit`}
            placeholder="°C"
            value={draft.unit}
            onChange={(event) => update({ unit: event.target.value })}
          />
        </Field>
      ) : null}

      {draft.type === "gauge" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min" htmlFor={`${id}-min`}>
            <Input
              id={`${id}-min`}
              inputMode="decimal"
              value={draft.min}
              onChange={(event) => update({ min: event.target.value })}
            />
          </Field>
          <Field label="Max" htmlFor={`${id}-max`}>
            <Input
              id={`${id}-max`}
              inputMode="decimal"
              value={draft.max}
              onChange={(event) => update({ max: event.target.value })}
            />
          </Field>
        </div>
      ) : null}

      {draft.type === "value" ? (
        <ThresholdsEditor
          thresholds={draft.thresholds}
          onChange={(thresholds) => update({ thresholds })}
        />
      ) : null}

      {draft.type === "table" ? (
        <Field label="Rows" htmlFor={`${id}-rows`}>
          <Select
            value={String(draft.rows)}
            onValueChange={(rows) => update({ rows: Number(rows) })}
          >
            <SelectTrigger id={`${id}-rows`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLE_ROW_OPTIONS.map((rows) => (
                <SelectItem key={rows} value={String(rows)}>
                  {rows} messages
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      <Field label="Size">
        <div className="flex gap-2">
          {WIDGET_SIZES.map((size) => (
            <Button
              key={size}
              type="button"
              size="sm"
              variant={draft.size === size ? "default" : "outline"}
              aria-pressed={draft.size === size}
              onClick={() => update({ size })}
              className="capitalize"
            >
              {size}
            </Button>
          ))}
        </div>
      </Field>
    </>
  );
}

function NameChips({
  suggestions,
  loading,
  isSelected,
  onPick,
}: {
  suggestions: string[];
  loading: boolean;
  isSelected: (name: string) => boolean;
  onPick: (name: string) => void;
}) {
  if (loading)
    return (
      <p className="text-xs text-muted-foreground">Looking for measurements…</p>
    );
  if (suggestions.length === 0)
    return (
      <p className="text-xs text-muted-foreground">
        No stored messages yet; type the measurement name (SenML “n”).
      </p>
    );
  return (
    <fieldset
      className="flex flex-wrap gap-1.5"
      aria-label="Measurements seen recently"
    >
      {suggestions.map((name) => (
        <button
          key={name}
          type="button"
          aria-pressed={isSelected(name)}
          onClick={() => onPick(name)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            isSelected(name)
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-muted",
          )}
        >
          {name}
        </button>
      ))}
    </fieldset>
  );
}

function SeriesPicker({
  selected,
  suggestions,
  loading,
  onChange,
}: {
  selected: string[];
  suggestions: string[];
  loading: boolean;
  onChange: (names: string[]) => void;
}) {
  const id = React.useId();
  const [custom, setCustom] = React.useState("");
  const full = selected.length >= LINE_MAX_SERIES;
  const toggle = (name: string) =>
    onChange(
      selected.includes(name)
        ? selected.filter((item) => item !== name)
        : full
          ? selected
          : [...selected, name],
    );
  const addCustom = () => {
    const name = custom.trim();
    if (name && !selected.includes(name) && !full)
      onChange([...selected, name]);
    setCustom("");
  };
  const extra = selected.filter((name) => !suggestions.includes(name));

  return (
    <Field
      label="Measurements"
      htmlFor={`${id}-custom`}
      hint={`Up to ${LINE_MAX_SERIES}. Numeric values are charted.`}
    >
      <NameChips
        suggestions={suggestions}
        loading={loading}
        isSelected={(name) => selected.includes(name)}
        onPick={toggle}
      />
      {extra.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {extra.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-2.5 py-0.5 text-xs text-primary-foreground"
            >
              {name}
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => toggle(name)}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          id={`${id}-custom`}
          placeholder="Another measurement name"
          value={custom}
          disabled={full}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={full || !custom.trim()}
          onClick={addCustom}
        >
          <Plus />
          Add
        </Button>
      </div>
    </Field>
  );
}

function ThresholdsEditor({
  thresholds,
  onChange,
}: {
  thresholds: Draft["thresholds"];
  onChange: (thresholds: Draft["thresholds"]) => void;
}) {
  const set = (index: number, patch: Partial<Draft["thresholds"][number]>) =>
    onChange(thresholds.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  return (
    <div className="grid grid-cols-1 gap-2">
      <Label>Colour thresholds</Label>
      <p className="text-xs text-muted-foreground">
        From each value upwards the reading is marked with that state.
      </p>
      {thresholds.map((threshold, index) => (
        <div
          // Thresholds have no ID; the position is their identity while editing.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          key={index}
          className="flex items-center gap-2"
        >
          <span className="text-sm text-muted-foreground">≥</span>
          <Input
            aria-label={`Threshold ${index + 1} value`}
            inputMode="decimal"
            className="w-28"
            value={threshold.value}
            onChange={(event) => set(index, { value: event.target.value })}
          />
          <Select
            value={threshold.color}
            onValueChange={(color) =>
              set(index, { color: color as ThresholdColor })
            }
          >
            <SelectTrigger
              aria-label={`Threshold ${index + 1} state`}
              className="flex-1"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THRESHOLD_COLORS.map((color) => (
                <SelectItem key={color} value={color}>
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: STATUS_COLORS[color] }}
                  />
                  {STATUS_LABELS[color]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove threshold ${index + 1}`}
            onClick={() => onChange(thresholds.filter((_, i) => i !== index))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      {thresholds.length < MAX_THRESHOLDS ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() =>
            onChange([
              ...thresholds,
              {
                value: "",
                color:
                  THRESHOLD_COLORS[
                    Math.min(thresholds.length, THRESHOLD_COLORS.length - 1)
                  ],
              },
            ])
          }
        >
          <Plus />
          Add threshold
        </Button>
      ) : null}
    </div>
  );
}
