"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { ConnectionTypePicker } from "@/components/ejad/connections/connection-type-picker";
import { ConnectionBadges } from "@/components/ejad/connections/connections-tab";
import {
  describeResult,
  requestConnections,
} from "@/components/ejad/connections/request-connections";
import {
  CONNECTIONS_QUERY_KEY,
  type ConnectionRow,
} from "@/components/ejad/connections/use-connections";
import { toastError } from "@/components/ejad/error-alert";
import { useI18n } from "@/components/ejad/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type ConnectionType,
  MAX_CONNECTION_TARGETS,
} from "@/lib/ejad/connections";
import { DEVICES_QUERY, type Device } from "@/lib/ejad/devices";
import { errorText } from "@/lib/ejad/errors";
import { graphqlClient } from "@/lib/graphql/client";

const PAGE = 50;
const MAX_DEVICES_PER_CONNECT = MAX_CONNECTION_TARGETS;

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** "Connect devices" from the channel page: many devices, either type. */
export function ChannelConnectDialog({
  open,
  onOpenChange,
  workspaceId,
  channelId,
  channelName,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  channelId: string;
  channelName: string;
  /** Current connections, to mark devices that are already connected. */
  existing: ConnectionRow[] | undefined;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const q = useDebounced(search.trim());
  const [selected, setSelected] = React.useState<Map<string, string>>(
    new Map(),
  );
  const [types, setTypes] = React.useState<ConnectionType[]>([
    "publish",
    "subscribe",
  ]);

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setSelected(new Map());
      setTypes(["publish", "subscribe"]);
    }
  }, [open]);

  const connectedById = React.useMemo(
    () => new Map((existing ?? []).map((row) => [row.deviceId, row])),
    [existing],
  );

  const devices = useInfiniteQuery({
    queryKey: ["ejad-connect-devices", workspaceId, q],
    enabled: open,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const { entities } = await graphqlClient<{
        entities: { total: number; items: Device[] };
      }>({
        query: DEVICES_QUERY,
        variables: {
          tenantId: workspaceId,
          q: q || undefined,
          limit: PAGE,
          offset: pageParam,
        },
        signal,
      });
      return { ...entities, offset: pageParam };
    },
    getNextPageParam: (last) => {
      const next = last.offset + last.items.length;
      return next < last.total ? next : undefined;
    },
  });
  const items = devices.data?.pages.flatMap((page) => page.items) ?? [];

  function toggle(device: Device, checked: boolean) {
    setSelected((current) => {
      const next = new Map(current);
      if (checked) {
        if (next.size >= MAX_DEVICES_PER_CONNECT) {
          toast.error(
            t("connections.maxDevices", { count: MAX_DEVICES_PER_CONNECT }),
          );
          return current;
        }
        next.set(device.id, device.name);
      } else next.delete(device.id);
      return next;
    });
  }

  const connect = useMutation({
    mutationFn: () =>
      requestConnections("POST", {
        deviceIds: [...selected.keys()],
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("connections.connectDevices")}</DialogTitle>
          <DialogDescription>
            {t("connections.channelHint", { name: channelName })}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid min-w-0 gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (selected.size && types.length) connect.mutate();
          }}
        >
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="connect-devices-search">{t("nav.devices")}</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="connect-devices-search"
                className="ps-8"
                placeholder={t("connections.searchDevices")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                disabled={connect.isPending}
              />
            </div>
            {selected.size > 0 ? (
              <div className="flex flex-wrap gap-1">
                {[...selected].map(([id, name]) => (
                  <Badge key={id} variant="secondary" className="gap-1 pe-1">
                    <span className="max-w-40 truncate">{name}</span>
                    <button
                      type="button"
                      aria-label={t("common.removeName", { name })}
                      className="rounded-sm opacity-70 hover:opacity-100"
                      onClick={() =>
                        setSelected((current) => {
                          const next = new Map(current);
                          next.delete(id);
                          return next;
                        })
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
            <ScrollArea className="h-64 rounded-md border">
              <div className="grid p-1">
                {devices.isPending ? (
                  <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    {t("connections.loadingDevices")}
                  </p>
                ) : devices.error ? (
                  <p className="p-3 text-sm text-destructive">
                    {errorText(devices.error)}
                  </p>
                ) : items.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    {t("connections.noDevices")}
                  </p>
                ) : (
                  items.map((device) => {
                    const id = `connect-device-${device.id}`;
                    const connected = connectedById.get(device.id);
                    return (
                      <label
                        key={device.id}
                        htmlFor={id}
                        className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 hover:bg-muted"
                      >
                        <Checkbox
                          id={id}
                          checked={selected.has(device.id)}
                          disabled={connect.isPending}
                          onCheckedChange={(checked) =>
                            toggle(device, checked === true)
                          }
                        />
                        <span className="grid min-w-0 flex-1 gap-0.5">
                          <span className="truncate text-sm font-medium">
                            {device.name}
                          </span>
                          {device.externalId ? (
                            <code className="truncate font-mono text-xs text-muted-foreground">
                              {device.externalId}
                            </code>
                          ) : null}
                        </span>
                        {connected ? (
                          <ConnectionBadges
                            publish={connected.publish}
                            subscribe={connected.subscribe}
                          />
                        ) : null}
                      </label>
                    );
                  })
                )}
                {devices.hasNextPage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="m-1"
                    disabled={devices.isFetchingNextPage}
                    onClick={() => devices.fetchNextPage()}
                  >
                    {devices.isFetchingNextPage
                      ? t("common.loadingEllipsis")
                      : t("common.loadMore")}
                  </Button>
                ) : null}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {t("common.rowsSelected", { count: selected.size })}.{" "}
              {t("connections.badgesHint")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label>{t("connections.permissions")}</Label>
            <ConnectionTypePicker
              idPrefix="connect-channel"
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
              disabled={connect.isPending || !selected.size || !types.length}
            >
              {connect.isPending
                ? t("connections.connecting")
                : selected.size
                  ? t("connections.connectN", { count: selected.size })
                  : t("connections.connectDevices")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
