import type {
  ConnectionRequest,
  ConnectionResult,
} from "@/lib/ejad/connections";
import { requestError } from "@/lib/ejad/errors";
import { pageLocale, type Translate, translator } from "@/lib/ejad/i18n/core";

/** Connects (POST) or disconnects (DELETE) through the Ejad route handler. */
export async function requestConnections(
  method: "POST" | "DELETE",
  body: ConnectionRequest,
): Promise<ConnectionResult> {
  const response = await fetch("/api/ejad/connections", {
    method,
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Partial<
    ConnectionResult & { message: string }
  >;
  if (!response.ok) {
    throw requestError(response, payload);
  }
  return {
    changed: payload.changed ?? 0,
    skipped: payload.skipped ?? 0,
    failed: payload.failed ?? [],
  };
}

/** One toast-ready sentence for a connect/disconnect result. */
export function describeResult(
  result: ConnectionResult,
  mode: "connect" | "disconnect",
  t: Translate = translator(pageLocale()),
): { ok: boolean; message: string } {
  const parts: string[] = [];
  if (result.changed > 0)
    parts.push(
      t(mode === "connect" ? "connections.added" : "connections.removed", {
        count: result.changed,
      }),
    );
  if (result.skipped > 0)
    parts.push(
      t(
        mode === "connect" ? "connections.existed" : "connections.notConnected",
        {
          count: result.skipped,
        },
      ),
    );
  if (result.failed.length > 0)
    parts.push(
      t("connections.failed", {
        count: result.failed.length,
        error: result.failed[0].message,
      }),
    );
  return {
    ok: result.failed.length === 0,
    message: parts.join(t("common.comma")) || t("connections.nothing"),
  };
}
