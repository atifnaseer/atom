"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, Plus, Unlink } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { ConnectionTypePicker } from "@/components/ejad/connections/connection-type-picker";
import {
  describeResult,
  requestConnections,
} from "@/components/ejad/connections/request-connections";
import {
  CONNECTIONS_QUERY_KEY,
  type ConnectionRow,
} from "@/components/ejad/connections/use-connections";
import { ErrorAlert, toastError } from "@/components/ejad/error-alert";
import { useI18n } from "@/components/ejad/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ConnectionType } from "@/lib/ejad/connections";

export function ConnectionBadges({
  publish,
  subscribe,
}: {
  publish: boolean;
  subscribe: boolean;
}) {
  const { t } = useI18n();
  return (
    <span className="flex flex-wrap gap-1">
      {publish ? (
        <Badge variant="secondary">{t("connections.publish")}</Badge>
      ) : null}
      {subscribe ? (
        <Badge variant="outline">{t("connections.subscribe")}</Badge>
      ) : null}
    </span>
  );
}

function typesOf(row: Pick<ConnectionRow, "publish" | "subscribe">) {
  const types: ConnectionType[] = [];
  if (row.publish) types.push("publish");
  if (row.subscribe) types.push("subscribe");
  return types;
}

/**
 * The Connections tab body, shared by the device page (peers are channels)
 * and the channel page (peers are devices).
 */
export function ConnectionsTab({
  side,
  selfLabel,
  rows,
  isPending,
  error,
  readOnly,
  onConnect,
}: {
  side: "device" | "channel";
  selfLabel: string;
  rows: ConnectionRow[] | undefined;
  isPending: boolean;
  error: Error | null;
  readOnly?: boolean;
  onConnect: () => void;
}) {
  const { t } = useI18n();
  const [disconnecting, setDisconnecting] =
    React.useState<ConnectionRow | null>(null);
  const peerHref = (id: string) =>
    side === "device" ? `/channels/${id}` : `/devices/${id}`;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="size-4" />
          {side === "device"
            ? t("connections.connectedChannels")
            : t("connections.connectedDevices")}
        </CardTitle>
        <Button size="sm" disabled={readOnly} onClick={onConnect}>
          <Plus />
          {side === "device"
            ? t("connections.connectToChannel")
            : t("connections.connectDevices")}
        </Button>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="grid grid-cols-1 gap-2">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        ) : error ? (
          <ErrorAlert title={t("connections.loadFailed")} error={error} />
        ) : !rows?.length ? (
          <p className="text-sm text-muted-foreground">
            {side === "device"
              ? t("connections.emptyDevice")
              : t("connections.emptyChannel")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {side === "device"
                    ? t("page.channel.title")
                    : t("page.device.title")}
                </TableHead>
                <TableHead>{t("connections.permissions")}</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.peerId}>
                  <TableCell>
                    <div className="grid min-w-0 gap-0.5">
                      {row.peerExists ? (
                        <Link
                          href={peerHref(row.peerId)}
                          className="truncate font-medium hover:underline"
                        >
                          {row.peerLabel}
                        </Link>
                      ) : (
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {row.peerId} (
                          {side === "device"
                            ? t("connections.deletedChannel")
                            : t("connections.deletedDevice")}
                          )
                        </span>
                      )}
                      {row.peerDetail ? (
                        <code className="truncate font-mono text-xs text-muted-foreground">
                          {row.peerDetail}
                        </code>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ConnectionBadges
                      publish={row.publish}
                      subscribe={row.subscribe}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={readOnly}
                      onClick={() => setDisconnecting(row)}
                    >
                      <Unlink />
                      {t("connections.disconnect")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <DisconnectDialog
        side={side}
        selfLabel={selfLabel}
        row={disconnecting}
        onOpenChange={(open) => {
          if (!open) setDisconnecting(null);
        }}
      />
    </Card>
  );
}

function DisconnectDialog({
  side,
  selfLabel,
  row,
  onOpenChange,
}: {
  side: "device" | "channel";
  selfLabel: string;
  row: ConnectionRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [types, setTypes] = React.useState<ConnectionType[]>([]);
  React.useEffect(() => {
    if (row) setTypes(typesOf(row));
  }, [row]);

  const remove = useMutation({
    mutationFn: (target: ConnectionRow) =>
      requestConnections("DELETE", {
        deviceIds: [target.deviceId],
        channelIds: [target.channelId],
        types,
      }),
    onSuccess: (result) => {
      const { ok, message } = describeResult(result, "disconnect", t);
      (ok ? toast.success : toast.error)(message);
      queryClient.invalidateQueries({ queryKey: [CONNECTIONS_QUERY_KEY] });
      onOpenChange(false);
    },
    onError: (error) => toastError(error),
  });

  const [deviceLabel, channelLabel] =
    side === "device"
      ? [selfLabel, row?.peerLabel ?? ""]
      : [row?.peerLabel ?? "", selfLabel];

  return (
    <Dialog
      open={row !== null}
      onOpenChange={(open) => {
        if (!remove.isPending) onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("connections.disconnectTitle", { name: deviceLabel })}
          </DialogTitle>
          <DialogDescription>
            {t("connections.disconnectHint", {
              device: deviceLabel,
              channel: channelLabel,
            })}
          </DialogDescription>
        </DialogHeader>
        {row ? (
          <ConnectionTypePicker
            idPrefix="disconnect"
            value={types}
            onChange={setTypes}
            available={typesOf(row)}
            disabled={remove.isPending}
          />
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={remove.isPending}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending || types.length === 0}
            onClick={() => row && remove.mutate(row)}
          >
            {remove.isPending
              ? t("connections.disconnecting")
              : t("connections.disconnect")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
