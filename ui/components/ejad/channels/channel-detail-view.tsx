"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Radio, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { ChannelDeleteDialog } from "@/components/ejad/channels/channel-delete-dialog";
import { CHANNELS_QUERY_KEY } from "@/components/ejad/channels/channels-view";
import { useWorkspaceRoute } from "@/components/ejad/channels/use-workspace-route";
import { ChannelConnectDialog } from "@/components/ejad/connections/channel-connect-dialog";
import { ConnectionsTab } from "@/components/ejad/connections/connections-tab";
import { useChannelConnections } from "@/components/ejad/connections/use-connections";
import { CopyButton } from "@/components/ejad/copy-button";
import { LoadProblem } from "@/components/ejad/error-alert";
import { ChannelMessages } from "@/components/ejad/messages/channel-messages";
import { StoreMessagesSwitch } from "@/components/ejad/messages/store-messages-switch";
import { PageHeader } from "@/components/ejad/page-header";
import { HeaderSkeleton } from "@/components/ejad/skeletons";
import { useAccess } from "@/components/ejad/use-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonEditor } from "@/components/ui/json-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DisplayTags } from "@/components/view-tags";
import {
  CHANNEL_QUERY,
  type Channel,
  channelLabel,
  channelMetadata,
  channelRoute,
  channelTags,
  channelTopic,
  RESOURCE_KIND_CHANNEL,
} from "@/lib/ejad/channels";
import type { MessagingEndpoints } from "@/lib/ejad/messages";
import { graphqlClient, graphqlErrorCode } from "@/lib/graphql/client";

const TABS = ["overview", "connections", "messages"] as const;
type TabValue = (typeof TABS)[number];

export function ChannelDetailView({
  channelId,
  workspaceId,
  endpoints,
}: {
  channelId: string;
  workspaceId: string;
  endpoints: MessagingEndpoints;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { can } = useAccess();
  const workspaceRoute = useWorkspaceRoute(workspaceId);
  const tabParam = searchParams.get("tab");
  const tab: TabValue = TABS.includes(tabParam as TabValue)
    ? (tabParam as TabValue)
    : "overview";

  const [deleting, setDeleting] = React.useState(false);

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["ejad-channel", channelId],
    queryFn: ({ signal }) =>
      graphqlClient<{ resource: Channel }>({
        query: CHANNEL_QUERY,
        variables: { id: channelId },
        signal,
      }),
    retry: (count, err) => graphqlErrorCode(err) !== "NOT_FOUND" && count < 2,
  });
  const channel = data?.resource;

  function setTab(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "overview") params.delete("tab");
    else params.set("tab", value);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const backLink = (
    <Button asChild variant="ghost" size="sm" className="w-fit px-2">
      <Link href="/channels">
        <ArrowLeft />
        Channels
      </Link>
    </Button>
  );

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-6">
        {backLink}
        <HeaderSkeleton actions />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const notHere =
    channel &&
    (channel.kind !== RESOURCE_KIND_CHANNEL ||
      channel.tenantId !== workspaceId);
  if (error || !channel || notHere) {
    return (
      <div className="grid grid-cols-1 gap-6">
        {backLink}
        <LoadProblem
          what="channel"
          error={error}
          notFound={Boolean(notHere)}
          back={{ href: "/channels", label: "Back to channels" }}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {backLink}
      <PageHeader
        icon={Radio}
        title={channelLabel(channel)}
        actions={
          can("manage") ? (
            <Button
              variant="destructive"
              disabled={Boolean(channel.managedBy)}
              onClick={() => setDeleting(true)}
            >
              <Trash2 />
              Delete
            </Button>
          ) : null
        }
      >
        <code className="font-mono text-xs text-muted-foreground">
          {channel.id}
        </code>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <Overview channel={channel} workspaceRoute={workspaceRoute} />
        </TabsContent>
        <TabsContent value="connections" className="mt-4">
          <ChannelConnections
            workspaceId={workspaceId}
            channelId={channel.id}
            channelName={channelLabel(channel)}
            readOnly={!can("connect")}
          />
        </TabsContent>
        <TabsContent value="messages" className="mt-4 grid gap-4">
          <StoreMessagesSwitch channelId={channel.id} />
          <ChannelMessages
            workspaceId={workspaceId}
            workspaceRoute={workspaceRoute}
            channelId={channel.id}
            channelName={channelLabel(channel)}
            channelRoute={channelRoute(channel)}
            endpoints={endpoints}
          />
        </TabsContent>
      </Tabs>

      <ChannelDeleteDialog
        channel={deleting ? channel : null}
        onOpenChange={setDeleting}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: [CHANNELS_QUERY_KEY] });
          router.push("/channels");
        }}
      />
    </div>
  );
}

function CopyableCode({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <code className="truncate font-mono text-xs">{value}</code>
      <CopyButton value={value} size="icon" variant="ghost" label={label} />
    </span>
  );
}

function Overview({
  channel,
  workspaceRoute,
}: {
  channel: Channel;
  workspaceRoute: string | null;
}) {
  const route = channelRoute(channel);
  const tags = channelTags(channel);
  const metadata = channelMetadata(channel);
  const topic =
    route && workspaceRoute ? channelTopic(workspaceRoute, route) : null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{channel.name || "—"}</dd>
            <dt className="text-muted-foreground">Channel ID</dt>
            <dd>
              <CopyableCode value={channel.id} label="Copy channel ID" />
            </dd>
            <dt className="text-muted-foreground">Route</dt>
            <dd>
              {route ? (
                <CopyableCode value={route} label="Copy route" />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </dd>
            <dt className="text-muted-foreground">MQTT topic</dt>
            <dd>
              {topic ? (
                <CopyableCode value={topic} label="Copy MQTT topic" />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </dd>
            <dt className="text-muted-foreground">HTTP path</dt>
            <dd>
              {topic ? (
                <CopyableCode
                  value={`/http/${topic}`}
                  label="Copy HTTP publish path"
                />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
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
            <dd>{format(new Date(channel.createdAt), "d MMM yyyy, HH:mm")}</dd>
            <dt className="text-muted-foreground">Updated</dt>
            <dd>
              {channel.updatedAt
                ? format(new Date(channel.updatedAt), "d MMM yyyy, HH:mm")
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

function ChannelConnections({
  workspaceId,
  channelId,
  channelName,
  readOnly,
}: {
  workspaceId: string;
  channelId: string;
  channelName: string;
  readOnly: boolean;
}) {
  const [connecting, setConnecting] = React.useState(false);
  const { data, error, isPending } = useChannelConnections(
    workspaceId,
    channelId,
  );
  return (
    <>
      <ConnectionsTab
        side="channel"
        selfLabel={channelName}
        rows={data}
        isPending={isPending}
        error={error}
        readOnly={readOnly}
        onConnect={() => setConnecting(true)}
      />
      <ChannelConnectDialog
        open={connecting}
        onOpenChange={setConnecting}
        workspaceId={workspaceId}
        channelId={channelId}
        channelName={channelName}
        existing={data}
      />
    </>
  );
}
