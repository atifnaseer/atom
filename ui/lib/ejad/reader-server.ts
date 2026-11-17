// Server-side: reading stored messages from the Magistrala message reader
// with the login token. Used by the /api/ejad route handlers only.

import type { MessagesPage } from "@/lib/ejad/messages";
import { readerUrl } from "@/lib/ejad/messaging-config";

const REQUEST_TIMEOUT_MS = 15_000;

/** A reader failure with the status the route handler should answer. */
export class ReaderError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * One page of a channel's messages. `params` must already be checked
 * (readerParams). Throws ReaderError, or the AbortError when `signal` fires.
 */
export async function readChannelMessages({
  token,
  workspaceId,
  channelId,
  params,
  signal,
}: {
  token: string;
  workspaceId: string;
  channelId: string;
  params: URLSearchParams;
  signal?: AbortSignal;
}): Promise<MessagesPage> {
  const url = `${readerUrl()}/${encodeURIComponent(workspaceId)}/channels/${encodeURIComponent(channelId)}/messages?${params}`;
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ReaderError("The message reader is not reachable.", 502);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `The message reader answered ${response.status}.`;
    const status = [400, 401, 403, 404].includes(response.status)
      ? response.status
      : 502;
    throw new ReaderError(message, status);
  }
  return {
    total: Number(payload?.total ?? 0),
    offset: Number(payload?.offset ?? 0),
    limit: Number(payload?.limit ?? 0),
    messages: Array.isArray(payload?.messages) ? payload.messages : [],
  };
}
