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
  const remove = useMutation({
    mutationFn: async (target: Pending) => {
      await graphqlClient({
        query: DELETE_CHANNEL_MUTATION,
        variables: { id: target.id },
      });
      return target;
    },
    onSuccess: (target) => {
      toast.success(`Channel “${channelLabel(target)}” deleted`);
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
            Delete channel “{channel ? channelLabel(channel) : ""}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Devices can no longer publish or subscribe to this channel
            {route ? ` (route “${route}”)` : ""} and it is removed from this
            workspace. A platform administrator can restore it until it is
            purged.
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
              if (channel) remove.mutate(channel);
            }}
          >
            {remove.isPending ? "Deleting…" : "Delete channel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
