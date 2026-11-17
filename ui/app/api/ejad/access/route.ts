import { NextResponse } from "next/server";
import { getServerSession, getServerToken } from "@/lib/auth/session";
import { atomErrorResponse, fail, loadAccess } from "@/lib/ejad/access-server";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

/**
 * What the signed-in user may do in the selected workspace, from Atom's
 * PDP. The browser uses it only to hide or disable buttons; every route
 * checks again on its own.
 */
export async function GET() {
  const session = await getServerSession();
  if (!session || !(await getServerToken()))
    return fail("missing authentication", 401);
  try {
    const access = await loadAccess(
      session.entityId,
      await getServerWorkspaceId(),
    );
    return NextResponse.json(access, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return atomErrorResponse(error);
  }
}
