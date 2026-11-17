"use client";

import { useQueryClient } from "@tanstack/react-query";
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
import { useI18n } from "@/components/ejad/i18n-provider";
import { IfAllowed } from "@/components/ejad/if-allowed";
import { PageHeader } from "@/components/ejad/page-header";
import { useAccess } from "@/components/ejad/use-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardName, parseLayout } from "@/lib/ejad/dashboards";

export function DashboardsView({ workspaceId }: { workspaceId: string }) {
  const { t, format } = useI18n();
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
        title={t("page.dashboards.title")}
        description={t("page.dashboards.description")}
        actions={
          <IfAllowed ability="manage">
            <Button onClick={actions.create}>
              <Plus />
              {t("dashboards.create")}
            </Button>
          </IfAllowed>
        }
      />

      {error ? (
        <ErrorAlert
          title={t("dashboards.loadFailed")}
          error={error}
          onRetry={() => refetch()}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-8"
            placeholder={t("dashboards.search")}
            aria-label={t("dashboards.search")}
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
          {t("dashboards.noMatches")}
        </p>
      ) : shown.length === 0 ? (
        error ? null : (
          <Card>
            <EmptyState
              icon={LayoutDashboard}
              title={t("dashboards.emptyTitle")}
              description={
                canManage
                  ? t("dashboards.emptyHint")
                  : t("dashboards.emptyHintReadOnly")
              }
              action={
                canManage ? (
                  <Button onClick={actions.create}>
                    <Plus />
                    {t("dashboards.create")}
                  </Button>
                ) : null
              }
            />
          </Card>
        )
      ) : (
        <ul
          aria-label={t("nav.dashboards")}
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
                        {t("dashboards.widgets", { count: widgets })} ·{" "}
                        {t("dashboards.updated", {
                          when: format.relative(changed),
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
