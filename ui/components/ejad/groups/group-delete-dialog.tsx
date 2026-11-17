"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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
  DELETE_GROUP_MUTATION,
  GROUP_MEMBER_COUNTS_QUERY,
  type ObjectGroup,
} from "@/lib/ejad/groups";
import { graphqlClient } from "@/lib/graphql/client";

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * Deletes a group. A group with subgroups cannot be deleted: Atom would
 * leave the subgroups pointing at a deleted parent, so they must be moved
 * or deleted first.
 */
export function GroupDeleteDialog({
  workspaceId,
  group,
  childCount,
  onOpenChange,
  onDeleted,
}: {
  workspaceId: string;
  group: ObjectGroup | null;
  childCount: number;
  onOpenChange: (open: boolean) => void;
  onDeleted: (group: ObjectGroup) => void;
}) {
  const counts = useQuery({
    queryKey: ["ejad-group-member-counts", group?.id],
    enabled: group !== null && childCount === 0,
    queryFn: ({ signal }) =>
      graphqlClient<{
        entities: { total: number };
        resources: { total: number };
      }>({
        query: GROUP_MEMBER_COUNTS_QUERY,
        variables: { tenantId: workspaceId, groupId: group?.id },
        signal,
      }),
  });

  const remove = useMutation({
    mutationFn: async (target: ObjectGroup) => {
      await graphqlClient({
        query: DELETE_GROUP_MUTATION,
        variables: { id: target.id },
      });
      return target;
    },
    onSuccess: (target) => {
      toast.success(`Group “${target.name}” deleted`);
      onDeleted(target);
    },
    onError: (error) => toast.error(error.message),
  });

  const blocked = childCount > 0;
  const devices = counts.data?.entities.total ?? 0;
  const channels = counts.data?.resources.total ?? 0;

  return (
    <AlertDialog
      open={group !== null}
      onOpenChange={(open) => {
        if (!remove.isPending) onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {blocked ? "Cannot delete" : "Delete"} group “{group?.name}”
            {blocked ? "" : "?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {blocked
              ? `It contains ${plural(childCount, "subgroup")}. Move or delete them first.`
              : devices || channels
                ? `Its ${plural(devices, "device")} and ${plural(channels, "channel")} leave the group; they are not deleted.`
                : "The group is empty. Devices and channels are never deleted with a group."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            {blocked ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {blocked ? null : (
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending || counts.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (group) remove.mutate(group);
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete group"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
