"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { toastError } from "@/components/ejad/error-alert";
import { useI18n } from "@/components/ejad/i18n-provider";
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
  DELETE_WORKSPACE_MUTATION,
  type Workspace,
} from "@/lib/ejad/workspaces";
import { graphqlClient } from "@/lib/graphql/client";

export function WorkspaceDeleteDialog({
  workspace,
  onOpenChange,
  onDeleted,
}: {
  /** The workspace to delete; null keeps the dialog closed. */
  workspace: Workspace | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (workspace: Workspace) => void;
}) {
  const { t } = useI18n();
  const remove = useMutation({
    mutationFn: async (target: Workspace) => {
      await graphqlClient({
        query: DELETE_WORKSPACE_MUTATION,
        variables: { id: target.id },
      });
      return target;
    },
    onSuccess: (target) => {
      toast.success(t("workspaces.deleted", { name: target.name }));
      onDeleted(target);
    },
    onError: (error) => toastError(error),
  });

  return (
    <AlertDialog
      open={workspace !== null}
      onOpenChange={(open) => {
        if (!remove.isPending) onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("workspaces.deleteTitle", { name: workspace?.name ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("workspaces.deleteHint", { name: workspace?.name ?? "" })}
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
              // Keep the dialog open until the delete finishes.
              event.preventDefault();
              if (workspace) remove.mutate(workspace);
            }}
          >
            {remove.isPending ? t("common.deleting") : t("workspaces.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
