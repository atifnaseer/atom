"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
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
  DELETE_GROUP_MUTATION,
  GROUP_MEMBER_COUNTS_QUERY,
  type ObjectGroup,
} from "@/lib/ejad/groups";
import { graphqlClient } from "@/lib/graphql/client";

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
  const { t } = useI18n();
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
      toast.success(t("groups.deleted", { name: target.name }));
      onDeleted(target);
    },
    onError: (error) => toastError(error),
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
            {t(blocked ? "groups.cannotDeleteTitle" : "groups.deleteTitle", {
              name: group?.name ?? "",
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {blocked
              ? t("groups.hasChildren", {
                  subgroups: t("groups.subgroups", { count: childCount }),
                })
              : devices || channels
                ? t("groups.membersLeave", {
                    devices: t("count.devices", { count: devices }),
                    channels: t("count.channels", { count: channels }),
                  })
                : t("groups.emptyDelete")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            {blocked ? t("common.close") : t("common.cancel")}
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
              {remove.isPending ? t("common.deleting") : t("groups.delete")}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
