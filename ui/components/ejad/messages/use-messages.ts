"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CSV_MAX_ROWS,
  MESSAGES_REFRESH_MS,
  type MessagesPage,
  READER_MAX_LIMIT,
  type ReaderMessage,
} from "@/lib/ejad/messages";

export const MESSAGES_QUERY_KEY = "ejad-messages";

/** Reads one page of a channel's messages through /api/ejad/messages. */
export async function fetchMessages(
  channelId: string,
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<MessagesPage> {
  const query = new URLSearchParams(params);
  query.set("channelId", channelId);
  const response = await fetch(`/api/ejad/messages?${query}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  const payload = (await response.json().catch(() => ({}))) as Partial<
    MessagesPage & { message: string }
  >;
  if (!response.ok) {
    throw new Error(
      payload.message ?? `Request failed with status ${response.status}`,
    );
  }
  return {
    total: payload.total ?? 0,
    offset: payload.offset ?? 0,
    limit: payload.limit ?? 0,
    messages: payload.messages ?? [],
  };
}

/**
 * A live page of messages, refreshed every 5 s while the tab is visible.
 * `params` are reader filters (see filtersToParams) without paging.
 */
export function useMessages({
  workspaceId,
  channelId,
  params,
  offset,
  limit,
  live = true,
}: {
  workspaceId: string;
  channelId: string | null;
  params: URLSearchParams | null;
  offset: number;
  limit: number;
  live?: boolean;
}) {
  const filterKey = params?.toString() ?? "";
  return useQuery({
    queryKey: [
      MESSAGES_QUERY_KEY,
      workspaceId,
      channelId,
      filterKey,
      offset,
      limit,
    ],
    enabled: Boolean(channelId && params),
    queryFn: ({ signal }) => {
      const query = new URLSearchParams(filterKey);
      query.set("offset", String(offset));
      query.set("limit", String(limit));
      return fetchMessages(channelId as string, query, signal);
    },
    placeholderData: keepPreviousData,
    refetchInterval: live ? MESSAGES_REFRESH_MS : false,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

/**
 * Every message matching the filters, newest first, in pages of 1000, up to
 * CSV_MAX_ROWS. Returns the rows and whether the result was cut short.
 */
export async function fetchAllMessages(
  channelId: string,
  params: URLSearchParams,
): Promise<{ messages: ReaderMessage[]; truncated: boolean; total: number }> {
  const messages: ReaderMessage[] = [];
  let total = 0;
  for (let offset = 0; offset < CSV_MAX_ROWS; offset += READER_MAX_LIMIT) {
    const query = new URLSearchParams(params);
    query.set("offset", String(offset));
    query.set(
      "limit",
      String(Math.min(READER_MAX_LIMIT, CSV_MAX_ROWS - offset)),
    );
    const page = await fetchMessages(channelId, query);
    total = page.total;
    messages.push(...page.messages);
    if (
      page.messages.length < READER_MAX_LIMIT ||
      messages.length >= page.total
    )
      break;
  }
  return { messages, truncated: messages.length < total, total };
}
