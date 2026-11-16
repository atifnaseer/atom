"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import type { ConnectionRow } from "@/components/ejad/connections/use-connections";
import { MESSAGES_QUERY_KEY } from "@/components/ejad/messages/use-messages";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SendMessageInput } from "@/lib/ejad/messages";

async function postMessage(input: SendMessageInput) {
  const response = await fetch("/api/ejad/messages/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    topic?: string;
  };
  if (!response.ok) {
    throw new Error(
      payload.message ?? `Request failed with status ${response.status}`,
    );
  }
  return payload;
}

/**
 * Publishes one SenML record as a connected device. The server reveals the
 * device key and posts to the HTTP adapter; the key never reaches the page.
 */
export function SendMessageDialog({
  open,
  onOpenChange,
  channelId,
  channelName,
  devices,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  channelName: string;
  /** Devices connected to the channel (only publishers are offered). */
  devices: ConnectionRow[] | undefined;
}) {
  const queryClient = useQueryClient();
  const publishers = React.useMemo(
    () => (devices ?? []).filter((row) => row.publish && row.peerExists),
    [devices],
  );
  const [deviceId, setDeviceId] = React.useState("");
  const [name, setName] = React.useState("");
  const [value, setValue] = React.useState("");
  const [unit, setUnit] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setDeviceId((current) =>
      publishers.some((row) => row.peerId === current)
        ? current
        : (publishers[0]?.peerId ?? ""),
    );
  }, [open, publishers]);

  const send = useMutation({
    mutationFn: () =>
      postMessage({ channelId, deviceId, name, value, unit: unit.trim() }),
    onSuccess: (result) => {
      toast.success(
        `Message sent${result.topic ? ` to ${result.topic}` : ""}. It shows up once the rules engine saves it.`,
      );
      queryClient.invalidateQueries({ queryKey: [MESSAGES_QUERY_KEY] });
      setValue("");
    },
    onError: (error) => toast.error(error.message),
  });

  const ready = Boolean(deviceId && name.trim() && value.trim());

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!send.isPending) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send message</DialogTitle>
          <DialogDescription>
            Publish a SenML record to “{channelName}” over HTTP as one of its
            connected devices.
          </DialogDescription>
        </DialogHeader>
        {devices && publishers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No device may publish to this channel. Connect a device with the
            publish permission on the Connections tab first.
          </p>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) send.mutate();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="send-device">Device</Label>
              <Select
                value={deviceId}
                onValueChange={setDeviceId}
                disabled={send.isPending}
              >
                <SelectTrigger id="send-device" className="w-full">
                  <SelectValue placeholder="Select a device" />
                </SelectTrigger>
                <SelectContent>
                  {publishers.map((row) => (
                    <SelectItem key={row.peerId} value={row.peerId}>
                      {row.peerLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="send-name">Name</Label>
              <Input
                id="send-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="temperature"
                autoComplete="off"
                disabled={send.isPending}
              />
            </div>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
              <div className="grid gap-2">
                <Label htmlFor="send-value">Value</Label>
                <Input
                  id="send-value"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="21.5"
                  autoComplete="off"
                  disabled={send.isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="send-unit">Unit</Label>
                <Input
                  id="send-unit"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  placeholder="Cel"
                  autoComplete="off"
                  disabled={send.isPending}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A number is sent as a numeric value, true/false as a boolean and
              anything else as text.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={send.isPending}
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button type="submit" disabled={send.isPending || !ready}>
                {send.isPending ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
