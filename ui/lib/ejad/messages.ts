// Ejad messages: reading a channel's stored messages through Magistrala's
// message reader (readers/api/http, GET /{workspace}/channels/{channel}/
// messages) and publishing SenML through the HTTP adapter
// (POST /http/m/{workspace}/c/{channel}).
//
// Reader rules this module mirrors (readers/api/http/requests.go):
// - limit 1..1000, comparator one of eq/lt/le/gt/ge on the numeric value `v`;
// - aggregation one of MAX/MIN/AVG/SUM/COUNT needs both `from` and `to` and an
//   `interval` that parses as a Go duration (it is also used as a Postgres
//   interval by the timescale reader, so only s/m/h units are offered);
// - `from`/`to` and the stored `time` are Unix nanoseconds: the SenML
//   transformer runs every absolute time through transformers.ToUnixNano.

import { toCsv } from "@/lib/ejad/csv";

export const MESSAGE_COMPARATORS = ["eq", "lt", "le", "gt", "ge"] as const;
export type MessageComparator = (typeof MESSAGE_COMPARATORS)[number];

export const COMPARATOR_LABELS: Record<MessageComparator, string> = {
  eq: "=",
  lt: "<",
  le: "≤",
  gt: ">",
  ge: "≥",
};

export const MESSAGE_AGGREGATIONS = [
  "min",
  "max",
  "avg",
  "sum",
  "count",
] as const;
export type MessageAggregation = (typeof MESSAGE_AGGREGATIONS)[number];

export const AGGREGATION_INTERVALS = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "6h",
  "12h",
  "24h",
] as const;

export const READER_MAX_LIMIT = 1000;
export const PAGE_SIZES = [10, 25, 50, 100] as const;
/** Most rows one CSV download collects (pages of READER_MAX_LIMIT). */
export const CSV_MAX_ROWS = 10_000;
export const MESSAGES_REFRESH_MS = 5_000;

/** One stored message as the reader returns it (SenML format). */
export type ReaderMessage = {
  channel?: string;
  subtopic?: string;
  publisher?: string;
  protocol?: string;
  name?: string;
  unit?: string;
  time?: number;
  update_time?: number;
  value?: number;
  string_value?: string;
  data_value?: string;
  bool_value?: boolean;
  sum?: number;
  device_id?: string;
};

export type MessagesPage = {
  total: number;
  offset: number;
  limit: number;
  messages: ReaderMessage[];
};

/** Filters as the UI holds them; times are ISO strings or "". */
export type MessageFilters = {
  name: string;
  publisher: string;
  protocol: string;
  comparator: MessageComparator | "";
  value: string;
  from: string;
  to: string;
  aggregation: MessageAggregation | "";
  interval: string;
};

export const EMPTY_FILTERS: MessageFilters = {
  name: "",
  publisher: "",
  protocol: "",
  comparator: "",
  value: "",
  from: "",
  to: "",
  aggregation: "",
  interval: "1h",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

function isoToNanos(iso: string): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  // BigInt keeps the nanosecond value exact in the query string.
  return (BigInt(ms) * BigInt(1_000_000)).toString();
}

/**
 * Checks filters and turns them into reader query parameters (without
 * paging). Returns a message for the first problem instead.
 */
export function filtersToParams(
  filters: MessageFilters,
): URLSearchParams | string {
  const params = new URLSearchParams();
  const name = filters.name.trim();
  const publisher = filters.publisher.trim();
  const protocol = filters.protocol.trim();
  if (name) params.set("name", name);
  if (publisher) {
    if (!isUuid(publisher)) return "Publisher must be a device ID.";
    params.set("publisher", publisher);
  }
  if (protocol) params.set("protocol", protocol);

  const value = filters.value.trim();
  if (filters.comparator || value) {
    if (!filters.comparator) return "Pick a comparator for the value filter.";
    if (!value || !Number.isFinite(Number(value)))
      return "The value filter needs a number.";
    params.set("v", String(Number(value)));
    params.set("comparator", filters.comparator);
  }

  let fromMs: number | null = null;
  let toMs: number | null = null;
  if (filters.from) {
    const nanos = isoToNanos(filters.from);
    if (!nanos) return "The start time is not valid.";
    params.set("from", nanos);
    fromMs = Date.parse(filters.from);
  }
  if (filters.to) {
    const nanos = isoToNanos(filters.to);
    if (!nanos) return "The end time is not valid.";
    params.set("to", nanos);
    toMs = Date.parse(filters.to);
  }
  if (fromMs !== null && toMs !== null && fromMs >= toMs)
    return "The start time must be before the end time.";

  if (filters.aggregation) {
    if (fromMs === null || toMs === null)
      return "Aggregation needs both a start and an end time.";
    if (!AGGREGATION_INTERVALS.includes(filters.interval as never))
      return "Pick an aggregation interval.";
    params.set("aggregation", filters.aggregation);
    params.set("interval", filters.interval);
  }
  return params;
}

