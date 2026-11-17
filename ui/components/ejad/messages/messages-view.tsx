"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useWorkspaceRoute } from "@/components/ejad/channels/use-workspace-route";
import { EmptyState } from "@/components/ejad/empty-state";
import { LoadProblem } from "@/components/ejad/error-alert";
import { ChannelMessages } from "@/components/ejad/messages/channel-messages";
import { PageHeader } from "@/components/ejad/page-header";
import { AsyncCombobox, type ComboPage } from "@/components/ui/async-combobox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CHANNEL_QUERY,
  CHANNELS_QUERY,
  type Channel,
  channelLabel,
  channelRoute,
  RESOURCE_KIND_CHANNEL,
} from "@/lib/ejad/channels";
import { isUuid, type MessagingEndpoints } from "@/lib/ejad/messages";
import { graphqlClient, graphqlErrorCode } from "@/lib/graphql/client";

const PAGE = 25;

/** /messages: pick any channel of the workspace and browse its messages. */
export function MessagesView({
  workspaceId,
  endpoints,
}: {
  workspaceId: string;
  endpoints: MessagingEndpoints;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspaceRoute = useWorkspaceRoute(workspaceId);
  const param = searchParams.get("channel") ?? "";
  const channelId = isUuid(param) ? param : "";

  function selectChannel(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("channel", id);
    else params.delete("channel");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

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

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["ejad-channel", channelId],
    enabled: Boolean(channelId),
    queryFn: ({ signal }) =>
      graphqlClient<{ resource: Channel }>({
        query: CHANNEL_QUERY,
        variables: { id: channelId },
        signal,
      }),
    retry: (count, err) => graphqlErrorCode(err) !== "NOT_FOUND" && count < 2,
  });
  const channel = data?.resource;
  const notHere =
    channel &&
    (channel.kind !== RESOURCE_KIND_CHANNEL ||
      channel.tenantId !== workspaceId);

  const fetchSelected = React.useCallback(
    async ({ value, signal }: { value: string; signal?: AbortSignal }) => {
      const { resource } = await graphqlClient<{ resource: Channel }>({
        query: CHANNEL_QUERY,
        variables: { id: value },
        signal,
      });
      return {
        value: resource.id,
        label: channelLabel(resource),
        detail: channelRoute(resource) ?? undefined,
      };
    },
    [],
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        icon={MessageSquare}
        title="Messages"
        description="Browse messages published on this workspace’s channels."
        actions={
          <div className="grid w-full gap-1.5 sm:w-80">
            <Label htmlFor="messages-channel">Channel</Label>
            <AsyncCombobox
              id="messages-channel"
              value={channelId}
              onChange={selectChannel}
              queryKey={["ejad-messages-channels", workspaceId]}
              fetchPage={fetchPage}
              fetchSelected={fetchSelected}
              placeholder="Select a channel"
              searchPlaceholder="Search channels…"
              emptyText="No channels found."
            />
          </div>
        }
      />

      {!channelId ? (
        <Card>
          <EmptyState
            icon={MessageSquare}
            title="Pick a channel"
            description="Choose a channel above to see the messages devices published on it. Messages are kept only for channels with “Store messages” turned on."
            action={
              <Button asChild variant="outline">
                <Link href="/channels">Go to channels</Link>
              </Button>
            }
          />
        </Card>
      ) : isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : error || !channel || notHere ? (
        <LoadProblem
          what="channel"
          error={error}
          notFound={Boolean(notHere)}
          back={{ href: "/channels", label: "Back to channels" }}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            <Link
              href={`/channels/${channel.id}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {channelLabel(channel)}
            </Link>{" "}
            · <code className="font-mono text-xs">{channel.id}</code>
          </div>
          <ChannelMessages
            key={channel.id}
            workspaceId={workspaceId}
            workspaceRoute={workspaceRoute}
            channelId={channel.id}
            channelName={channelLabel(channel)}
            channelRoute={channelRoute(channel)}
            endpoints={endpoints}
          />
        </>
      )}
    </div>
  );
}
