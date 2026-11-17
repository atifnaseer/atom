"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { toastError } from "@/components/ejad/error-alert";
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
  const remove = useMutation({
    mutationFn: async (target: Dashboard) => {
      await graphqlClient({
        query: DELETE_DASHBOARD_MUTATION,
        variables: { id: target.id },
      });
      return target;
    },
    onSuccess: (target) => {
      toast.success(`Dashboard “${dashboardName(target)}” deleted`);
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
            Delete dashboard “{dashboard ? dashboardName(dashboard) : ""}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Its widgets are removed. Channels and their stored messages are not
            affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (dashboard) remove.mutate(dashboard);
            }}
          >
            {remove.isPending ? "Deleting…" : "Delete dashboard"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
