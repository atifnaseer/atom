"use client";

import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pause,
  Play,
  RotateCcw,
  Send,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useChannelConnections } from "@/components/ejad/connections/use-connections";
import { ErrorAlert, toastError } from "@/components/ejad/error-alert";
import { useI18n, useT } from "@/components/ejad/i18n-provider";
import { DeviceCommands } from "@/components/ejad/messages/device-commands";
import { SendMessageDialog } from "@/components/ejad/messages/send-message-dialog";
import {
  fetchAllMessages,
  useMessages,
} from "@/components/ejad/messages/use-messages";
import { useAccess } from "@/components/ejad/use-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadTextFile } from "@/lib/ejad/csv";
import {
  AGGREGATION_INTERVALS,
  COMPARATOR_LABELS,
  CSV_MAX_ROWS,
  EMPTY_FILTERS,
  filtersToParams,
  MESSAGE_AGGREGATIONS,
  MESSAGE_COMPARATORS,
  type MessageFilters,
  type MessagingEndpoints,
  messageDate,
  messagesCsv,
  messageValue,
  PAGE_SIZES,
  type ReaderMessage,
} from "@/lib/ejad/messages";

const ANY = "__any";
const PROTOCOLS = ["http", "mqtt", "coap", "websocket"];

/**
 * The Messages view of one channel: a live, filterable table of stored
 * messages with aggregation, paging and CSV export, plus sending a test
 * message and copyable device commands.
 */
