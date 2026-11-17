import { NextResponse } from "next/server";
import { fail, requireWorkspaceAbility } from "@/lib/ejad/access-server";
import {
  addMember,
  ensureWorkspaceRoles,
  isWorkspaceRoleKey,
  listMembers,
} from "@/lib/ejad/members";
import { isUuid } from "@/lib/ejad/messages";
import { graphqlServer } from "@/lib/graphql/server";
import { membersFailure } from "./errors";

/**
 * Members of the selected workspace with their Ejad roles. Admins only.
 * Also creates the workspace's Admin/Operator/Viewer roles if missing.
 */
export async function GET() {
  const guard = await requireWorkspaceAbility("members");
  if ("error" in guard) return guard.error;
  try {
    await ensureWorkspaceRoles(graphqlServer, guard.workspaceId);
    const members = await listMembers(graphqlServer, guard.workspaceId);
    return NextResponse.json({ members, self: guard.entityId });
  } catch (error) {
    return membersFailure(error);
  }
}

/** Body { entityId, role }: adds an existing user with a role. Admins only. */
export async function POST(request: Request) {
  const guard = await requireWorkspaceAbility("members");
  if ("error" in guard) return guard.error;
  const body = (await request.json().catch(() => null)) as {
    entityId?: unknown;
    role?: unknown;
  } | null;
  const entityId = body?.entityId;
  if (typeof entityId !== "string" || !isUuid(entityId))
    return fail("Pick a user.", 400);
  if (!isWorkspaceRoleKey(body?.role)) return fail("Pick a role.", 400);
  try {
    await addMember(graphqlServer, guard.workspaceId, entityId, body.role);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return membersFailure(error);
  }
}
