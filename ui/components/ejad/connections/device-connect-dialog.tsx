"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { ConnectionTypePicker } from "@/components/ejad/connections/connection-type-picker";
import {
  describeResult,
  requestConnections,
} from "@/components/ejad/connections/request-connections";
import { CONNECTIONS_QUERY_KEY } from "@/components/ejad/connections/use-connections";
import { toastError } from "@/components/ejad/error-alert";
import { useI18n } from "@/components/ejad/i18n-provider";
import { AsyncCombobox, type ComboPage } from "@/components/ui/async-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  CHANNELS_QUERY,
  type Channel,
  channelLabel,
  channelRoute,
} from "@/lib/ejad/channels";
import type { ConnectionType } from "@/lib/ejad/connections";
import { graphqlClient } from "@/lib/graphql/client";

const PAGE = 25;

/** "Connect to channel" from the device page: one channel, either type. */
export function DeviceConnectDialog({
  open,
  onOpenChange,
  workspaceId,
  deviceId,
  deviceName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  deviceId: string;
  deviceName: string;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [channelId, setChannelId] = React.useState("");
  const [types, setTypes] = React.useState<ConnectionType[]>([
    "publish",
    "subscribe",
  ]);

  React.useEffect(() => {
    if (open) {
      setChannelId("");
      setTypes(["publish", "subscribe"]);
    }
  }, [open]);

  const fetchPage = React.useCallback(
    async ({
      search,
      offset,
      signal,
    }: {
      search: string;
      offset: number;
      signal?: AbortSignal;
    }): Promise<ComboPage> => {
      const { resources } = await graphqlClient<{
        resources: { total: number; items: Channel[] };
      }>({
        query: CHANNELS_QUERY,
        variables: {
          tenantId: workspaceId,
          q: search || undefined,
          limit: PAGE,
          offset,
        },
        signal,
      });
      const next = offset + resources.items.length;
      return {
        items: resources.items.map((channel) => ({
          value: channel.id,
          label: channelLabel(channel),
          detail: channelRoute(channel) ?? undefined,
        })),
        nextOffset: next < resources.total ? next : null,
      };
    },
    [workspaceId],
  );

  const connect = useMutation({
    mutationFn: () =>
      requestConnections("POST", {
        deviceIds: [deviceId],
        channelIds: [channelId],
        types,
      }),
    onSuccess: (result) => {
      const { ok, message } = describeResult(result, "connect", t);
      (ok ? toast.success : toast.error)(message);
      queryClient.invalidateQueries({ queryKey: [CONNECTIONS_QUERY_KEY] });
      if (ok) onOpenChange(false);
    },
    onError: (error) => toastError(error),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!connect.isPending) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("connections.connectToChannel")}</DialogTitle>
          <DialogDescription>
            {t("connections.deviceHint", { name: deviceName })}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (channelId && types.length) connect.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="connect-channel">{t("page.channel.title")}</Label>
            <AsyncCombobox
              id="connect-channel"
              value={channelId}
              onChange={setChannelId}
              queryKey={["ejad-connect-channels", workspaceId]}
              fetchPage={fetchPage}
              placeholder={t("connections.selectChannel")}
              searchPlaceholder={t("connections.searchChannels")}
              emptyText={t("connections.noChannels")}
              disabled={connect.isPending}
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label>{t("connections.permissions")}</Label>
            <ConnectionTypePicker
              idPrefix="connect-device"
              value={types}
              onChange={setTypes}
              disabled={connect.isPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={connect.isPending}
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={connect.isPending || !channelId || !types.length}
            >
              {connect.isPending
                ? t("connections.connecting")
                : t("connections.connect")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
