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
  const { t } = useI18n();
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
        t(isDeviceEnabled(updated) ? "devices.enabled" : "devices.disabled", {
          name: updated.name,
        }),
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
            {t(enabling ? "devices.enableTitle" : "devices.disableTitle", {
              name: device?.name ?? "",
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {enabling ? t("devices.enableHint") : t("devices.disableHint")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={toggle.isPending}>
            {t("common.cancel")}
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
                ? t("devices.enabling")
                : t("devices.disabling")
              : enabling
                ? t("devices.enable")
                : t("devices.disable")}
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
  const { t } = useI18n();
  const remove = useMutation({
    mutationFn: async (target: Pending) => {
      await graphqlClient({
        query: DELETE_DEVICE_MUTATION,
        variables: { id: target.id },
      });
      return target;
    },
    onSuccess: (target) => {
      toast.success(t("devices.deleted", { name: target.name }));
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
          <AlertDialogTitle>
            {t("devices.deleteTitle", { name: device?.name ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("devices.deleteHint")}
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
              if (device) remove.mutate(device);
            }}
          >
            {remove.isPending ? t("common.deleting") : t("devices.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
