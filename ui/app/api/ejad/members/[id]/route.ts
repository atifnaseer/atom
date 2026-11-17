import { NextResponse } from "next/server";
import { fail, requireWorkspaceAbility } from "@/lib/ejad/access-server";
import {
  changeMemberRole,
  isWorkspaceRoleKey,
  removeMember,
} from "@/lib/ejad/members";
import { isUuid } from "@/lib/ejad/messages";
import { graphqlServer } from "@/lib/graphql/server";
import { membersFailure } from "../errors";

/** Body { role }: changes a member's role. Admins only. */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/ejad/members/[id]">,
) {
  const guard = await requireWorkspaceAbility("members");
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return fail("Pick a member.", 400);
  const body = (await request.json().catch(() => null)) as {
    role?: unknown;
  } | null;
  if (!isWorkspaceRoleKey(body?.role)) return fail("Pick a role.", 400);
  try {
    await changeMemberRole(graphqlServer, guard.workspaceId, id, body.role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return membersFailure(error);
  }
}

/** Removes a member from the workspace. Admins only. */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/ejad/members/[id]">,
) {
  const guard = await requireWorkspaceAbility("members");
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return fail("Pick a member.", 400);
  try {
    await removeMember(graphqlServer, guard.workspaceId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return membersFailure(error);
  }
}
