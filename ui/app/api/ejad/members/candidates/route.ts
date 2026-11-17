import { NextResponse } from "next/server";
import { fail, requireWorkspaceAbility } from "@/lib/ejad/access-server";
import { searchCandidates } from "@/lib/ejad/members";
import { graphqlServer } from "@/lib/graphql/server";
import { membersFailure } from "../errors";

/** ?q= (3+ characters): users that can be added to the workspace. */
export async function GET(request: Request) {
  const guard = await requireWorkspaceAbility("members");
  if ("error" in guard) return guard.error;
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 3) return fail("Type at least 3 characters.", 400);
  try {
    const users = await searchCandidates(graphqlServer, guard.workspaceId, q);
    return NextResponse.json({ users });
  } catch (error) {
    return membersFailure(error);
  }
}
