import { NextResponse } from "next/server";
import type { Ability } from "@/lib/ejad/access";
import { requireWorkspaceAbility } from "@/lib/ejad/access-server";
import {
  CHANNEL_QUERY,
  type Channel,
  RESOURCE_KIND_CHANNEL,
} from "@/lib/ejad/channels";
import { isUuid } from "@/lib/ejad/messages";
import {
  STORE_ATTRIBUTE,
  storeAttributes,
  storeState,
  UPDATE_CHANNEL_ATTRIBUTES_MUTATION,
} from "@/lib/ejad/store-messages";
import { AtomGraphqlError } from "@/lib/graphql/client";
import { graphqlServer } from "@/lib/graphql/server";

function fail(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function atomFailure(error: unknown) {
  if (error instanceof AtomGraphqlError) {
    const code = error.errors[0]?.extensions?.code ?? "";
    if (code === "NOT_FOUND")
      return fail("The channel is not in this workspace.", 404);
    if (code === "UNAUTHENTICATED") return fail(error.message, 401);
    if (code === "FORBIDDEN") return fail(error.message, 403);
    return fail(error.message, 502);
  }
  throw error;
}

type Ready = { error: NextResponse } | { channel: Channel };

/** Login, workspace, role and channel checks shared by GET and PUT. */
async function loadChannel(
  ctx: RouteContext<"/api/ejad/channels/[id]/store">,
  ability: Ability,
): Promise<Ready> {
  const guard = await requireWorkspaceAbility(ability);
  if ("error" in guard) return guard;
  const { workspaceId } = guard;
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
    return { channel: resource };
  } catch (error) {
    return { error: atomFailure(error) };
  }
}

/** { enabled }: whether the channel's messages are stored. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/ejad/channels/[id]/store">,
) {
  const ready = await loadChannel(ctx, "view");
  if ("error" in ready) return ready.error;
  return NextResponse.json(storeState(ready.channel));
}

/**
 * Body { enabled: boolean }. Sets (or removes) attributes.store_messages on
 * the channel; the ejad-store service stores every flagged channel. Returns
 * the new state.
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

  const ready = await loadChannel(ctx, "manage");
  if ("error" in ready) return ready.error;
  const { channel } = ready;
  if (storeState(channel).enabled === enabled)
    return NextResponse.json(storeState(channel));

  try {
    const { updateResource } = await graphqlServer<{
      updateResource: Channel;
    }>({
      query: UPDATE_CHANNEL_ATTRIBUTES_MUTATION,
      variables: {
        id: channel.id,
        input: { attributes: storeAttributes(channel.attributes, enabled) },
      },
    });
    if (storeState(updateResource).enabled !== enabled)
      return fail(`Atom did not save ${STORE_ATTRIBUTE}.`, 502);
    return NextResponse.json(storeState(updateResource));
  } catch (error) {
    return atomFailure(error);
  }
}
