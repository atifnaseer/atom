"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Terminal } from "lucide-react";
import * as React from "react";
import type { ConnectionRow } from "@/components/ejad/connections/use-connections";
import { CopyButton } from "@/components/ejad/copy-button";
import { deviceKeyAction } from "@/components/ejad/devices/device-keys-client";
import { toastError } from "@/components/ejad/error-alert";
import { useI18n } from "@/components/ejad/i18n-provider";
import { useAccess } from "@/components/ejad/use-access";
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
import { deviceCommands, type MessagingEndpoints } from "@/lib/ejad/messages";

const KEY_PLACEHOLDER = "<DEVICE_SECRET>";

async function revealNewestKey(deviceId: string): Promise<string> {
  const { sharedKey } = await deviceKeyAction(deviceId, "reveal-newest");
  return sharedKey.key;
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
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { can } = useAccess();
  const canReveal = can("manage");
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
    onError: (error) => toastError(error),
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
          title: t("commands.mqttPub"),
          value: commands.mqttPub,
          allowed: row?.publish,
        },
        {
          id: "sub",
          title: t("commands.mqttSub"),
          value: commands.mqttSub,
          allowed: row?.subscribe,
        },
        {
          id: "curl",
          title: t("commands.httpPub"),
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
          {t("commands.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4">
        {devices && available.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("commands.none")}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid min-w-56 gap-2">
                <Label htmlFor="commands-device">
                  {t("page.device.title")}
                </Label>
                <Select
                  value={deviceId}
                  onValueChange={(value) => {
                    setDeviceId(value);
                    setKey(null);
                  }}
                >
                  <SelectTrigger id="commands-device" className="w-full">
                    <SelectValue placeholder={t("send.selectDevice")} />
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
              {!canReveal ? null : key ? (
                <Button variant="outline" onClick={() => setKey(null)}>
                  <EyeOff />
                  {t("commands.hide")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled={!deviceId || reveal.isPending}
                  onClick={() => reveal.mutate()}
                >
                  <Eye />
                  {reveal.isPending
                    ? t("commands.revealing")
                    : t("commands.reveal")}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("commands.topic")}{" "}
              <code className="font-mono" dir="ltr">
                {commands?.topic}
              </code>
              .{" "}
              {key
                ? t("commands.includesSecret")
                : canReveal
                  ? t("commands.placeholder", { placeholder: KEY_PLACEHOLDER })
                  : t("commands.placeholderReadOnly", {
                      placeholder: KEY_PLACEHOLDER,
                    })}
            </p>
            {entries.map((entry) => (
              <div key={entry.id} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {entry.title}
                    {entry.allowed === false && (
                      <span className="ms-2 text-xs font-normal text-muted-foreground">
                        ({t("commands.notConnected")})
                      </span>
                    )}
                  </span>
                  <CopyButton
                    value={entry.value}
                    size="icon"
                    variant="ghost"
                    label={t("commands.copy", { title: entry.title })}
                  />
                </div>
                <pre
                  dir="ltr"
                  className="overflow-x-auto rounded-md border bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap break-all"
                >
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
