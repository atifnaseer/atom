import { NextResponse } from "next/server";
import { getServerToken } from "@/lib/auth/session";
import { requireWorkspaceAbility } from "@/lib/ejad/access-server";
import {
  type Channel,
  channelLabel,
  RESOURCE_KIND_CHANNEL,
} from "@/lib/ejad/channels";
import { latestByName } from "@/lib/ejad/dashboards";
import type { Overview, OverviewChannel } from "@/lib/ejad/overview";
import { readChannelMessages } from "@/lib/ejad/reader-server";
import { storeState } from "@/lib/ejad/store-messages";
import { AtomGraphqlError } from "@/lib/graphql/client";
import { graphqlServer } from "@/lib/graphql/server";

/** Stored channels read for the overview; the rest are only counted. */
const MAX_STORED_CHANNELS = 25;
/** Recent messages scanned per channel to find the latest of each name. */
const LATEST_SCAN = 100;
const HOUR_MS = 3_600_000;

const OVERVIEW_QUERY = `
  query EjadOverview($tenantId: ID!) {
    entities(kind: device, tenantId: $tenantId, limit: 1) { total }
    resources(kind: "${RESOURCE_KIND_CHANNEL}", tenantId: $tenantId, order: created_at, dir: desc, limit: 200) {
      total
      items { id name attributes }
    }
  }
`;

function fail(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

/**
 * Home overview of the selected workspace: device and channel counts,
 * messages stored in the last hour and the latest value of each measurement
 * per stored channel (channels with Store messages on).
 */
export async function GET(request: Request) {
  const guard = await requireWorkspaceAbility("view");
  if ("error" in guard) return guard.error;
  const { workspaceId } = guard;
  const token = await getServerToken();
  if (!token) return fail("missing authentication", 401);

  let counts: {
    entities: { total: number };
    resources: {
      total: number;
      items: Pick<Channel, "id" | "name" | "attributes">[];
    };
  };
  try {
    counts = await graphqlServer({
      query: OVERVIEW_QUERY,
      variables: { tenantId: workspaceId },
    });
  } catch (error) {
    if (error instanceof AtomGraphqlError) return fail(error.message, 502);
    throw error;
  }

  const stored = counts.resources.items.filter(
    (channel) => storeState(channel).enabled,
  );
  const fromNanos = (
    BigInt(Date.now() - HOUR_MS) * BigInt(1_000_000)
  ).toString();
  const read = (channelId: string, params: Record<string, string>) =>
    readChannelMessages({
      token,
      workspaceId,
      channelId,
      params: new URLSearchParams(params),
      signal: request.signal,
    });

  const latest = await Promise.all(
    stored.slice(0, MAX_STORED_CHANNELS).map(async (channel) => {
      const [hour, recent] = await Promise.allSettled([
        read(channel.id, { from: fromNanos, limit: "1" }),
        read(channel.id, { limit: String(LATEST_SCAN) }),
      ]);
      return {
        id: channel.id,
        name: channelLabel(channel),
        lastHour: hour.status === "fulfilled" ? hour.value.total : null,
        latest:
          recent.status === "fulfilled"
            ? latestByName(recent.value.messages)
            : [],
      } satisfies OverviewChannel;
    }),
  );
  if (request.signal.aborted) return new NextResponse(null, { status: 499 });

  const hourCounts = latest
    .map((channel) => channel.lastHour)
    .filter((n): n is number => n !== null);
  return NextResponse.json({
    devices: counts.entities.total,
    channels: counts.resources.total,
    storedChannels: stored.length,
    messagesLastHour:
      hourCounts.length > 0 ? hourCounts.reduce((a, b) => a + b, 0) : null,
    latest,
  } satisfies Overview);
}
