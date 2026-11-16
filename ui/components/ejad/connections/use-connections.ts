"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CHANNEL_QUERY,
  type Channel,
  channelLabel,
  channelRoute,
} from "@/lib/ejad/channels";
import {
  type Connection,
  connectionsFromPolicies,
  listChannelPolicies,
  listDevicePolicies,
} from "@/lib/ejad/connections";
import { DEVICE_QUERY, type Device } from "@/lib/ejad/devices";
import { graphqlClient } from "@/lib/graphql/client";

export const CONNECTIONS_QUERY_KEY = "ejad-connections";

/** A connection as seen from one side: the other end, labelled. */
export type ConnectionRow = Connection & {
  /** Id of the object on the other side (channel for a device, and back). */
  peerId: string;
  peerLabel: string;
  peerDetail: string | null;
  /** False when the other side was deleted but its policy is still there. */
  peerExists: boolean;
};

async function labelPeers<T>(
  ids: string[],
  load: (id: string) => Promise<T>,
): Promise<Map<string, T | null>> {
  const settled = await Promise.allSettled(ids.map(load));
  return new Map(
    ids.map((id, i) => {
      const entry = settled[i];
      return [id, entry.status === "fulfilled" ? entry.value : null];
    }),
  );
}

export function useDeviceConnections(workspaceId: string, deviceId: string) {
  return useQuery({
    queryKey: [CONNECTIONS_QUERY_KEY, "device", workspaceId, deviceId],
    queryFn: async (): Promise<ConnectionRow[]> => {
      const policies = await listDevicePolicies(
        graphqlClient,
        workspaceId,
        deviceId,
      );
      const connections = connectionsFromPolicies(policies);
      const channels = await labelPeers(
        connections.map((c) => c.channelId),
        async (id) =>
          (
            await graphqlClient<{ resource: Channel }>({
              query: CHANNEL_QUERY,
              variables: { id },
            })
          ).resource,
      );
      return connections
        .map((connection) => {
          const channel = channels.get(connection.channelId) ?? null;
          return {
            ...connection,
            peerId: connection.channelId,
            peerLabel: channel ? channelLabel(channel) : connection.channelId,
            peerDetail: channel ? channelRoute(channel) : null,
            peerExists: channel !== null,
          };
        })
        .sort((a, b) => a.peerLabel.localeCompare(b.peerLabel));
    },
  });
}

export function useChannelConnections(workspaceId: string, channelId: string) {
  return useQuery({
    queryKey: [CONNECTIONS_QUERY_KEY, "channel", workspaceId, channelId],
    queryFn: async (): Promise<ConnectionRow[]> => {
      const policies = await listChannelPolicies(
        graphqlClient,
        workspaceId,
        channelId,
      );
      const connections = connectionsFromPolicies(policies).filter(
        (c) => c.channelId === channelId,
      );
      const devices = await labelPeers(
        connections.map((c) => c.deviceId),
        async (id) =>
          (
            await graphqlClient<{ entity: Device }>({
              query: DEVICE_QUERY,
              variables: { id },
            })
          ).entity,
      );
      return connections
        .map((connection) => {
          const device = devices.get(connection.deviceId) ?? null;
          return {
            ...connection,
            peerId: connection.deviceId,
            peerLabel: device?.name || connection.deviceId,
            peerDetail: device?.externalId ?? null,
            peerExists: device !== null,
          };
        })
        .sort((a, b) => a.peerLabel.localeCompare(b.peerLabel));
    },
  });
}
