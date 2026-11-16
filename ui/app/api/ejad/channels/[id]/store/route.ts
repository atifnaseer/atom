import { NextResponse } from "next/server";
import { getServerToken } from "@/lib/auth/session";
import {
  CHANNEL_QUERY,
  type Channel,
  channelRoute,
  RESOURCE_KIND_CHANNEL,
} from "@/lib/ejad/channels";
import { isUuid } from "@/lib/ejad/messages";
import { rulesEngineUrl } from "@/lib/ejad/messaging-config";
import {
  getStoreState,
  RulesApiError,
  type RulesClientOptions,
  setStoreMessages,
} from "@/lib/ejad/store-rule";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";
import { AtomGraphqlError } from "@/lib/graphql/client";
import { graphqlServer } from "@/lib/graphql/server";

function fail(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

type Ready =
  | { error: NextResponse }
  | { options: RulesClientOptions; channel: Channel };

/** Login, workspace and channel checks shared by GET and PUT. */
async function prepare(
  ctx: RouteContext<"/api/ejad/channels/[id]/store">,
): Promise<Ready> {
  const token = await getServerToken();
  if (!token) return { error: fail("missing authentication", 401) };
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) return { error: fail("Select a workspace first.", 400) };
  const { id } = await ctx.params;
  if (!isUuid(id)) return { error: fail("Pick a channel.", 400) };

  try {
    const { resource } = await graphqlServer<{ resource: Channel | null }>({
      query: CHANNEL_QUERY,
      variables: { id },
    });
    if (
      !resource ||
      resource.kind !== RESOURCE_KIND_CHANNEL ||
      resource.tenantId !== workspaceId
    )
      return { error: fail("The channel is not in this workspace.", 404) };
    return {
      options: { baseUrl: rulesEngineUrl(), workspaceId, token },
      channel: resource,
    };
  } catch (error) {
    if (error instanceof AtomGraphqlError) {
      const code = error.errors[0]?.extensions?.code ?? "";
      if (code === "NOT_FOUND")
        return { error: fail("The channel is not in this workspace.", 404) };
      if (code === "UNAUTHENTICATED" || code === "FORBIDDEN")
        return { error: fail(error.message, code === "FORBIDDEN" ? 403 : 401) };
      return { error: fail(error.message, 502) };
    }
    throw error;
  }
}

function rulesFailure(error: unknown) {
  if (error instanceof RulesApiError) {
    const status = [400, 401, 403, 404, 409, 422].includes(error.status)
      ? error.status
      : 502;
    return fail(error.message, status);
  }
  if (error instanceof Error && error.name === "TimeoutError")
    return fail("The rules engine did not answer in time.", 504);
  if (error instanceof TypeError)
    return fail("The rules engine is not reachable.", 502);
  throw error;
}

/** { enabled, rules }: whether the channel's messages are stored. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/ejad/channels/[id]/store">,
) {
  const ready = await prepare(ctx);
  if ("error" in ready) return ready.error;
  try {
    return NextResponse.json(
      await getStoreState(ready.options, ready.channel.id),
    );
  } catch (error) {
    return rulesFailure(error);
  }
}

/**
 * Body { enabled: boolean }. On creates (or re-enables) the channel's
 * store rule in the rules engine; off deletes it. Returns the new state.
 */
export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/ejad/channels/[id]/store">,
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid JSON", 400);
  }
  const enabled = (body as { enabled?: unknown } | null)?.enabled;
  if (typeof enabled !== "boolean")
    return fail("enabled must be true or false.", 400);

  const ready = await prepare(ctx);
  if ("error" in ready) return ready.error;
  const { channel } = ready;
  try {
    return NextResponse.json(
      await setStoreMessages(
        ready.options,
        {
          id: channel.id,
          name: channel.name,
          route: channelRoute(channel) ?? "",
        },
        enabled,
      ),
    );
  } catch (error) {
    return rulesFailure(error);
  }
}
