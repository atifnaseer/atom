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
  const remove = useMutation({
    mutationFn: async (target: Workspace) => {
      await graphqlClient({
        query: DELETE_WORKSPACE_MUTATION,
        variables: { id: target.id },
      });
      return target;
    },
    onSuccess: (target) => {
      toast.success(`Workspace “${target.name}” deleted`);
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
            Delete workspace “{workspace?.name}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Members lose access and devices in{" "}
            <span className="font-medium text-foreground">
              {workspace?.name}
            </span>{" "}
            can no longer connect or send messages. A platform administrator can
            restore it until it is purged.
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
              // Keep the dialog open until the delete finishes.
              event.preventDefault();
              if (workspace) remove.mutate(workspace);
            }}
          >
            {remove.isPending ? "Deleting…" : "Delete workspace"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
