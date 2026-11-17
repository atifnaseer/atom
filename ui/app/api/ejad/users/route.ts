import { NextResponse } from "next/server";
import {
  atomErrorResponse,
  fail,
  requirePlatformAdmin,
} from "@/lib/ejad/access-server";
import { createUser, listUsers, parseNewUser } from "@/lib/ejad/users";
import { graphqlErrorCode } from "@/lib/graphql/client";
import { graphqlServer } from "@/lib/graphql/server";

/** Platform users. Platform admins only. */
export async function GET() {
  const guard = await requirePlatformAdmin();
  if ("error" in guard) return guard.error;
  try {
    const users = await listUsers(graphqlServer);
    return NextResponse.json({ users, self: guard.entityId });
  } catch (error) {
    return atomErrorResponse(error);
  }
}

/** Body { name, email?, password }: creates a user. Platform admins only. */
export async function POST(request: Request) {
  const guard = await requirePlatformAdmin();
  if ("error" in guard) return guard.error;
  const parsed = parseNewUser(await request.json().catch(() => null));
  if (typeof parsed === "string") return fail(parsed, 400);
  try {
    const user = await createUser(graphqlServer, parsed);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (graphqlErrorCode(error) === "CONFLICT")
      return fail("A user with that username or email already exists.", 409);
    return atomErrorResponse(error);
  }
}
