"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ExternalLink, MoreVertical, Radio, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { ChannelCreateDialog } from "@/components/ejad/channels/channel-create-dialog";
import { ChannelDeleteDialog } from "@/components/ejad/channels/channel-delete-dialog";
import { useWorkspaceRoute } from "@/components/ejad/channels/use-workspace-route";
import { GroupBadges } from "@/components/ejad/groups/group-badges";
import {
  useGroupFilter,
  useObjectGroups,
} from "@/components/ejad/groups/use-object-groups";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DisplayTags } from "@/components/view-tags";
import {
  CHANNELS_QUERY,
  type Channel,
  channelLabel,
  channelRoute,
  channelTags,
} from "@/lib/ejad/channels";
import { memberGroupIds } from "@/lib/ejad/groups";
import { graphqlClient } from "@/lib/graphql/client";

const PARAM = "channels";

export const CHANNELS_QUERY_KEY = "ejad-channels";

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function ChannelsView({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const page = positiveInt(searchParams.get(`${PARAM}.page`), 1);
  const limit = positiveInt(searchParams.get(`${PARAM}.limit`), 20);
  const q = (searchParams.get(`${PARAM}.q`) ?? "").trim();
  const workspaceRoute = useWorkspaceRoute(workspaceId);
  const groupId = searchParams.get(`${PARAM}.group`) || null;
  const { tree: groupTree } = useObjectGroups(workspaceId);
  const groupFilter = useGroupFilter(groupTree);

  const [deleting, setDeleting] = React.useState<Channel | null>(null);

  const { data, error, isPending } = useQuery({
    queryKey: [CHANNELS_QUERY_KEY, workspaceId, q, groupId, page, limit],
    queryFn: async ({ signal }) => {
      const result = await graphqlClient<{
        resources: { total: number; items: Channel[] };
      }>({
        query: CHANNELS_QUERY,
        variables: {
          tenantId: workspaceId,
          q: q || null,
          parentGroupId: groupId,
          limit,
          offset: (page - 1) * limit,
        },
        signal,
      });
      return result.resources;
    },
    placeholderData: keepPreviousData,
  });

  const refresh = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [CHANNELS_QUERY_KEY] });
  }, [queryClient]);

  const columns = React.useMemo<ColumnDef<Channel>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            href={`/channels/${row.original.id}`}
            className="inline-flex items-center gap-2 font-medium hover:underline"
          >
            <Radio className="size-4 shrink-0 text-muted-foreground" />
            {channelLabel(row.original)}
          </Link>
        ),
      },
      {
        id: "route",
        header: "Route",
        cell: ({ row }) => {
          const route = channelRoute(row.original);
          return route ? (
            <code className="font-mono text-xs">{route}</code>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "tags",
        header: "Tags",
        cell: ({ row }) => {
          const tags = channelTags(row.original);
          return tags.length ? (
            <DisplayTags tags={tags} className="[&>*]:mx-0" />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "groups",
        header: "Group",
        cell: ({ row }) => (
          <GroupBadges
            groupIds={memberGroupIds(row.original)}
            tree={groupTree}
          />
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {format(new Date(row.original.createdAt), "d MMM yyyy, HH:mm")}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        meta: { className: "w-12 text-right" },
        cell: ({ row }) => {
          const channel = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Actions for ${channelLabel(channel)}`}
                >
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => router.push(`/channels/${channel.id}`)}
                >
                  <ExternalLink />
                  Open
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={Boolean(channel.managedBy)}
                  onSelect={() => setDeleting(channel)}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [router, groupTree],
  );

  return (
    <div className="grid gap-6">
      <section className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Channels</h1>
        <p className="text-sm text-muted-foreground">
          Create channels that devices publish to and subscribe from.
        </p>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load channels</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        limit={limit}
        paramKey={PARAM}
        searchPlaceholder="Search by name, route or tag…"
        noResultsMessage={
          isPending
            ? "Loading channels…"
            : q || groupId
              ? "No channels match your search."
              : "No channels yet. Create one to start sending messages."
        }
        filters={groupFilter}
        serverFilters={{ search: true }}
        toolbar={
          <ChannelCreateDialog
            workspaceRoute={workspaceRoute}
            onCreated={refresh}
          />
        }
      />

      <ChannelDeleteDialog
        channel={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onDeleted={() => {
          setDeleting(null);
          refresh();
        }}
      />
    </div>
  );
}
