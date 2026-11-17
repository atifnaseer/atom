import { NextResponse } from "next/server";
import { requireWorkspaceAbility } from "@/lib/ejad/access-server";
import { RESOURCE_KIND_CHANNEL } from "@/lib/ejad/channels";
import {
  type ConnectionRequest,
  connectMany,
  disconnectMany,
  parseConnectionRequest,
} from "@/lib/ejad/connections";
import {
  graphqlService,
  ServiceTokenMissingError,
} from "@/lib/ejad/service-graphql";
import { AtomGraphqlError } from "@/lib/graphql/client";
import { graphqlServer } from "@/lib/graphql/server";

const STATUS_BY_CODE: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

function bad(message: string) {
  return NextResponse.json({ message, code: "BAD_REQUEST" }, { status: 400 });
}

const OWNERSHIP_QUERY = (deviceIds: string[], channelIds: string[]) => `
  query EjadConnectionTargets {
    ${deviceIds.map((id, i) => `d${i}: entity(id: ${JSON.stringify(id)}) { id kind tenantId }`).join("\n")}
    ${channelIds.map((id, i) => `c${i}: resource(id: ${JSON.stringify(id)}) { id kind tenantId }`).join("\n")}
  }
`;

/**
 * Before connecting, make sure every device and channel is in the selected
 * workspace: a block may name any object id, so a stray id would otherwise
 * grant access across workspaces.
 */
async function checkTargets(
  tenantId: string,
  request: ConnectionRequest,
): Promise<string | null> {
  type Target = { id: string; kind: string; tenantId: string | null } | null;
  let data: Record<string, Target>;
  try {
    data = await graphqlServer<Record<string, Target>>({
      query: OWNERSHIP_QUERY(request.deviceIds, request.channelIds),
    });
  } catch (error) {
    if (
      error instanceof AtomGraphqlError &&
      error.errors.some((entry) => entry.extensions?.code === "NOT_FOUND")
    )
      return "A selected device or channel no longer exists.";
    throw error;
  }
  for (let i = 0; i < request.deviceIds.length; i++) {
    const device = data[`d${i}`];
    if (!device || device.kind !== "device" || device.tenantId !== tenantId)
      return "A selected device is not in this workspace.";
  }
  for (let i = 0; i < request.channelIds.length; i++) {
    const channel = data[`c${i}`];
    if (
      !channel ||
      channel.kind !== RESOURCE_KIND_CHANNEL ||
      channel.tenantId !== tenantId
    )
      return "A selected channel is not in this workspace.";
  }
  return null;
}

async function handle(request: Request, mode: "connect" | "disconnect") {
  const guard = await requireWorkspaceAbility("connect");
  if ("error" in guard) return guard.error;
  const tenantId = guard.workspaceId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad("invalid JSON");
  }
  const parsed = parseConnectionRequest(body);
  if (typeof parsed === "string") return bad(parsed);

  try {
    // Ownership is checked as the signed-in user, for both directions: the
    // change below runs as the Ejad service and must stay in this workspace.
    const problem = await checkTargets(tenantId, parsed);
    if (problem) return bad(problem);
    // Operators do not hold policy.manage (it would also let them add
    // members and assign roles), so the grant itself is made by the Ejad
    // service account, only after the role and ownership checks above.
    const result =
      mode === "connect"
        ? await connectMany(graphqlService, tenantId, parsed)
        : await disconnectMany(graphqlService, tenantId, parsed);
    const allFailed = result.failed.length > 0 && result.changed === 0;
    return NextResponse.json(
      {
        ...result,
        message: allFailed ? result.failed[0].message : undefined,
      },
      { status: allFailed ? 502 : 200 },
    );
  } catch (error) {
    if (error instanceof ServiceTokenMissingError) {
      return NextResponse.json(
        { message: error.message, code: "SERVICE_UNAVAILABLE" },
        { status: 503 },
      );
    }
    if (error instanceof AtomGraphqlError) {
      const code = error.errors[0]?.extensions?.code ?? "";
      return NextResponse.json(
        { message: error.message, code },
        { status: STATUS_BY_CODE[code] ?? 502 },
      );
    }
    throw error;
  }
}

/**
 * Connects devices to channels the way Magistrala's PolicyService.AddPolicy
 * does (one permission block + one direct policy per type). Body:
 * { deviceIds, channelIds, types: ["publish" | "subscribe"] }.
 */
export function POST(request: Request) {
  return handle(request, "connect");
}

/**
 * Disconnects the way Magistrala's PolicyService.DeletePolicyFilter does
 * (deletes the device's matching direct policies). Same body as POST.
 */
export function DELETE(request: Request) {
  return handle(request, "disconnect");
}
