import { NextResponse } from "next/server";
import { getServerSession, getServerToken } from "@/lib/auth/session";
import {
  type AccessCheckResult,
  MAX_ROLE_CHECKS,
  rolesFromCheck,
  workspaceRolesMutation,
  workspaceRolesVariables,
} from "@/lib/ejad/access";
import { atomErrorResponse, fail } from "@/lib/ejad/access-server";
import { isUuid } from "@/lib/ejad/messages";
import { graphqlServer } from "@/lib/graphql/server";

/** ?ids=a,b,c: the signed-in user's Ejad role in each workspace. */
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session || !(await getServerToken()))
    return fail("missing authentication", 401);
  const ids = [
    ...new Set(
      (new URL(request.url).searchParams.get("ids") ?? "")
        .split(",")
        .filter(Boolean),
    ),
  ];
  if (ids.length === 0) return NextResponse.json({ roles: {} });
  if (ids.length > MAX_ROLE_CHECKS || !ids.every(isUuid))
    return fail("Invalid workspace ids.", 400);
  try {
    const result = await graphqlServer<AccessCheckResult>({
      query: workspaceRolesMutation(ids),
      variables: workspaceRolesVariables(session.entityId, ids),
    });
    return NextResponse.json({ roles: rolesFromCheck(ids, result) });
  } catch (error) {
    return atomErrorResponse(error);
  }
}
