"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CircleOff,
  CirclePlay,
  Cpu,
  ExternalLink,
  MoreVertical,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { DeviceBulkUploadDialog } from "@/components/ejad/devices/device-bulk-upload-dialog";
import {
  DeviceDeleteDialog,
  DeviceStatusDialog,
} from "@/components/ejad/devices/device-confirm-dialogs";
import { DeviceCreateDialog } from "@/components/ejad/devices/device-create-dialog";
import {
  SharedKeyDialog,
  type ShownKey,
} from "@/components/ejad/devices/shared-key-dialog";
import { EmptyState } from "@/components/ejad/empty-state";
import { ErrorAlert } from "@/components/ejad/error-alert";
import { GroupBadges } from "@/components/ejad/groups/group-badges";
import {
  useGroupFilter,
  useObjectGroups,
} from "@/components/ejad/groups/use-object-groups";
import { useI18n } from "@/components/ejad/i18n-provider";
import { PageHeader } from "@/components/ejad/page-header";
import { StatusBadge } from "@/components/ejad/status-badge";
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
  type CreateDeviceResult,
  DEVICE_BY_EXTERNAL_ID_QUERY,
  DEVICES_QUERY,
  type Device,
  deviceTags,
  isDeviceEnabled,
} from "@/lib/ejad/devices";
import { memberGroupIds } from "@/lib/ejad/groups";
import { graphqlClient } from "@/lib/graphql/client";

const PARAM = "devices";
const STATUSES = ["active", "inactive"];

export const DEVICES_QUERY_KEY = "ejad-devices";

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function fetchDevices(params: {
  workspaceId: string;
  q: string;
  status: string | null;
  groupId: string | null;
  page: number;
  limit: number;
  signal: AbortSignal;
}) {
  const { workspaceId, q, status, groupId, page, limit, signal } = params;
  const list = graphqlClient<{
    entities: { total: number; items: Device[] };
  }>({
    query: DEVICES_QUERY,
    variables: {
      tenantId: workspaceId,
      q: q || null,
      status,
      parentGroupId: groupId,
      limit,
      offset: (page - 1) * limit,
    },
    signal,
  });
  // Atom's text search does not cover the external ID, so on the first page
  // also look the term up as an exact serial/MAC.
  const byExternalId =
    q && page === 1
      ? graphqlClient<{ entities: { items: Device[] } }>({
          query: DEVICE_BY_EXTERNAL_ID_QUERY,
          variables: {
            tenantId: workspaceId,
            externalId: q,
            status,
            parentGroupId: groupId,
          },
          signal,
        })
      : null;
  const [listData, externalData] = await Promise.all([list, byExternalId]);
  const match = externalData?.entities.items[0];
  const { items, total } = listData.entities;
  if (match && !items.some((device) => device.id === match.id)) {
    return { items: [match, ...items], total: total + 1 };
  }
  return { items, total };
}

export function DevicesView({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = useAccess().can("manage");
  const { t, format } = useI18n();
  const searchParams = useSearchParams();
  const page = positiveInt(searchParams.get(`${PARAM}.page`), 1);
  const limit = positiveInt(searchParams.get(`${PARAM}.limit`), 20);
  const q = (searchParams.get(`${PARAM}.q`) ?? "").trim();
  const statusParam = searchParams.get(`${PARAM}.status`);
  const status =
    statusParam && STATUSES.includes(statusParam) ? statusParam : null;
  const groupId = searchParams.get(`${PARAM}.group`) || null;
  const { tree: groupTree } = useObjectGroups(workspaceId);
  const groupFilter = useGroupFilter(groupTree);

  const [shownKey, setShownKey] = React.useState<ShownKey | null>(null);
  const [toggling, setToggling] = React.useState<Device | null>(null);
  const [deleting, setDeleting] = React.useState<Device | null>(null);

  const { data, error, isPending, refetch } = useQuery({
    queryKey: [DEVICES_QUERY_KEY, workspaceId, q, status, groupId, page, limit],
    queryFn: ({ signal }) =>
      fetchDevices({ workspaceId, q, status, groupId, page, limit, signal }),
    placeholderData: keepPreviousData,
  });

  const refresh = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [DEVICES_QUERY_KEY] });
  }, [queryClient]);

  const columns = React.useMemo<ColumnDef<Device>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("common.name"),
        cell: ({ row }) => (
          <Link
            href={`/devices/${row.original.id}`}
            className="inline-flex items-center gap-2 font-medium hover:underline"
          >
            <Cpu className="size-4 shrink-0 text-muted-foreground" />
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "externalId",
        header: t("devices.externalId"),
        cell: ({ row }) =>
          row.original.externalId ? (
            <code className="font-mono text-xs">{row.original.externalId}</code>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "tags",
        header: t("workspaces.tags"),
        cell: ({ row }) => {
          const tags = deviceTags(row.original);
          return tags.length ? (
            <DisplayTags tags={tags} className="[&>*]:mx-0" />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("common.status"),
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
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
          const device = row.original;
          const enabled = isDeviceEnabled(device);
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={t("common.actionsFor", { name: device.name })}
                >
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => router.push(`/devices/${device.id}`)}
                >
                  <ExternalLink />
                  {t("common.open")}
                </DropdownMenuItem>
                {canManage ? (
                  <>
                    <DropdownMenuItem
                      disabled={Boolean(device.managedBy)}
                      onSelect={() => setToggling(device)}
                    >
                      {enabled ? <CircleOff /> : <CirclePlay />}
                      {enabled ? t("common.disable") : t("common.enable")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={Boolean(device.managedBy)}
                      onSelect={() => setDeleting(device)}
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

  const onCreated = (result: CreateDeviceResult) => {
    refresh();
    if (result.sharedKey) {
      setShownKey({
        title: t("devices.created", { name: result.device.name }),
        description: t("devices.secretHint"),
        key: result.sharedKey.key,
        once: true,
      });
    }
  };
  const filtered = Boolean(q || status || groupId);

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        icon={Cpu}
        title={t("page.devices.title")}
        description={t("page.devices.description")}
        actions={
          canManage ? (
            <>
              <DeviceBulkUploadDialog onFinished={refresh} />
              <DeviceCreateDialog onCreated={onCreated} />
            </>
          ) : null
        }
      />

      {error ? (
        <ErrorAlert
          title={t("devices.loadFailed")}
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
        searchPlaceholder={t("devices.search")}
        loading={isPending}
        noResultsMessage={t("devices.noMatches")}
        emptyState={
          filtered || error ? undefined : (
            <EmptyState
              icon={Cpu}
              title={t("devices.emptyTitle")}
              description={
                canManage
                  ? t("devices.emptyHint")
                  : t("devices.emptyHintReadOnly")
              }
              action={
                canManage ? <DeviceCreateDialog onCreated={onCreated} /> : null
              }
            />
          )
        }
        statusFilter={{ enabled: true, options: STATUSES }}
        filters={groupFilter}
        serverFilters={{ search: true, status: true }}
      />

      <SharedKeyDialog shown={shownKey} onClose={() => setShownKey(null)} />
      <DeviceStatusDialog
        device={toggling}
        onOpenChange={(open) => {
          if (!open) setToggling(null);
        }}
        onDone={() => {
          setToggling(null);
          refresh();
        }}
      />
      <DeviceDeleteDialog
        device={deleting}
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
