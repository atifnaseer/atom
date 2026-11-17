"use client";

import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/components/app-shell/tenant-provider";
import {
  type Ability,
  NO_ACCESS,
  type WorkspaceAccess,
} from "@/lib/ejad/access";
import { requestError } from "@/lib/ejad/errors";
import { GLOBAL_TENANT } from "@/lib/tenant/context";

export const ACCESS_QUERY_KEY = "ejad-access";

async function fetchAccess(signal: AbortSignal): Promise<WorkspaceAccess> {
  const response = await fetch("/api/ejad/access", {
    cache: "no-store",
    signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw requestError(response, payload);
  return payload as WorkspaceAccess;
}

/**
 * The signed-in user's abilities in the selected workspace. While loading
 * (or on error) every ability is false, so buttons stay hidden rather than
 * flash in and out.
 */
export function useAccess() {
  const { selection } = useTenant();
  const workspaceId = selection.id === GLOBAL_TENANT ? null : selection.id;
  const query = useQuery({
    queryKey: [ACCESS_QUERY_KEY, workspaceId],
    queryFn: ({ signal }) => fetchAccess(signal),
    staleTime: 30_000,
  });
  const access = query.data;
  // The tenant cookie and the provider can briefly disagree after a switch;
  // only trust answers about the workspace currently selected.
  const current = access && access.workspaceId === workspaceId ? access : null;
  return {
    loading: query.isPending,
    error: query.error,
    platformAdmin: access?.platformAdmin ?? false,
    role: current?.role ?? null,
    can: (ability: Ability) => (current?.can ?? NO_ACCESS)[ability],
  };
}
