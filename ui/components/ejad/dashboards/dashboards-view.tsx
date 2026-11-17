"use client";

import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { LayoutDashboard, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  DashboardActionsMenu,
  useDashboardActions,
} from "@/components/ejad/dashboards/dashboard-actions";
import {
  DASHBOARD_QUERY_KEY,
  DASHBOARDS_QUERY_KEY,
  useDashboards,
} from "@/components/ejad/dashboards/use-dashboards";
import { EmptyState } from "@/components/ejad/empty-state";
import { ErrorAlert } from "@/components/ejad/error-alert";
import { IfAllowed } from "@/components/ejad/if-allowed";
import { PageHeader } from "@/components/ejad/page-header";
import { useAccess } from "@/components/ejad/use-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardName, parseLayout } from "@/lib/ejad/dashboards";

export function DashboardsView({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, error, isPending, refetch } = useDashboards(workspaceId);
  const canManage = useAccess().can("manage");
  const [search, setSearch] = React.useState("");

  const dashboards = data?.items ?? [];
  const actions = useDashboardActions({
    workspaceId,
    existingNames: dashboards.map(dashboardName),
    onSaved: (dashboard, mode) => {
      queryClient.invalidateQueries({ queryKey: [DASHBOARDS_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [DASHBOARD_QUERY_KEY, dashboard.id],
      });
      if (mode !== "rename") router.push(`/dashboards/${dashboard.id}`);
    },
    onDeleted: () =>
      queryClient.invalidateQueries({ queryKey: [DASHBOARDS_QUERY_KEY] }),
  });

  const needle = search.trim().toLowerCase();
  const shown = needle
    ? dashboards.filter((item) =>
        dashboardName(item).toLowerCase().includes(needle),
      )
    : dashboards;

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboards"
        description="Live charts and values from your channels’ stored messages."
        actions={
          <IfAllowed ability="manage">
            <Button onClick={actions.create}>
              <Plus />
              Create dashboard
            </Button>
          </IfAllowed>
        }
      />

      {error ? (
        <ErrorAlert
          title="Could not load dashboards"
          error={error}
          onRetry={() => refetch()}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search dashboards…"
            aria-label="Search dashboards"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-24" />
          ))}
        </div>
      ) : shown.length === 0 && needle ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          No dashboards match your search.
        </p>
      ) : shown.length === 0 ? (
        error ? null : (
          <Card>
            <EmptyState
              icon={LayoutDashboard}
              title="No dashboards yet"
              description={
                canManage
                  ? "A dashboard shows live charts, gauges and values from the messages your devices send. Turn on “Store messages” on a channel first, then create a dashboard."
                  : "A dashboard shows live charts and values from your devices’ messages. Ask a workspace admin to create one."
              }
              action={
                canManage ? (
                  <Button onClick={actions.create}>
                    <Plus />
                    Create dashboard
                  </Button>
                ) : null
              }
            />
          </Card>
        )
      ) : (
        <ul
          aria-label="Dashboards"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {shown.map((dashboard) => {
            const widgets = parseLayout(dashboard.attributes).length;
            const changed = dashboard.updatedAt ?? dashboard.createdAt;
            return (
              <li key={dashboard.id}>
                <Card className="relative h-full py-4 transition-colors hover:bg-muted/40">
                  <CardContent className="flex items-start gap-3 px-4">
                    <LayoutDashboard className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    <div className="grid min-w-0 flex-1 gap-1">
                      <Link
                        href={`/dashboards/${dashboard.id}`}
                        className="truncate font-medium after:absolute after:inset-0 hover:underline"
                      >
                        {dashboardName(dashboard)}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {widgets} widget{widgets === 1 ? "" : "s"} · updated{" "}
                        {formatDistanceToNow(new Date(changed), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="relative z-10">
                      <IfAllowed ability="manage">
                        <DashboardActionsMenu
                          dashboard={dashboard}
                          actions={actions}
                        />
                      </IfAllowed>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {actions.dialogs}
    </div>
  );
}
