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
  DELETE_DEVICE_MUTATION,
  type Device,
  isDeviceEnabled,
  SET_DEVICE_STATUS_MUTATION,
} from "@/lib/ejad/devices";
import { graphqlClient } from "@/lib/graphql/client";

type Pending = Pick<Device, "id" | "name" | "status">;

/** Confirms and toggles a device between enabled (active) and disabled. */
export function DeviceStatusDialog({
  device,
  onOpenChange,
  onDone,
}: {
  device: Pending | null;
  onOpenChange: (open: boolean) => void;
  onDone: (device: Device) => void;
}) {
  const enabling = device ? !isDeviceEnabled(device) : false;
  const toggle = useMutation({
    mutationFn: async (target: Pending) => {
      const data = await graphqlClient<{ updateEntity: Device }>({
        query: SET_DEVICE_STATUS_MUTATION,
        variables: {
          id: target.id,
          status: isDeviceEnabled(target) ? "inactive" : "active",
        },
      });
      return data.updateEntity;
    },
    onSuccess: (updated) => {
      toast.success(
        `Device “${updated.name}” ${isDeviceEnabled(updated) ? "enabled" : "disabled"}`,
      );
      onDone(updated);
    },
    onError: (error) => toastError(error),
  });

  return (
    <AlertDialog
      open={device !== null}
      onOpenChange={(open) => {
        if (!toggle.isPending) onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {enabling ? "Enable" : "Disable"} device “{device?.name}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {enabling
              ? "The device can authenticate with its secret and send messages again."
              : "The device can no longer authenticate or send messages until it is enabled again. Its secrets are kept."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={toggle.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant={enabling ? "default" : "destructive"}
            disabled={toggle.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (device) toggle.mutate(device);
            }}
          >
            {toggle.isPending
              ? enabling
                ? "Enabling…"
                : "Disabling…"
              : enabling
                ? "Enable device"
                : "Disable device"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeviceDeleteDialog({
  device,
  onOpenChange,
  onDeleted,
}: {
  device: Pending | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (device: Pending) => void;
}) {
  const remove = useMutation({
    mutationFn: async (target: Pending) => {
      await graphqlClient({
        query: DELETE_DEVICE_MUTATION,
        variables: { id: target.id },
      });
      return target;
    },
    onSuccess: (target) => {
      toast.success(`Device “${target.name}” deleted`);
      onDeleted(target);
    },
    onError: (error) => toastError(error),
  });

  return (
    <AlertDialog
      open={device !== null}
      onOpenChange={(open) => {
        if (!remove.isPending) onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete device “{device?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The device and its secrets stop working immediately and it is
            removed from this workspace. A platform administrator can restore it
            until it is purged.
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
              if (device) remove.mutate(device);
            }}
          >
            {remove.isPending ? "Deleting…" : "Delete device"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
