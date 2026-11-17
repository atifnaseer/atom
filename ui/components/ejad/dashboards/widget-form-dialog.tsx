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
import { useI18n } from "@/components/ejad/i18n-provider";
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
import type { MessageKey } from "@/lib/ejad/i18n/messages";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/ejad/viz";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<WidgetType, LucideIcon> = {
  line: Activity,
  value: Hash,
  gauge: Gauge,
  table: Table2,
  device_status: Cpu,
};

const TYPE_HINTS: Record<WidgetType, MessageKey> = {
  line: "widgetForm.hint.line",
  value: "widgetForm.hint.value",
  gauge: "widgetForm.hint.gauge",
  table: "widgetForm.hint.table",
  device_status: "widgetForm.hint.deviceStatus",
};

const ADD_TYPE: Record<WidgetType, MessageKey> = {
  line: "widgetForm.add.line",
  value: "widgetForm.add.value",
  gauge: "widgetForm.add.gauge",
  table: "widgetForm.add.table",
  device_status: "widgetForm.add.deviceStatus",
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
  const { t, localize } = useI18n();
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
      setProblem(localize(result));
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
              ? t("widgetForm.edit")
              : draft
                ? t(ADD_TYPE[draft.type])
                : t("dashboards.addWidget")}
          </DialogTitle>
          <DialogDescription>
            {draft ? t(TYPE_HINTS[draft.type]) : t("widgetForm.pickHint")}
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
                  {t("common.cancel")}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDraft(null)}
                >
                  {t("common.back")}
                </Button>
              )}
              <Button type="submit">
                {editing ? t("widgetForm.apply") : t("dashboards.addWidget")}
              </Button>
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
                    className="flex h-full w-full items-start gap-3 rounded-lg border p-3 text-start transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    <span className="grid gap-0.5">
                      <span className="text-sm font-medium">
                        {localize(WIDGET_TYPE_LABELS[type])}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t(TYPE_HINTS[type])}
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
  const { t, localize } = useI18n();
  const id = React.useId();
  const needsChannel = draft.type !== "device_status";
  const names = useMeasurementNames(
    needsChannel ? draft.channelId || null : null,
  );
  const suggestions = names.data ?? [];

  return (
    <>
      <Field label={t("widgetForm.title")} htmlFor={`${id}-title`}>
        <Input
          id={`${id}-title`}
          placeholder={t("common.optional")}
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
        />
      </Field>

      {needsChannel ? (
        <Field label={t("page.channel.title")} htmlFor={`${id}-channel`}>
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
                    ? t("widgetForm.noChannels")
                    : t("server.pickChannel")
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
          label={
            draft.type === "table"
              ? t("widgetForm.measurementFilter")
              : t("widgetForm.measurement")
          }
          htmlFor={`${id}-name`}
          hint={draft.type === "table" ? t("widgetForm.filterHint") : undefined}
        >
          <Input
            id={`${id}-name`}
            placeholder={
              draft.type === "table"
                ? t("widgetForm.allMeasurements")
                : "temperature"
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
        <Field label={t("widgetForm.timeRange")} htmlFor={`${id}-range`}>
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
                  {localize(TIME_RANGE_SPECS[range].label)}
                  {TIME_RANGE_SPECS[range].interval
                    ? ` (${t("widgetForm.averagePer", {
                        interval: TIME_RANGE_SPECS[range].interval,
                      })})`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {draft.type === "value" || draft.type === "gauge" ? (
        <Field
          label={t("messages.unit")}
          htmlFor={`${id}-unit`}
          hint={t("widgetForm.unitHint")}
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
          <Field label={t("widgetForm.min")} htmlFor={`${id}-min`}>
            <Input
              id={`${id}-min`}
              inputMode="decimal"
              value={draft.min}
              onChange={(event) => update({ min: event.target.value })}
            />
          </Field>
          <Field label={t("widgetForm.max")} htmlFor={`${id}-max`}>
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
        <Field label={t("widgetForm.rows")} htmlFor={`${id}-rows`}>
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
                  {t("widgetForm.nMessages", { count: rows })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      <Field label={t("widgetForm.size")}>
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
              {t(`widget.${size}`)}
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
  const { t } = useI18n();
  if (loading)
    return (
      <p className="text-xs text-muted-foreground">{t("widgetForm.looking")}</p>
    );
  if (suggestions.length === 0)
    return (
      <p className="text-xs text-muted-foreground">
        {t("widgetForm.noSuggestions")}
      </p>
    );
  return (
    <fieldset
      className="flex flex-wrap gap-1.5"
      aria-label={t("widgetForm.seenRecently")}
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
  const { t } = useI18n();
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
      label={t("widgetForm.measurements")}
      htmlFor={`${id}-custom`}
      hint={t("widgetForm.seriesHint", { count: LINE_MAX_SERIES })}
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
                aria-label={t("common.removeName", { name })}
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
          placeholder={t("widgetForm.another")}
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
          {t("widgetForm.add")}
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
  const { t, localize } = useI18n();
  const set = (index: number, patch: Partial<Draft["thresholds"][number]>) =>
    onChange(thresholds.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  return (
    <div className="grid grid-cols-1 gap-2">
      <Label>{t("widgetForm.thresholds")}</Label>
      <p className="text-xs text-muted-foreground">
        {t("widgetForm.thresholdsHint")}
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
            aria-label={t("widgetForm.thresholdValue", { n: index + 1 })}
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
              aria-label={t("widgetForm.thresholdState", { n: index + 1 })}
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
                  {localize(STATUS_LABELS[color])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("widgetForm.thresholdRemove", { n: index + 1 })}
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
          {t("widgetForm.addThreshold")}
        </Button>
      ) : null}
    </div>
  );
}
