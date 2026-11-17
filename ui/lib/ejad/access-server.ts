// Server-side: the signed-in user's access, from Atom's PDP, and the guard
// every /api/ejad route runs before touching Atom. Atom still enforces its
// own gates; this adds the Ejad role rules Atom cannot express (an Operator
// holds policy.manage for connections but must not manage members).

import { NextResponse } from "next/server";
import { getServerSession, getServerToken } from "@/lib/auth/session";
import {
  ABILITY_DENIED,
  type Ability,
  type AccessCheckResult,
  accessCheckMutation,
  accessFromCheck,
  PLATFORM_ADMIN_DENIED,
  type WorkspaceAccess,
} from "@/lib/ejad/access";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";
import { AtomGraphqlError } from "@/lib/graphql/client";
import { graphqlServer } from "@/lib/graphql/server";

/** Login only (for routes whose Atom mutation is the permission check). */
export async function requireLogin(): Promise<
  { error: NextResponse } | { entityId: string }
> {
  const session = await getServerSession();
  if (!session || !(await getServerToken()))
    return { error: fail("missing authentication", 401) };
  return { entityId: session.entityId };
}

export function fail(message: string, status: number, code?: string) {
  return NextResponse.json(code ? { message, code } : { message }, { status });
}

const STATUS_BY_CODE: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

/** Turns an Atom GraphQL error into a JSON response; rethrows anything else. */
export function atomErrorResponse(error: unknown) {
  if (error instanceof AtomGraphqlError) {
    const code = error.errors[0]?.extensions?.code ?? "";
    return fail(error.message, STATUS_BY_CODE[code] ?? 502, code);
  }
  throw error;
}

/**
 * The user's access in `workspaceId` (or platform-only when null). Throws
 * AtomGraphqlError when Atom refuses the check itself.
 */
export async function loadAccess(
  entityId: string,
  workspaceId: string | null,
): Promise<WorkspaceAccess> {
  const result = await graphqlServer<AccessCheckResult>({
    query: accessCheckMutation(Boolean(workspaceId)),
    variables: workspaceId
      ? { subjectId: entityId, workspaceId }
      : { subjectId: entityId },
  });
  return accessFromCheck(entityId, workspaceId, result);
}

export type Guarded =
  | { error: NextResponse }
  | { access: WorkspaceAccess; workspaceId: string; entityId: string };

/**
 * Login, selected workspace, and `ability` in it. Returns the access or the
 * response to send (401, 400, 403).
 */
export async function requireWorkspaceAbility(
  ability: Ability,
): Promise<Guarded> {
  const session = await getServerSession();
  if (!session || !(await getServerToken()))
    return { error: fail("missing authentication", 401) };
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) return { error: fail("Select a workspace first.", 400) };
  let access: WorkspaceAccess;
  try {
    access = await loadAccess(session.entityId, workspaceId);
  } catch (error) {
    return { error: atomErrorResponse(error) };
  }
  if (!access.can[ability])
    return { error: fail(ABILITY_DENIED[ability], 403, "FORBIDDEN") };
  return { access, workspaceId, entityId: session.entityId };
}

export type PlatformGuarded =
  | { error: NextResponse }
  | { access: WorkspaceAccess; entityId: string };

/** Login and platform-wide `manage` (platform admin). */
export async function requirePlatformAdmin(): Promise<PlatformGuarded> {
  const session = await getServerSession();
  if (!session || !(await getServerToken()))
    return { error: fail("missing authentication", 401) };
  let access: WorkspaceAccess;
  try {
    access = await loadAccess(session.entityId, null);
  } catch (error) {
    return { error: atomErrorResponse(error) };
  }
  if (!access.platformAdmin)
    return { error: fail(PLATFORM_ADMIN_DENIED, 403, "FORBIDDEN") };
  return { access, entityId: session.entityId };
}
