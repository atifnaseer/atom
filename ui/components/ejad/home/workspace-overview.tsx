"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Cpu,
  LayoutDashboard,
  MessageSquare,
  Radio,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { EmptyState } from "@/components/ejad/empty-state";
import { ErrorAlert } from "@/components/ejad/error-alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_REFRESH_MS, formatReading } from "@/lib/ejad/dashboards";
import { requestError } from "@/lib/ejad/errors";
import { messageDate, messageValue } from "@/lib/ejad/messages";
import type { Overview } from "@/lib/ejad/overview";

async function fetchOverview(signal: AbortSignal): Promise<Overview> {
  const response = await fetch("/api/ejad/overview", {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw requestError(response, payload);
  return payload as Overview;
}

function Stat({
  label,
  value,
  icon: Icon,
  href,
  note,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  href: string;
  note?: string;
}) {
  return (
    <Card className="relative py-4">
      <CardHeader className="px-4">
        <CardDescription className="flex items-center gap-2">
          <Icon className="size-4" />
          <Link href={href} className="after:absolute after:inset-0">
            {label}
          </Link>
        </CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </CardHeader>
    </Card>
  );
}

/** Home: counts and the latest readings of the selected workspace. */
export function WorkspaceOverview({ workspaceId }: { workspaceId: string }) {
  const { data, error, isPending } = useQuery({
    queryKey: ["ejad-overview", workspaceId],
    queryFn: ({ signal }) => fetchOverview(signal),
    placeholderData: keepPreviousData,
    refetchInterval: CHART_REFRESH_MS,
    refetchIntervalInBackground: false,
  });

  if (error)
    return (
      <ErrorAlert title="Could not load the workspace overview" error={error} />
    );

  const withValues = data?.latest.filter((c) => c.latest.length > 0) ?? [];

  if (data && data.devices === 0 && data.channels === 0)
    return (
      <Card>
        <EmptyState
          icon={Rocket}
          title="This workspace is empty"
          description="Start by adding a device, then create a channel and connect the device to it. Its messages show up here once the channel stores them."
          action={
            <>
              <Button asChild>
                <Link href="/devices">Add a device</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/channels">Create a channel</Link>
              </Button>
            </>
          }
        />
      </Card>
    );

  return (
    <section aria-label="Workspace overview" className="grid grid-cols-1 gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {isPending || !data ? (
          [0, 1, 2].map((key) => <Skeleton key={key} className="h-28" />)
        ) : (
          <>
            <Stat
              label="Devices"
              value={data.devices}
              icon={Cpu}
              href="/devices"
            />
            <Stat
              label="Channels"
              value={data.channels}
              icon={Radio}
              href="/channels"
              note={`${data.storedChannels} storing messages`}
            />
            <Stat
              label="Messages in the last hour"
              value={
                data.messagesLastHour === null
                  ? "—"
                  : data.messagesLastHour.toLocaleString()
              }
              icon={MessageSquare}
              href="/messages"
              note={
                data.storedChannels === 0
                  ? "No channel stores messages yet"
                  : "Stored messages, all channels"
              }
            />
          </>
        )}
      </div>

      <Card className="py-4">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 px-4">
          <CardTitle className="text-base">Latest values</CardTitle>
          <Link
            href="/dashboards"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <LayoutDashboard className="size-4" />
            Dashboards
          </Link>
        </CardHeader>
        <CardContent className="px-4">
          {isPending ? (
            <Skeleton className="h-16" />
          ) : withValues.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No stored messages yet. Turn on “Store messages” on a channel and
              publish to it.{" "}
              <Link href="/channels" className="font-medium underline">
                Open channels
              </Link>
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {withValues.map((channel) => (
                <li key={channel.id} className="grid min-w-0 gap-1.5">
                  <Link
                    href={`/channels/${channel.id}`}
                    className="flex items-center gap-1.5 truncate text-sm font-medium hover:underline"
                  >
                    <Radio className="size-3.5 shrink-0 text-muted-foreground" />
                    {channel.name}
                  </Link>
                  <dl className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-0.5 text-sm">
                    {channel.latest.slice(0, 6).map((message) => {
                      const date = messageDate(message.time);
                      return (
                        <div key={message.name ?? ""} className="contents">
                          <dt className="truncate text-muted-foreground">
                            {message.name || "—"}
                          </dt>
                          <dd className="text-right font-medium tabular-nums">
                            {typeof message.value === "number"
                              ? formatReading(message.value)
                              : messageValue(message)}
                            {message.unit ? (
                              <span className="ml-1 font-normal text-muted-foreground">
                                {message.unit}
                              </span>
                            ) : null}
                          </dd>
                          <dd className="text-right text-xs text-muted-foreground">
                            {date
                              ? formatDistanceToNowStrict(date, {
                                  addSuffix: true,
                                })
                              : ""}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
