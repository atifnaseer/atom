"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Cpu, Plus, Radio, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/crud/status-badge";
import { ConfirmDialog } from "@/components/ejad/confirm-dialog";
import { EmptyState } from "@/components/ejad/empty-state";
import { ErrorAlert, toastError } from "@/components/ejad/error-alert";
import { GroupAddMembersDialog } from "@/components/ejad/groups/group-add-members-dialog";
import {
  GROUP_MEMBERS_QUERY_KEY,
  useRefreshGroups,
} from "@/components/ejad/groups/use-object-groups";
import { useAccess } from "@/components/ejad/use-access";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  CHANNELS_QUERY,
  type Channel,
  channelLabel,
  channelRoute,
} from "@/lib/ejad/channels";
import { DEVICES_QUERY, type Device } from "@/lib/ejad/devices";
import {
  type MemberKind,
  type ObjectGroup,
  setGroupMembership,
} from "@/lib/ejad/groups";
import { graphqlClient } from "@/lib/graphql/client";

type Member = {
  id: string;
  label: string;
  detail: string | null;
  status: string | null;
};

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function fetchMembers(params: {
  kind: MemberKind;
  workspaceId: string;
  groupId: string;
  q: string;
  page: number;
  limit: number;
  signal: AbortSignal;
}): Promise<{ total: number; items: Member[] }> {
  const { kind, workspaceId, groupId, q, page, limit, signal } = params;
  const variables = {
    tenantId: workspaceId,
    parentGroupId: groupId,
    q: q || null,
    limit,
    offset: (page - 1) * limit,
  };
  if (kind === "device") {
    const { entities } = await graphqlClient<{
      entities: { total: number; items: Device[] };
    }>({ query: DEVICES_QUERY, variables, signal });
    return {
      total: entities.total,
      items: entities.items.map((device) => ({
        id: device.id,
        label: device.name,
        detail: device.externalId,
        status: device.status,
      })),
    };
  }
  const { resources } = await graphqlClient<{
    resources: { total: number; items: Channel[] };
  }>({ query: CHANNELS_QUERY, variables, signal });
  return {
    total: resources.total,
    items: resources.items.map((channel) => ({
      id: channel.id,
      label: channelLabel(channel),
      detail: channelRoute(channel),
      status: null,
    })),
  };
}

/** A group's devices or channels, with add and remove. */
export function GroupMembers({
  kind,
  workspaceId,
  group,
}: {
  kind: MemberKind;
  workspaceId: string;
  group: ObjectGroup;
}) {
  const param = kind === "device" ? "groupDevices" : "groupChannels";
  const noun = kind === "device" ? "device" : "channel";
  const searchParams = useSearchParams();
  const page = positiveInt(searchParams.get(`${param}.page`), 1);
  const limit = positiveInt(searchParams.get(`${param}.limit`), 20);
  const q = (searchParams.get(`${param}.q`) ?? "").trim();
  const refresh = useRefreshGroups();
  const [adding, setAdding] = React.useState(false);
  const canManage = useAccess().can("manage");

  const { data, error, isPending } = useQuery({
    queryKey: [GROUP_MEMBERS_QUERY_KEY, kind, group.id, q, page, limit],
    queryFn: ({ signal }) =>
      fetchMembers({
        kind,
        workspaceId,
        groupId: group.id,
        q,
        page,
        limit,
        signal,
      }),
    placeholderData: keepPreviousData,
  });

  const [removing, setRemoving] = React.useState<Member | null>(null);
  const remove = useMutation({
    mutationFn: async (member: Member) => {
      await setGroupMembership(graphqlClient, kind, member.id, group.id, false);
      return member;
    },
    onSuccess: (member) => {
      toast.success(`Removed “${member.label}” from “${group.name}”`);
      setRemoving(null);
      refresh();
    },
    onError: (err) => toastError(err),
  });

  const columns = React.useMemo<ColumnDef<Member>[]>(() => {
    const Icon = kind === "device" ? Cpu : Radio;
    const base = kind === "device" ? "/devices" : "/channels";
    const cols: ColumnDef<Member>[] = [
      {
        accessorKey: "label",
        header: "Name",
        cell: ({ row }) => (
          <Link
            href={`${base}/${row.original.id}`}
            className="inline-flex items-center gap-2 font-medium hover:underline"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            {row.original.label}
          </Link>
        ),
      },
      {
        id: "detail",
        header: kind === "device" ? "External ID" : "Route",
        cell: ({ row }) =>
          row.original.detail ? (
            <code className="font-mono text-xs">{row.original.detail}</code>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ];
    if (kind === "device") {
      cols.push({
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge value={row.original.status ?? ""} />,
      });
    }
    if (!canManage) return cols;
    cols.push({
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      meta: { className: "w-12 text-right" },
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          disabled={remove.isPending}
          aria-label={`Remove ${row.original.label} from the group`}
          onClick={() => setRemoving(row.original)}
        >
          <X />
          Remove
        </Button>
      ),
    });
    return cols;
  }, [kind, remove, canManage]);

  return (
    <div className="grid grid-cols-1 gap-4">
      {error ? (
        <ErrorAlert title={`Could not load ${noun}s`} error={error} />
      ) : null}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        limit={limit}
        paramKey={param}
        searchPlaceholder={`Search ${noun}s in this group…`}
        loading={isPending}
        noResultsMessage={`No ${noun}s in this group match your search.`}
        emptyState={
          q || error ? undefined : (
            <EmptyState
              icon={kind === "device" ? Cpu : Radio}
              title={`No ${noun}s in this group yet`}
              description={
                canManage
                  ? `Add ${noun}s to this group to organize them and filter the ${noun} list by it.`
                  : `Ask a workspace admin to add ${noun}s to this group.`
              }
              action={
                canManage ? (
                  <Button onClick={() => setAdding(true)}>
                    <Plus />
                    Add {noun}s
                  </Button>
                ) : null
              }
            />
          )
        }
        serverFilters={{ search: true }}
        toolbar={
          canManage ? (
            <Button onClick={() => setAdding(true)}>
              <Plus />
              Add {noun}s
            </Button>
          ) : null
        }
      />
      <GroupAddMembersDialog
        kind={kind}
        open={adding}
        onOpenChange={setAdding}
        workspaceId={workspaceId}
        group={group}
        onAdded={refresh}
      />
      <ConfirmDialog
        open={removing !== null}
        title={`Remove “${removing?.label ?? ""}” from “${group.name}”?`}
        description={`The ${noun} itself is kept, along with its connections. It only stops being a member of this group.`}
        confirmLabel="Remove"
        pendingLabel="Removing…"
        pending={remove.isPending}
        onConfirm={() => {
          if (removing) remove.mutate(removing);
        }}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
