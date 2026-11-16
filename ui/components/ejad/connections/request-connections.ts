import type {
  ConnectionRequest,
  ConnectionResult,
} from "@/lib/ejad/connections";

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
    throw new Error(
      payload.message ?? `Request failed with status ${response.status}`,
    );
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
): { ok: boolean; message: string } {
  const verb = mode === "connect" ? "added" : "removed";
  const parts: string[] = [];
  if (result.changed > 0)
    parts.push(
      `${result.changed} connection${result.changed === 1 ? "" : "s"} ${verb}`,
    );
  if (result.skipped > 0)
    parts.push(
      `${result.skipped} ${mode === "connect" ? "already existed" : "were not connected"}`,
    );
  if (result.failed.length > 0)
    parts.push(`${result.failed.length} failed: ${result.failed[0].message}`);
  return {
    ok: result.failed.length === 0,
    message: parts.join(", ") || "Nothing to change",
  };
}
