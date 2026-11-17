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
  type Channel,
  channelLabel,
  channelRoute,
  DELETE_CHANNEL_MUTATION,
} from "@/lib/ejad/channels";
import { graphqlClient } from "@/lib/graphql/client";

type Pending = Pick<Channel, "id" | "name" | "attributes">;

export function ChannelDeleteDialog({
  channel,
  onOpenChange,
  onDeleted,
}: {
  channel: Pending | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (channel: Pending) => void;
}) {
  const { t } = useI18n();
  const remove = useMutation({
    mutationFn: async (target: Pending) => {
      await graphqlClient({
        query: DELETE_CHANNEL_MUTATION,
        variables: { id: target.id },
      });
      return target;
    },
    onSuccess: (target) => {
      toast.success(t("channels.deleted", { name: channelLabel(target) }));
      onDeleted(target);
    },
    onError: (error) => toastError(error),
  });

  const route = channel ? channelRoute(channel) : null;

  return (
    <AlertDialog
      open={channel !== null}
      onOpenChange={(open) => {
        if (!remove.isPending) onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("channels.deleteTitle", {
              name: channel ? channelLabel(channel) : "",
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {route
              ? t("channels.deleteHintRoute", { route })
              : t("channels.deleteHint")}
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
              if (channel) remove.mutate(channel);
            }}
          >
            {remove.isPending ? t("common.deleting") : t("channels.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
