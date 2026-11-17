"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import {
  buildGroupTree,
  fetchAllObjectGroups,
  type GroupTree,
  groupOptions,
  type ObjectGroup,
} from "@/lib/ejad/groups";
import { graphqlClient } from "@/lib/graphql/client";

export const GROUPS_QUERY_KEY = "ejad-groups";
/** Prefix of every query that lists group members. */
export const GROUP_MEMBERS_QUERY_KEY = "ejad-group-members";

const EMPTY: ObjectGroup[] = [];

/** Every object group in the workspace, plus the tree built from them. */
export function useObjectGroups(workspaceId: string) {
  const query = useQuery({
    queryKey: [GROUPS_QUERY_KEY, workspaceId],
    queryFn: () => fetchAllObjectGroups(graphqlClient, workspaceId),
    staleTime: 30_000,
  });
  const groups = query.data ?? EMPTY;
  const tree = React.useMemo<GroupTree>(() => buildGroupTree(groups), [groups]);
  return { ...query, groups, tree };
}

/** Invalidates group lists, group members and the device/channel tables. */
export function useRefreshGroups() {
  const queryClient = useQueryClient();
  return React.useCallback(() => {
    for (const key of [
      GROUPS_QUERY_KEY,
      GROUP_MEMBERS_QUERY_KEY,
      "ejad-group",
      "ejad-group-candidates",
      "ejad-group-member-counts",
      "ejad-devices",
      "ejad-channels",
    ]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);
}

/** Non-breaking spaces so Select items show the tree depth. */
export function indentLabel(label: string, depth: number) {
  return `${"   ".repeat(depth)}${label}`;
}

/** DataTable "Group" select filter for the devices and channels tables. */
export function useGroupFilter(tree: GroupTree) {
  return React.useMemo(
    () => [
      {
        key: "group",
        label: "Group",
        allLabel: "All groups",
        type: "select" as const,
        options: groupOptions(tree).map((option) => ({
          value: option.value,
          label: indentLabel(option.label, option.depth),
        })),
      },
    ],
    [tree],
  );
}