const FORWARDED_PARAMS = [
  "name",
  "publisher",
  "protocol",
  "v",
  "comparator",
  "from",
  "to",
  "aggregation",
  "interval",
  "offset",
  "limit",
] as const;

/**
 * Server-side: copies only known reader parameters from the browser's query
 * and checks them, so the proxy never forwards anything unexpected (such as
 * `format`, which the reader interpolates into SQL as a table name).
 */
export function readerParams(input: URLSearchParams): URLSearchParams | string {
  const out = new URLSearchParams();
  for (const key of FORWARDED_PARAMS) {
    const value = input.get(key);
    if (value !== null && value !== "") out.set(key, value);
  }
  const intParam = (key: string, min: number, max: number) => {
    const raw = out.get(key);
    if (raw === null) return true;
    const n = Number(raw);
    return Number.isInteger(n) && n >= min && n <= max;
  };
  if (!intParam("offset", 0, Number.MAX_SAFE_INTEGER))
    return "offset must be a whole number.";
  if (!intParam("limit", 1, READER_MAX_LIMIT))
    return `limit must be between 1 and ${READER_MAX_LIMIT}.`;
  for (const key of ["from", "to"]) {
    const raw = out.get(key);
    if (raw !== null && !/^\d{1,19}$/.test(raw))
      return `${key} must be Unix nanoseconds.`;
  }
  const v = out.get("v");
  if (v !== null && !Number.isFinite(Number(v))) return "v must be a number.";
  const comparator = out.get("comparator");
  if (
    comparator !== null &&
    !MESSAGE_COMPARATORS.includes(comparator as MessageComparator)
  )
    return "Unknown comparator.";
  const publisher = out.get("publisher");
  if (publisher !== null && !isUuid(publisher))
    return "publisher must be a device ID.";
  const aggregation = out.get("aggregation");
  if (aggregation !== null) {
    if (!MESSAGE_AGGREGATIONS.includes(aggregation as MessageAggregation))
      return "Unknown aggregation.";
    if (!out.get("from") || !out.get("to"))
      return "Aggregation needs both from and to.";
    if (!AGGREGATION_INTERVALS.includes(out.get("interval") as never))
      return "Unknown aggregation interval.";
  } else {
    out.delete("interval");
  }
  return out;
}

/**
 * Stored times are Unix nanoseconds, but a publisher may have sent another
 * unit that the transformer kept (relative times, or devices with their own
 * convention). Picks the unit by magnitude so any of them shows a sane date.
 */
export function messageDate(time: number | undefined): Date | null {
  if (time == null || !Number.isFinite(time) || time <= 0) return null;
  const abs = Math.abs(time);
  let ms: number;
  if (abs >= 1e17) ms = time / 1e6;
  else if (abs >= 1e14) ms = time / 1e3;
  else if (abs >= 1e11) ms = time;
  else ms = time * 1e3;
  return new Date(ms);
}

/** The message's value as text: numeric, string, boolean, data or sum. */
export function messageValue(message: ReaderMessage): string {
  if (message.value != null) return String(message.value);
  if (message.string_value != null) return message.string_value;
  if (message.bool_value != null) return String(message.bool_value);
  if (message.data_value != null) return message.data_value;
  if (message.sum != null) return String(message.sum);
  return "";
}

export const CSV_HEADERS = [
  "Time",
  "Name",
  "Value",
  "Unit",
  "Publisher",
  "Protocol",
  "Subtopic",
] as const;

export function messagesCsv(messages: ReaderMessage[]): string {
  return toCsv([
    [...CSV_HEADERS],
    ...messages.map((message) => [
      messageDate(message.time)?.toISOString() ?? "",
      message.name ?? "",
      messageValue(message),
      message.unit ?? "",
      message.publisher ?? "",
      message.protocol ?? "",
      message.subtopic ?? "",
    ]),
  ]);
}

