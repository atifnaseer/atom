"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, MoreVertical, Radio, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { ChannelCreateDialog } from "@/components/ejad/channels/channel-create-dialog";
import { ChannelDeleteDialog } from "@/components/ejad/channels/channel-delete-dialog";
import { useWorkspaceRoute } from "@/components/ejad/channels/use-workspace-route";
import { EmptyState } from "@/components/ejad/empty-state";
import { ErrorAlert } from "@/components/ejad/error-alert";
import { GroupBadges } from "@/components/ejad/groups/group-badges";
import {
  useGroupFilter,
  useObjectGroups,
} from "@/components/ejad/groups/use-object-groups";
import { useI18n } from "@/components/ejad/i18n-provider";
import { PageHeader } from "@/components/ejad/page-header";
import { useAccess } from "@/components/ejad/use-access";
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
  const canManage = useAccess().can("manage");
  const { t, format } = useI18n();
  const searchParams = useSearchParams();
  const page = positiveInt(searchParams.get(`${PARAM}.page`), 1);
  const limit = positiveInt(searchParams.get(`${PARAM}.limit`), 20);
  const q = (searchParams.get(`${PARAM}.q`) ?? "").trim();
  const workspaceRoute = useWorkspaceRoute(workspaceId);
  const groupId = searchParams.get(`${PARAM}.group`) || null;
  const { tree: groupTree } = useObjectGroups(workspaceId);
  const groupFilter = useGroupFilter(groupTree);

  const [deleting, setDeleting] = React.useState<Channel | null>(null);

  const { data, error, isPending, refetch } = useQuery({
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
        header: t("common.name"),
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
        header: t("workspaces.route"),
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
        header: t("workspaces.tags"),
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
        header: t("devices.group"),
        cell: ({ row }) => (
          <GroupBadges
            groupIds={memberGroupIds(row.original)}
            tree={groupTree}
          />
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("common.created"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {format.date(row.original.createdAt, "dateTime")}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("common.actions")}</span>,
        meta: { className: "w-12 text-end" },
        cell: ({ row }) => {
          const channel = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={t("common.actionsFor", {
                    name: channelLabel(channel),
                  })}
                >
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => router.push(`/channels/${channel.id}`)}
                >
                  <ExternalLink />
                  {t("common.open")}
                </DropdownMenuItem>
                {canManage ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={Boolean(channel.managedBy)}
                      onSelect={() => setDeleting(channel)}
                    >
                      <Trash2 />
                      {t("common.delete")}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [router, groupTree, canManage, t, format],
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        icon={Radio}
        title={t("page.channels.title")}
        description={t("page.channels.description")}
        actions={
          canManage ? (
            <ChannelCreateDialog
              workspaceRoute={workspaceRoute}
              onCreated={refresh}
            />
          ) : null
        }
      />

      {error ? (
        <ErrorAlert
          title={t("channels.loadFailed")}
          error={error}
          onRetry={() => refetch()}
        />
      ) : null}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        limit={limit}
        paramKey={PARAM}
        searchPlaceholder={t("channels.search")}
        loading={isPending}
        noResultsMessage={t("channels.noMatches")}
        emptyState={
          q || groupId || error ? undefined : (
            <EmptyState
              icon={Radio}
              title={t("channels.emptyTitle")}
              description={
                canManage
                  ? t("channels.emptyHint")
                  : t("channels.emptyHintReadOnly")
              }
              action={
                canManage ? (
                  <ChannelCreateDialog
                    workspaceRoute={workspaceRoute}
                    onCreated={refresh}
                  />
                ) : null
              }
            />
          )
        }
        filters={groupFilter}
        serverFilters={{ search: true }}
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
