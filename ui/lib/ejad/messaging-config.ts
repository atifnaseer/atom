// Server-side: where the Magistrala messaging services live. Read in route
// handlers and server components only; the browser never calls these.

import type { MessagingEndpoints } from "@/lib/ejad/messages";

/** Message reader base URL (GET /{workspace}/channels/{channel}/messages). */
export function readerUrl(): string {
  return (process.env.MG_READER_URL ?? "http://localhost:9011").replace(
    /\/+$/,
    "",
  );
}

/** HTTP adapter base URL (POST /m/{workspace}/c/{channel}). */
export function httpAdapterUrl(): string {
  return (process.env.MG_HTTP_URL ?? "http://localhost/http").replace(
    /\/+$/,
    "",
  );
}

/** Endpoints shown in generated device commands. */
export function messagingEndpoints(): MessagingEndpoints {
  const port = Number(process.env.MG_MQTT_PORT ?? 1883);
  return {
    httpUrl: httpAdapterUrl(),
    mqttHost: process.env.MG_MQTT_HOST ?? "localhost",
    mqttPort: Number.isInteger(port) && port > 0 ? port : 1883,
  };
}

/** Rules engine (re service) base URL (POST /{workspace}/rules). */
export function rulesEngineUrl(): string {
  return (process.env.MG_RE_URL ?? "http://localhost:9008").replace(/\/+$/, "");
}
