"use client";

import { useQuery } from "@tanstack/react-query";
import { CHANNELS_QUERY, type Channel } from "@/lib/ejad/channels";
import {
  DASHBOARD_QUERY,
  DASHBOARDS_QUERY,
  type Dashboard,
  isDashboardOf,
} from "@/lib/ejad/dashboards";
import { AtomGraphqlError, graphqlClient } from "@/lib/graphql/client";

export const DASHBOARDS_QUERY_KEY = "ejad-dashboards";
export const DASHBOARD_QUERY_KEY = "ejad-dashboard";
export const WIDGET_CHANNELS_QUERY_KEY = "ejad-widget-channels";

export function useDashboards(workspaceId: string) {
  return useQuery({
    queryKey: [DASHBOARDS_QUERY_KEY, workspaceId],
    queryFn: async ({ signal }) => {
      const { resources } = await graphqlClient<{
        resources: { total: number; items: Dashboard[] };
      }>({
        query: DASHBOARDS_QUERY,
        variables: { tenantId: workspaceId },
        signal,
      });
      return resources;
    },
  });
}

/** One dashboard; null when it does not exist in this workspace. */
export function useDashboard(workspaceId: string, id: string) {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, id],
    queryFn: async ({ signal }) => {
      try {
        const { resource } = await graphqlClient<{
          resource: Dashboard | null;
        }>({ query: DASHBOARD_QUERY, variables: { id }, signal });
        return isDashboardOf(resource, workspaceId) ? resource : null;
      } catch (error) {
        if (
          error instanceof AtomGraphqlError &&
          error.errors[0]?.extensions?.code === "NOT_FOUND"
        )
          return null;
        throw error;
      }
    },
  });
}

/** The workspace's channels (first 200), for pickers and widget titles. */
export function useWorkspaceChannels(workspaceId: string) {
  return useQuery({
    queryKey: [WIDGET_CHANNELS_QUERY_KEY, workspaceId],
    queryFn: async ({ signal }) => {
      const { resources } = await graphqlClient<{
        resources: { total: number; items: Channel[] };
      }>({
        query: CHANNELS_QUERY,
        variables: { tenantId: workspaceId, limit: 200, offset: 0 },
        signal,
      });
      return resources.items;
    },
    staleTime: 30_000,
  });
}