export function ChannelMessages({
  workspaceId,
  workspaceRoute,
  channelId,
  channelName,
  channelRoute,
  endpoints,
}: {
  workspaceId: string;
  /** Workspace route (alias); falls back to the workspace ID. */
  workspaceRoute: string | null;
  channelId: string;
  channelName: string;
  /** Channel route; falls back to the channel ID. */
  channelRoute: string | null;
  endpoints: MessagingEndpoints;
}) {
  const { t, format: fmt, localize } = useI18n();
  const [draft, setDraft] = React.useState<MessageFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = React.useState<MessageFilters>(EMPTY_FILTERS);
  const [filterError, setFilterError] = React.useState<string | null>(null);
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [page, setPage] = React.useState(0);
  const [live, setLive] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const canSend = useAccess().can("manage");
  const [exporting, setExporting] = React.useState(false);

  const params = React.useMemo(() => {
    const result = filtersToParams(applied);
    return typeof result === "string" ? null : result;
  }, [applied]);

  const { data, error, isPending, isFetching, dataUpdatedAt } = useMessages({
    workspaceId,
    channelId,
    params,
    offset: page * pageSize,
    limit: pageSize,
    live,
  });
  const connections = useChannelConnections(workspaceId, channelId);

  const deviceNames = React.useMemo(
    () =>
      new Map(
        (connections.data ?? []).map((row) => [row.peerId, row.peerLabel]),
      ),
    [connections.data],
  );

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  React.useEffect(() => {
    if (page > 0 && page >= pageCount) setPage(pageCount - 1);
  }, [page, pageCount]);

  function set<K extends keyof MessageFilters>(
    key: K,
    value: MessageFilters[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function apply(next = draft) {
    const result = filtersToParams(next);
    if (typeof result === "string") {
      setFilterError(localize(result));
      return;
    }
    setFilterError(null);
    setApplied(next);
    setPage(0);
  }

  function reset() {
    setDraft(EMPTY_FILTERS);
    apply(EMPTY_FILTERS);
  }

  async function exportCsv() {
    if (!params) return;
    setExporting(true);
    try {
      const result = await fetchAllMessages(channelId, params);
      const stamp = format(new Date(), "yyyyMMdd-HHmmss");
      downloadTextFile(
        `${channelRoute || channelId}-messages-${stamp}.csv`,
        messagesCsv(result.messages),
      );
      if (result.truncated)
        toast.warning(
          t("messages.csvTruncated", {
            count: result.messages.length,
            total: result.total,
            limit: CSV_MAX_ROWS,
          }),
        );
      else
        toast.success(t("messages.csvDone", { count: result.messages.length }));
    } catch (err) {
      toastError(err, t("messages.csvFailed"));
    } finally {
      setExporting(false);
    }
  }

  const aggregated = Boolean(applied.aggregation);
  const rows = data?.messages ?? [];
  const first = total === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(total, page * pageSize + rows.length);

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className={`size-2 rounded-full ${live ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/40"}`}
            aria-hidden
          />
          {live ? t("messages.live") : t("messages.paused")}
          {dataUpdatedAt > 0 && (
            <span className="hidden sm:inline">
              ·{" "}
              {t("messages.updatedAt", {
                time: fmt.date(dataUpdatedAt, "timeSeconds"),
              })}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLive((value) => !value)}
          >
            {live ? <Pause /> : <Play />}
            {live ? t("messages.pause") : t("messages.resume")}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={!params || exporting || total === 0}
          >
            <Download />
            {exporting ? t("messages.preparing") : t("messages.downloadCsv")}
          </Button>
          {canSend ? (
            <Button onClick={() => setSending(true)}>
              <Send />
              {t("send.title")}
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              apply();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t("common.name")} htmlFor="msg-name">
                <Input
                  id="msg-name"
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder={t("messages.namePlaceholder")}
                  autoComplete="off"
                />
              </Field>
              <Field label={t("messages.publisher")} htmlFor="msg-publisher">
                <Select
                  value={draft.publisher || ANY}
                  onValueChange={(v) => set("publisher", v === ANY ? "" : v)}
                >
                  <SelectTrigger id="msg-publisher" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>
                      {t("messages.anyDevice")}
                    </SelectItem>
                    {(connections.data ?? []).map((row) => (
                      <SelectItem key={row.peerId} value={row.peerId}>
                        {row.peerLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("messages.protocol")} htmlFor="msg-protocol">
                <Select
                  value={draft.protocol || ANY}
                  onValueChange={(v) => set("protocol", v === ANY ? "" : v)}
                >
                  <SelectTrigger id="msg-protocol" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>
                      {t("messages.anyProtocol")}
                    </SelectItem>
                    {PROTOCOLS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("messages.value")} htmlFor="msg-value">
                <div className="flex gap-2">
                  <Select
                    value={draft.comparator || ANY}
                    onValueChange={(v) =>
                      set(
                        "comparator",
                        v === ANY ? "" : (v as MessageFilters["comparator"]),
                      )
                    }
                  >
                    <SelectTrigger
                      className="w-20 shrink-0"
                      aria-label={t("messages.comparator")}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>—</SelectItem>
                      {MESSAGE_COMPARATORS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {COMPARATOR_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="msg-value"
                    inputMode="decimal"
                    value={draft.value}
                    onChange={(e) => set("value", e.target.value)}
                    placeholder={t("messages.number")}
                    autoComplete="off"
                  />
                </div>
              </Field>
              <Field label={t("messages.from")}>
                <DateTimePicker
                  value={draft.from}
                  onChange={(v) => set("from", v)}
                  placeholder={t("messages.anyTime")}
                />
              </Field>
              <Field label={t("messages.to")}>
                <DateTimePicker
                  value={draft.to}
                  onChange={(v) => set("to", v)}
                  placeholder={t("messages.now")}
                />
              </Field>
              <Field
                label={t("messages.aggregation")}
                htmlFor="msg-aggregation"
              >
                <Select
                  value={draft.aggregation || ANY}
                  onValueChange={(v) =>
                    set(
                      "aggregation",
                      v === ANY ? "" : (v as MessageFilters["aggregation"]),
                    )
                  }
                >
                  <SelectTrigger id="msg-aggregation" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>{t("common.none")}</SelectItem>
                    {MESSAGE_AGGREGATIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("messages.interval")} htmlFor="msg-interval">
                <Select
                  value={draft.interval}
                  onValueChange={(v) => set("interval", v)}
                  disabled={!draft.aggregation}
                >
                  <SelectTrigger id="msg-interval" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGGREGATION_INTERVALS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {draft.aggregation && (!draft.from || !draft.to) && (
              <p className="text-xs text-muted-foreground">
                {t("messages.aggregationNeeds")}
              </p>
            )}
            {filterError && (
              <p className="text-sm text-destructive" role="alert">
                {filterError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit">{t("messages.apply")}</Button>
              <Button type="button" variant="ghost" onClick={reset}>
                <RotateCcw />
                {t("messages.reset")}
              </Button>
              {aggregated && (
                <Badge variant="secondary" className="self-center">
                  {t("messages.per", {
                    aggregation: applied.aggregation.toUpperCase(),
                    interval: applied.interval,
                  })}
                </Badge>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <ErrorAlert title={t("messages.loadFailed")} error={error} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {aggregated
                    ? t("messages.intervalStart")
                    : t("messages.time")}
                </TableHead>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead className="text-end">
                  {aggregated
                    ? applied.aggregation.toUpperCase()
                    : t("messages.value")}
                </TableHead>
                <TableHead>{t("messages.unit")}</TableHead>
                <TableHead>{t("messages.publisher")}</TableHead>
                <TableHead>{t("messages.protocol")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending && params ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    {t("messages.loading")}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    <EmptyText filtered={Boolean(params?.toString())} />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((message, index) => (
                  <MessageRow
                    // Messages have no ID; time + publisher + name + index is
                    // unique within one page.
                    key={`${message.time}-${message.publisher}-${message.name}-${index}`}
                    message={message}
                    deviceName={
                      message.publisher
                        ? deviceNames.get(message.publisher)
                        : undefined
                    }
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>{t("table.rowsPerPage")}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(0);
            }}
          >
            <SelectTrigger
              className="h-8 w-20"
              aria-label={t("table.rowsPerPage")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {total === 0
              ? t("messages.none")
              : t("common.rangeOf", { first, last, total })}
            {isFetching && !isPending ? ` · ${t("messages.refreshing")}` : ""}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("table.previousPage")}
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="rtl:rotate-180" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("table.nextPage")}
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="rtl:rotate-180" />
          </Button>
        </div>
      </div>

      <DeviceCommands
        devices={connections.data}
        workspaceRoute={workspaceRoute || workspaceId}
        channelRoute={channelRoute || channelId}
        endpoints={endpoints}
      />

      <SendMessageDialog
        open={sending}
        onOpenChange={setSending}
        channelId={channelId}
        channelName={channelName}
        devices={connections.data}
      />
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function EmptyText({ filtered }: { filtered: boolean }) {
  const t = useT();
  if (filtered) return t("messages.noMatches");
  return t("messages.emptyHint");
}

function MessageRow({
  message,
  deviceName,
}: {
  message: ReaderMessage;
  deviceName: string | undefined;
}) {
  const { t, format: fmt } = useI18n();
  const date = messageDate(message.time);
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap font-mono text-xs">
        {date ? fmt.date(date, "precise") : "—"}
      </TableCell>
      <TableCell>{message.name || "—"}</TableCell>
      <TableCell className="text-end font-mono tabular-nums">
        {messageValue(message) || "—"}
      </TableCell>
      <TableCell>{message.unit || "—"}</TableCell>
      <TableCell className="max-w-56">
        {message.publisher ? (
          <span className="grid min-w-0">
            <span className="truncate">
              {deviceName ?? t("messages.unknownDevice")}
            </span>
            <code className="truncate font-mono text-xs text-muted-foreground">
              {message.publisher}
            </code>
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>
        {message.protocol ? (
          <Badge variant="outline">{message.protocol}</Badge>
        ) : (
          "—"
        )}
      </TableCell>
    </TableRow>
  );
}
