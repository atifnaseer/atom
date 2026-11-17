"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  STORE_STATE_QUERY_KEY,
  storeRequest,
} from "@/components/ejad/messages/store-messages-switch";
import { fetchMessages } from "@/components/ejad/messages/use-messages";
import {
  CHART_REFRESH_MS,
  type LineWidget,
  measurementNames,
  mergeSeries,
  seriesParams,
  VALUE_REFRESH_MS,
} from "@/lib/ejad/dashboards";
import { graphqlClient } from "@/lib/graphql/client";

const WIDGET_QUERY_KEY = "ejad-widget";

/** The newest `limit` messages of a channel, optionally of one name. */
export function useLatestMessages(
  channelId: string,
  name: string,
  limit: number,
) {
  return useQuery({
    queryKey: [WIDGET_QUERY_KEY, "latest", channelId, name, limit],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (name) params.set("name", name);
      return fetchMessages(channelId, params, signal);
    },
    placeholderData: keepPreviousData,
    refetchInterval: VALUE_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

/**
 * A line chart's rows: one reader request per measurement name, joined by
 * time. Series are keyed s0, s1, … (names may hold characters CSS variables
 * cannot).
 */
export function useSeries(widget: LineWidget) {
  return useQuery({
    queryKey: [
      WIDGET_QUERY_KEY,
      "series",
      widget.channelId,
      widget.names,
      widget.range,
    ],
    queryFn: async ({ signal }) => {
      const now = Date.now();
      const pages = await Promise.all(
        widget.names.map((name) =>
          fetchMessages(
            widget.channelId,
            seriesParams(name, widget.range, now),
            signal,
          ),
        ),
      );
      return {
        now,
        rows: mergeSeries(
          pages.map((page, index) => ({
            name: `s${index}`,
            messages: page.messages,
          })),
        ),
      };
    },
    placeholderData: keepPreviousData,
    refetchInterval: CHART_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

/** Whether the channel stores messages (shared with the Store switch). */
export function useStoreState(channelId: string | null) {
  return useQuery({
    queryKey: [STORE_STATE_QUERY_KEY, channelId],
    enabled: Boolean(channelId),
    queryFn: ({ signal }) => storeRequest(channelId as string, { signal }),
    staleTime: 30_000,
    retry: false,
  });
}

/** Measurement names seen in the channel's newest 200 messages. */
export function useMeasurementNames(channelId: string | null) {
  return useQuery({
    queryKey: [WIDGET_QUERY_KEY, "names", channelId],
    enabled: Boolean(channelId),
    queryFn: async ({ signal }) => {
      const page = await fetchMessages(
        channelId as string,
        new URLSearchParams({ limit: "200" }),
        signal,
      );
      return measurementNames(page.messages);
    },
    staleTime: 30_000,
    retry: false,
  });
}

const DEVICE_STATUS_QUERY = `
  query EjadDeviceStatus($tenantId: ID!) {
    active: entities(kind: device, tenantId: $tenantId, status: active, limit: 1) { total }
    inactive: entities(kind: device, tenantId: $tenantId, status: inactive, limit: 1) { total }
    suspended: entities(kind: device, tenantId: $tenantId, status: suspended, limit: 1) { total }
  }
`;

export type DeviceStatusCounts = {
  active: number;
  inactive: number;
  suspended: number;
};

export function useDeviceStatusCounts(workspaceId: string) {
  return useQuery({
    queryKey: [WIDGET_QUERY_KEY, "device-status", workspaceId],
    queryFn: async ({ signal }): Promise<DeviceStatusCounts> => {
      const data = await graphqlClient<{
        active: { total: number };
        inactive: { total: number };
        suspended: { total: number };
      }>({
        query: DEVICE_STATUS_QUERY,
        variables: { tenantId: workspaceId },
        signal,
      });
      return {
        active: data.active.total,
        inactive: data.inactive.total,
        suspended: data.suspended.total,
      };
    },
    placeholderData: keepPreviousData,
    refetchInterval: VALUE_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}
