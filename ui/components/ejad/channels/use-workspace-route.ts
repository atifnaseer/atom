"use client";

import { useQuery } from "@tanstack/react-query";
import { graphqlClient } from "@/lib/graphql/client";

const WORKSPACE_ROUTE_QUERY = `
  query EjadWorkspaceRoute($id: ID!) { tenant(id: $id) { id alias } }
`;

/** The selected workspace's route (tenant alias), or null while unknown. */
export function useWorkspaceRoute(workspaceId: string): string | null {
  const { data } = useQuery({
    queryKey: ["ejad-workspace-route", workspaceId],
    queryFn: ({ signal }) =>
      graphqlClient<{ tenant: { id: string; alias: string | null } }>({
        query: WORKSPACE_ROUTE_QUERY,
        variables: { id: workspaceId },
        signal,
      }),
    staleTime: 5 * 60_000,
  });
  return data?.tenant.alias ?? null;
}
