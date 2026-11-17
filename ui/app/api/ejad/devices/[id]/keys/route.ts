import { NextResponse } from "next/server";
import {
  atomErrorResponse,
  fail,
  requireWorkspaceAbility,
} from "@/lib/ejad/access-server";
import {
  CREDENTIALS_QUERY,
  type Credential,
  createSharedKey,
  DEVICE_QUERY,
  type Device,
  isKeyAction,
  MAGISTRALA_KIND_DEVICE,
  newestActiveKey,
  REVEAL_SHARED_KEY_MUTATION,
  REVOKE_CREDENTIAL_MUTATION,
  rotateSharedKey,
  type SharedKey,
} from "@/lib/ejad/devices";
import { isUuid } from "@/lib/ejad/messages";
import { graphqlServer } from "@/lib/graphql/server";

type Ready = { error: NextResponse } | { deviceId: string };

/**
 * Device keys are secrets: only roles that manage devices (Admin,
 * Operator) may list, create, reveal, rotate or revoke them, and only for
 * a device in the selected workspace.
 */
async function load(
  ctx: RouteContext<"/api/ejad/devices/[id]/keys">,
): Promise<Ready> {
  const guard = await requireWorkspaceAbility("manage");
  if ("error" in guard) return guard;
  const { id } = await ctx.params;
  if (!isUuid(id)) return { error: fail("Pick a device.", 400) };
  try {
    const { entity } = await graphqlServer<{ entity: Device | null }>({
      query: DEVICE_QUERY,
      variables: { id },
    });
    if (
      !entity ||
      entity.kind !== MAGISTRALA_KIND_DEVICE ||
      entity.tenantId !== guard.workspaceId
    )
      return { error: fail("The device is not in this workspace.", 404) };
    return { deviceId: id };
  } catch (error) {
    return { error: atomErrorResponse(error) };
  }
}

async function listKeys(deviceId: string) {
  const { credentials } = await graphqlServer<{
    credentials: { items: Credential[] };
  }>({ query: CREDENTIALS_QUERY, variables: { entityId: deviceId } });
  return credentials.items;
}

async function reveal(deviceId: string, credentialId: string) {
  const { revealSharedKey } = await graphqlServer<{
    revealSharedKey: SharedKey;
  }>({
    query: REVEAL_SHARED_KEY_MUTATION,
    variables: { entityId: deviceId, credentialId },
  });
  return revealSharedKey;
}

/** The device's credentials (no secrets). */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/ejad/devices/[id]/keys">,
) {
  const ready = await load(ctx);
  if ("error" in ready) return ready.error;
  try {
    return NextResponse.json({ credentials: await listKeys(ready.deviceId) });
  } catch (error) {
    return atomErrorResponse(error);
  }
}

/**
 * Body { action, credentialId? }:
 *   create        → { sharedKey }
 *   reveal        → { sharedKey } of credentialId
 *   reveal-newest → { sharedKey } of the newest active key
 *   rotate        → { sharedKey, revokeError } (new key, credentialId revoked)
 *   revoke        → { ok }
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/ejad/devices/[id]/keys">,
) {
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    credentialId?: unknown;
  } | null;
  const action = body?.action;
  if (!isKeyAction(action)) return fail("Unknown action.", 400);
  const credentialId =
    typeof body?.credentialId === "string" ? body.credentialId : "";
  const needsCredential =
    action === "reveal" || action === "rotate" || action === "revoke";
  if (needsCredential && !isUuid(credentialId))
    return fail("Pick a secret.", 400);

  const ready = await load(ctx);
  if ("error" in ready) return ready.error;
  const { deviceId } = ready;

  try {
    switch (action) {
      case "create":
        return NextResponse.json(
          { sharedKey: await createSharedKey(graphqlServer, deviceId) },
          { status: 201 },
        );
      case "reveal":
        return NextResponse.json({
          sharedKey: await reveal(deviceId, credentialId),
        });
      case "reveal-newest": {
        const newest = newestActiveKey(await listKeys(deviceId));
        if (!newest) return fail("This device has no active secret.", 404);
        return NextResponse.json({
          sharedKey: await reveal(deviceId, newest.id),
        });
      }
      case "rotate":
        return NextResponse.json(
          await rotateSharedKey(graphqlServer, deviceId, credentialId),
        );
      case "revoke":
        await graphqlServer({
          query: REVOKE_CREDENTIAL_MUTATION,
          variables: { entityId: deviceId, credentialId },
        });
        return NextResponse.json({ ok: true });
    }
  } catch (error) {
    return atomErrorResponse(error);
  }
}
