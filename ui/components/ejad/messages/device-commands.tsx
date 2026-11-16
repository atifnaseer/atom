"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Terminal } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import type { ConnectionRow } from "@/components/ejad/connections/use-connections";
import { CopyButton } from "@/components/ejad/copy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CREDENTIALS_QUERY,
  type Credential,
  REVEAL_SHARED_KEY_MUTATION,
  type SharedKey,
} from "@/lib/ejad/devices";
import { deviceCommands, type MessagingEndpoints } from "@/lib/ejad/messages";
import { graphqlClient } from "@/lib/graphql/client";

const KEY_PLACEHOLDER = "<DEVICE_SECRET>";

async function revealNewestKey(deviceId: string): Promise<string> {
  const { credentials } = await graphqlClient<{
    credentials: { items: Credential[] };
  }>({ query: CREDENTIALS_QUERY, variables: { entityId: deviceId } });
  const now = Date.now();
  const credential = credentials.items
    .filter(
      (c) =>
        c.kind === "shared_key" &&
        c.status === "active" &&
        (!c.expiresAt || Date.parse(c.expiresAt) > now),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!credential) throw new Error("This device has no active secret.");
  const { revealSharedKey } = await graphqlClient<{
    revealSharedKey: SharedKey;
  }>({
    query: REVEAL_SHARED_KEY_MUTATION,
    variables: { entityId: deviceId, credentialId: credential.id },
  });
  return revealSharedKey.key;
}

/**
 * Ready-to-run mosquitto_pub, mosquitto_sub and curl commands for one
 * connected device, using the workspace and channel routes. The secret stays
 * a placeholder until "Reveal secret" is clicked (an audited action).
 */
export function DeviceCommands({
  devices,
  workspaceRoute,
  channelRoute,
  endpoints,
}: {
  devices: ConnectionRow[] | undefined;
  workspaceRoute: string;
  channelRoute: string;
  endpoints: MessagingEndpoints;
}) {
  const queryClient = useQueryClient();
  const available = React.useMemo(
    () => (devices ?? []).filter((row) => row.peerExists),
    [devices],
  );
  const [deviceId, setDeviceId] = React.useState("");
  const [key, setKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!available.some((row) => row.peerId === deviceId)) {
      setDeviceId(available[0]?.peerId ?? "");
      setKey(null);
    }
  }, [available, deviceId]);

  const reveal = useMutation({
    mutationFn: () => revealNewestKey(deviceId),
    onSuccess: (value) => {
      setKey(value);
      queryClient.invalidateQueries({ queryKey: ["object-audit"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const row = available.find((r) => r.peerId === deviceId);
  const commands = deviceId
    ? deviceCommands({
        endpoints,
        workspaceRoute,
        channelRoute,
        deviceId,
        key: key ?? KEY_PLACEHOLDER,
      })
    : null;

  const entries = commands
    ? [
        {
          id: "pub",
          title: "Publish over MQTT",
          value: commands.mqttPub,
          allowed: row?.publish,
        },
        {
          id: "sub",
          title: "Subscribe over MQTT",
          value: commands.mqttSub,
          allowed: row?.subscribe,
        },
        {
          id: "curl",
          title: "Publish over HTTP",
          value: commands.curl,
          allowed: row?.publish,
        },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="size-4" />
          Device commands
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {devices && available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Connect a device to this channel to get commands for it.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid min-w-56 gap-2">
                <Label htmlFor="commands-device">Device</Label>
                <Select
                  value={deviceId}
                  onValueChange={(value) => {
                    setDeviceId(value);
                    setKey(null);
                  }}
                >
                  <SelectTrigger id="commands-device" className="w-full">
                    <SelectValue placeholder="Select a device" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((r) => (
                      <SelectItem key={r.peerId} value={r.peerId}>
                        {r.peerLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {key ? (
                <Button variant="outline" onClick={() => setKey(null)}>
                  <EyeOff />
                  Hide secret
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled={!deviceId || reveal.isPending}
                  onClick={() => reveal.mutate()}
                >
                  <Eye />
                  {reveal.isPending ? "Revealing…" : "Reveal secret"}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Topic <code className="font-mono">{commands?.topic}</code>.{" "}
              {key
                ? "The commands include the device secret; treat them as a password."
                : `The secret is shown as ${KEY_PLACEHOLDER} until you reveal it. Revealing is recorded in the audit log.`}
            </p>
            {entries.map((entry) => (
              <div key={entry.id} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {entry.title}
                    {entry.allowed === false && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (this device is not connected for this)
                      </span>
                    )}
                  </span>
                  <CopyButton
                    value={entry.value}
                    size="icon"
                    variant="ghost"
                    label={`Copy ${entry.title.toLowerCase()} command`}
                  />
                </div>
                <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap break-all">
                  {entry.value}
                </pre>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
