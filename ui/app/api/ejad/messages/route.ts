import { NextResponse } from "next/server";
import { getServerToken } from "@/lib/auth/session";
import { isUuid, readerParams } from "@/lib/ejad/messages";
import { readerUrl } from "@/lib/ejad/messaging-config";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

const REQUEST_TIMEOUT_MS = 15_000;

function fail(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

/**
 * Lists a channel's stored messages in the selected workspace through the
 * Magistrala message reader, authenticated with the login token.
 * Query: channelId plus reader filters (name, publisher, protocol, v,
 * comparator, from, to, aggregation, interval, offset, limit).
 */
export async function GET(request: Request) {
  const token = await getServerToken();
  if (!token) return fail("missing authentication", 401);
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) return fail("Select a workspace first.", 400);

  const query = new URL(request.url).searchParams;
  const channelId = query.get("channelId") ?? "";
  if (!isUuid(channelId)) return fail("Pick a channel.", 400);
  const params = readerParams(query);
  if (typeof params === "string") return fail(params, 400);

  const url = `${readerUrl()}/${encodeURIComponent(workspaceId)}/channels/${encodeURIComponent(channelId)}/messages?${params}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.any([
        request.signal,
        AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ]),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      return new NextResponse(null, { status: 499 });
    return fail("The message reader is not reachable.", 502);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `The message reader answered ${response.status}.`;
    const status = [400, 401, 403, 404].includes(response.status)
      ? response.status
      : 502;
    return fail(message, status);
  }
  return NextResponse.json({
    total: Number(payload?.total ?? 0),
    offset: Number(payload?.offset ?? 0),
    limit: Number(payload?.limit ?? 0),
    messages: Array.isArray(payload?.messages) ? payload.messages : [],
  });
}
