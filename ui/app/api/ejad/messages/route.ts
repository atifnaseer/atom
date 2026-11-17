import { NextResponse } from "next/server";
import { getServerToken } from "@/lib/auth/session";
import { requireWorkspaceAbility } from "@/lib/ejad/access-server";
import { isUuid, readerParams } from "@/lib/ejad/messages";
import { ReaderError, readChannelMessages } from "@/lib/ejad/reader-server";

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
  const guard = await requireWorkspaceAbility("view");
  if ("error" in guard) return guard.error;
  const { workspaceId } = guard;
  const token = await getServerToken();
  if (!token) return fail("missing authentication", 401);

  const query = new URL(request.url).searchParams;
  const channelId = query.get("channelId") ?? "";
  if (!isUuid(channelId)) return fail("Pick a channel.", 400);
  const params = readerParams(query);
  if (typeof params === "string") return fail(params, 400);

  try {
    const page = await readChannelMessages({
      token,
      workspaceId,
      channelId,
      params,
      signal: request.signal,
    });
    return NextResponse.json(page);
  } catch (error) {
    if (error instanceof ReaderError) return fail(error.message, error.status);
    if (request.signal.aborted) return new NextResponse(null, { status: 499 });
    throw error;
  }
}
