"use client";

import { Copy, MoreVertical, Pencil, Trash2 } from "lucide-react";
import * as React from "react";
import { DashboardDeleteDialog } from "@/components/ejad/dashboards/dashboard-delete-dialog";
import {
  DashboardNameDialog,
  type DashboardNameTarget,
} from "@/components/ejad/dashboards/dashboard-name-dialog";
import { useT } from "@/components/ejad/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyName, type Dashboard, dashboardName } from "@/lib/ejad/dashboards";

/** Create / rename / duplicate / delete, with their dialogs. */
export function useDashboardActions({
  workspaceId,
  existingNames,
  onSaved,
  onDeleted,
}: {
  workspaceId: string;
  existingNames: string[];
  onSaved: (dashboard: Dashboard, mode: DashboardNameTarget["mode"]) => void;
  onDeleted: (dashboard: Dashboard) => void;
}) {
  const [nameTarget, setNameTarget] =
    React.useState<DashboardNameTarget | null>(null);
  const [deleting, setDeleting] = React.useState<Dashboard | null>(null);

  return {
    create: () => setNameTarget({ mode: "create" }),
    rename: (dashboard: Dashboard) =>
      setNameTarget({ mode: "rename", dashboard }),
    duplicate: (dashboard: Dashboard) =>
      setNameTarget({
        mode: "duplicate",
        dashboard,
        suggestedName: copyName(dashboardName(dashboard), existingNames),
      }),
    remove: (dashboard: Dashboard) => setDeleting(dashboard),
    dialogs: (
      <>
        <DashboardNameDialog
          workspaceId={workspaceId}
          target={nameTarget}
          onOpenChange={(open) => {
            if (!open) setNameTarget(null);
          }}
          onSaved={onSaved}
        />
        <DashboardDeleteDialog
          dashboard={deleting}
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          onDeleted={(dashboard) => {
            setDeleting(null);
            onDeleted(dashboard);
          }}
        />
      </>
    ),
  };
}

export function DashboardActionsMenu({
  dashboard,
  actions,
  disabled,
}: {
  dashboard: Dashboard;
  actions: ReturnType<typeof useDashboardActions>;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={disabled}
          aria-label={t("common.actionsFor", {
            name: dashboardName(dashboard),
          })}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => actions.rename(dashboard)}>
          <Pencil />
          {t("common.rename")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.duplicate(dashboard)}>
          <Copy />
          {t("dashboards.duplicate")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => actions.remove(dashboard)}
        >
          <Trash2 />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
