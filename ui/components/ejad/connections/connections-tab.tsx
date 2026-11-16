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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  return (
    <span className="flex flex-wrap gap-1">
      {publish ? <Badge variant="secondary">Publish</Badge> : null}
      {subscribe ? <Badge variant="outline">Subscribe</Badge> : null}
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
  const [disconnecting, setDisconnecting] =
    React.useState<ConnectionRow | null>(null);
  const peerNoun = side === "device" ? "channel" : "device";
  const peerHref = (id: string) =>
    side === "device" ? `/channels/${id}` : `/devices/${id}`;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="size-4" />
          {side === "device" ? "Connected channels" : "Connected devices"}
        </CardTitle>
        <Button size="sm" disabled={readOnly} onClick={onConnect}>
          <Plus />
          {side === "device" ? "Connect to channel" : "Connect devices"}
        </Button>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="grid gap-2">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load connections</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : !rows?.length ? (
          <p className="text-sm text-muted-foreground">
            {side === "device"
              ? "This device is not connected to any channel yet. Connect it so it can publish or subscribe to messages."
              : "No devices are connected to this channel yet. Connect devices so they can publish or subscribe to its messages."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {side === "device" ? "Channel" : "Device"}
                </TableHead>
                <TableHead>Permissions</TableHead>
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
                          {row.peerId} (deleted {peerNoun})
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
                      Disconnect
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
      const { ok, message } = describeResult(result, "disconnect");
      (ok ? toast.success : toast.error)(message);
      queryClient.invalidateQueries({ queryKey: [CONNECTIONS_QUERY_KEY] });
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
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
          <DialogTitle>Disconnect “{deviceLabel}”?</DialogTitle>
          <DialogDescription>
            Choose what device “{deviceLabel}” should no longer be allowed to do
            on channel “{channelLabel}”. This takes effect immediately.
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
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending || types.length === 0}
            onClick={() => row && remove.mutate(row)}
          >
            {remove.isPending ? "Disconnecting…" : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