// --- Sending -----------------------------------------------------------------

export type SendMessageInput = {
  channelId: string;
  deviceId: string;
  name: string;
  value: string;
  unit: string;
};

export type SenmlRecord = {
  n: string;
  u?: string;
  t: number;
  v?: number;
  vb?: boolean;
  vs?: string;
};

/**
 * One SenML record. A numeric text becomes `v`, true/false becomes `vb`,
 * anything else `vs`. `t` is seconds (SenML's unit); the transformer turns it
 * into nanoseconds.
 */
export function buildSenml(
  input: Pick<SendMessageInput, "name" | "value" | "unit">,
  nowMs = Date.now(),
): SenmlRecord[] {
  const record: SenmlRecord = { n: input.name.trim(), t: nowMs / 1000 };
  const unit = input.unit.trim();
  if (unit) record.u = unit;
  const value = input.value.trim();
  if (value !== "" && Number.isFinite(Number(value))) record.v = Number(value);
  else if (value === "true" || value === "false") record.vb = value === "true";
  else record.vs = input.value;
  return [record];
}

// Magistrala's SenML name rule allows letters, digits and - : . / _
const SENML_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9\-:./_]*$/;

export function parseSendMessage(body: unknown): SendMessageInput | string {
  if (body === null || typeof body !== "object" || Array.isArray(body))
    return "invalid request";
  const { channelId, deviceId, name, value, unit } = body as Record<
    string,
    unknown
  >;
  if (typeof channelId !== "string" || !isUuid(channelId))
    return "Pick a channel.";
  if (typeof deviceId !== "string" || !isUuid(deviceId))
    return "Pick a device.";
  if (typeof name !== "string" || !name.trim()) return "Name is required.";
  if (!SENML_NAME_RE.test(name.trim()))
    return "Name may use letters, digits and - : . / _ only.";
  if (typeof value !== "string" || !value.trim()) return "Value is required.";
  if (unit != null && typeof unit !== "string") return "Unit must be text.";
  return {
    channelId,
    deviceId,
    name: name.trim(),
    value,
    unit: (unit as string | undefined) ?? "",
  };
}

// --- Device commands ---------------------------------------------------------

export type MessagingEndpoints = {
  /** Public HTTP adapter base, e.g. http://localhost/http */
  httpUrl: string;
  mqttHost: string;
  mqttPort: number;
};

export type DeviceCommandInput = {
  endpoints: MessagingEndpoints;
  workspaceRoute: string;
  channelRoute: string;
  deviceId: string;
  /** The real key, or a placeholder until it is revealed. */
  key: string;
};

/** Single-quotes a value for a POSIX shell. */
export function shellQuote(value: string): string {
  return /^[A-Za-z0-9_\-.:/@%+=,]+$/.test(value)
    ? value
    : `'${value.replace(/'/g, `'\\''`)}'`;
}

export const SAMPLE_SENML = '[{"n":"temperature","u":"Cel","v":21.5}]';

export function deviceCommands(input: DeviceCommandInput) {
  const topic = `m/${input.workspaceRoute}/c/${input.channelRoute}`;
  const { mqttHost, mqttPort } = input.endpoints;
  // Distinct client IDs so a running subscriber is not kicked off by a
  // publish from the same device.
  const auth = (suffix: string) =>
    `-i ${shellQuote(`${input.deviceId}${suffix}`)} -u ${shellQuote(input.deviceId)} -P ${shellQuote(input.key)}`;
  const httpUrl = `${input.endpoints.httpUrl.replace(/\/+$/, "")}/${topic}`;
  return {
    topic,
    mqttPub: `mosquitto_pub -h ${shellQuote(mqttHost)} -p ${mqttPort} ${auth("-pub")} -t ${shellQuote(topic)} -m ${shellQuote(SAMPLE_SENML)}`,
    mqttSub: `mosquitto_sub -h ${shellQuote(mqttHost)} -p ${mqttPort} ${auth("-sub")} -t ${shellQuote(topic)} -v`,
    // FluxMQ authenticates HTTP publishes as username (device ID) +
    // password (key), so Basic auth works for every key format.
    curl: `curl -sS -X POST ${shellQuote(httpUrl)} -u ${shellQuote(`${input.deviceId}:${input.key}`)} -H 'Content-Type: application/senml+json' -d ${shellQuote(SAMPLE_SENML)}`,
  };
}
