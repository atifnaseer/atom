"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { toastError } from "@/components/ejad/error-alert";
import { useT } from "@/components/ejad/i18n-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  type Dashboard,
  DELETE_DASHBOARD_MUTATION,
  dashboardName,
} from "@/lib/ejad/dashboards";
import { graphqlClient } from "@/lib/graphql/client";

/** Deletes a dashboard. Its channels and stored messages are untouched. */
export function DashboardDeleteDialog({
  dashboard,
  onOpenChange,
  onDeleted,
}: {
  dashboard: Dashboard | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (dashboard: Dashboard) => void;
}) {
  const t = useT();
  const remove = useMutation({
    mutationFn: async (target: Dashboard) => {
      await graphqlClient({
        query: DELETE_DASHBOARD_MUTATION,
        variables: { id: target.id },
      });
      return target;
    },
    onSuccess: (target) => {
      toast.success(t("dashboards.deleted", { name: dashboardName(target) }));
      onDeleted(target);
    },
    onError: (error) => toastError(error),
  });

  return (
    <AlertDialog
      open={dashboard !== null}
      onOpenChange={(open) => {
        if (!remove.isPending) onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("dashboards.deleteTitle", {
              name: dashboard ? dashboardName(dashboard) : "",
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("dashboards.deleteHint")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (dashboard) remove.mutate(dashboard);
            }}
          >
            {remove.isPending ? t("common.deleting") : t("dashboards.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
