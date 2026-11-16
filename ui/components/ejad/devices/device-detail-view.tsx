"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, CircleOff, CirclePlay, Cpu, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { StatusBadge } from "@/components/crud/status-badge";
import { ConnectionsTab } from "@/components/ejad/connections/connections-tab";
import { DeviceConnectDialog } from "@/components/ejad/connections/device-connect-dialog";
import { useDeviceConnections } from "@/components/ejad/connections/use-connections";
import { CopyButton } from "@/components/ejad/copy-button";
import {
  DeviceDeleteDialog,
  DeviceStatusDialog,
} from "@/components/ejad/devices/device-confirm-dialogs";
import { DeviceCredentials } from "@/components/ejad/devices/device-credentials";
import { DEVICES_QUERY_KEY } from "@/components/ejad/devices/devices-view";
import { EntityAuditLog } from "@/components/entities/entity-audit-log";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonEditor } from "@/components/ui/json-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DisplayTags } from "@/components/view-tags";
import {
  DEVICE_QUERY,
  type Device,
  deviceMetadata,
  deviceTags,
  isDeviceEnabled,
} from "@/lib/ejad/devices";
import { graphqlClient, graphqlErrorCode } from "@/lib/graphql/client";

const TABS = ["overview", "credentials", "connections", "audit"] as const;
type TabValue = (typeof TABS)[number];

export function DeviceDetailView({
  deviceId,
  workspaceId,
}: {
  deviceId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const tabParam = searchParams.get("tab");
  const tab: TabValue = TABS.includes(tabParam as TabValue)
    ? (tabParam as TabValue)
    : "overview";

  const [toggling, setToggling] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const queryKey = ["ejad-device", deviceId];
  const { data, error, isPending } = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      graphqlClient<{ entity: Device }>({
        query: DEVICE_QUERY,
        variables: { id: deviceId },
        signal,
      }),
    retry: (count, err) => graphqlErrorCode(err) !== "NOT_FOUND" && count < 2,
  });
  const device = data?.entity;

  function setTab(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "overview") params.delete("tab");
    else params.set("tab", value);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: [DEVICES_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: ["object-audit"] });
  }

  const backLink = (
    <Button asChild variant="ghost" size="sm" className="w-fit px-2">
      <Link href="/devices">
        <ArrowLeft />
        Devices
      </Link>
    </Button>
  );

  if (isPending) {
    return (
      <div className="grid gap-6">
        {backLink}
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const notHere =
    device && (device.kind !== "device" || device.tenantId !== workspaceId);
  if (error || !device || notHere) {
    const notFound = graphqlErrorCode(error) === "NOT_FOUND" || notHere;
    return (
      <div className="grid gap-6">
        {backLink}
        <Alert variant="destructive">
          <AlertTitle>
            {notFound ? "Device not found" : "Could not load the device"}
          </AlertTitle>
          <AlertDescription>
            {notFound
              ? "There is no such device in the selected workspace."
              : error?.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const enabled = isDeviceEnabled(device);
  const readOnly = Boolean(device.managedBy);

  return (
    <div className="grid gap-6">
      {backLink}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Cpu className="size-6 shrink-0 text-muted-foreground" />
            <span className="truncate">{device.name}</span>
            <StatusBadge value={device.status} />
          </h1>
          <code className="font-mono text-xs text-muted-foreground">
            {device.id}
          </code>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={readOnly}
            onClick={() => setToggling(true)}
          >
            {enabled ? <CircleOff /> : <CirclePlay />}
            {enabled ? "Disable" : "Enable"}
          </Button>
          <Button
            variant="destructive"
            disabled={readOnly}
            onClick={() => setDeleting(true)}
          >
            <Trash2 />
            Delete
          </Button>
        </div>
      </section>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <Overview device={device} />
        </TabsContent>
        <TabsContent value="credentials" className="mt-4">
          <DeviceCredentials
            deviceId={device.id}
            deviceName={device.name}
            readOnly={readOnly}
          />
        </TabsContent>
        <TabsContent value="connections" className="mt-4">
          <DeviceConnections
            workspaceId={workspaceId}
            deviceId={device.id}
            deviceName={device.name}
            readOnly={readOnly}
          />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <EntityAuditLog entityId={device.id} />
        </TabsContent>
      </Tabs>

      <DeviceStatusDialog
        device={toggling ? device : null}
        onOpenChange={setToggling}
        onDone={() => {
          setToggling(false);
          refresh();
        }}
      />
      <DeviceDeleteDialog
        device={deleting ? device : null}
        onOpenChange={setDeleting}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: [DEVICES_QUERY_KEY] });
          router.push("/devices");
        }}
      />
    </div>
  );
}

function Overview({ device }: { device: Device }) {
  const tags = deviceTags(device);
  const metadata = deviceMetadata(device);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{device.name}</dd>
            <dt className="text-muted-foreground">Device ID</dt>
            <dd className="flex min-w-0 items-center gap-1">
              <code className="truncate font-mono text-xs">{device.id}</code>
              <CopyButton
                value={device.id}
                size="icon"
                variant="ghost"
                label="Copy device ID"
              />
            </dd>
            <dt className="text-muted-foreground">External ID</dt>
            <dd>
              {device.externalId ? (
                <code className="font-mono text-xs">{device.externalId}</code>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge value={device.status} />
            </dd>
            <dt className="text-muted-foreground">Tags</dt>
            <dd>
              {tags.length ? (
                <DisplayTags tags={tags} className="[&>*]:mx-0" />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </dd>
            <dt className="text-muted-foreground">Created</dt>
            <dd>{format(new Date(device.createdAt), "d MMM yyyy, HH:mm")}</dd>
            <dt className="text-muted-foreground">Updated</dt>
            <dd>
              {device.updatedAt
                ? format(new Date(device.updatedAt), "d MMM yyyy, HH:mm")
                : "—"}
            </dd>
          </dl>
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-base">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {Object.keys(metadata).length ? (
            <JsonEditor value={JSON.stringify(metadata, null, 2)} />
          ) : (
            <p className="text-sm text-muted-foreground">No metadata.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DeviceConnections({
  workspaceId,
  deviceId,
  deviceName,
  readOnly,
}: {
  workspaceId: string;
  deviceId: string;
  deviceName: string;
  readOnly: boolean;
}) {
  const [connecting, setConnecting] = React.useState(false);
  const { data, error, isPending } = useDeviceConnections(
    workspaceId,
    deviceId,
  );
  return (
    <>
      <ConnectionsTab
        side="device"
        selfLabel={deviceName}
        rows={data}
        isPending={isPending}
        error={error}
        readOnly={readOnly}
        onConnect={() => setConnecting(true)}
      />
      <DeviceConnectDialog
        open={connecting}
        onOpenChange={setConnecting}
        workspaceId={workspaceId}
        deviceId={deviceId}
        deviceName={deviceName}
      />
    </>
  );
}
