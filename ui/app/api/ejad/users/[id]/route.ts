import { NextResponse } from "next/server";
import {
  atomErrorResponse,
  fail,
  requirePlatformAdmin,
} from "@/lib/ejad/access-server";
import { isUuid } from "@/lib/ejad/messages";
import {
  DELETE_USER_MUTATION,
  DISABLE_USER_MUTATION,
  ENABLE_USER_MUTATION,
  getUser,
  isUserAction,
  resetPassword,
  validatePassword,
} from "@/lib/ejad/users";
import { graphqlServer } from "@/lib/graphql/server";

type Loaded =
  | { error: NextResponse }
  | { id: string; self: boolean; system: boolean };

/** Platform admin, a valid id, and a global human user behind it. */
async function load(
  ctx: RouteContext<"/api/ejad/users/[id]">,
): Promise<Loaded> {
  const guard = await requirePlatformAdmin();
  if ("error" in guard) return guard;
  const { id } = await ctx.params;
  if (!isUuid(id)) return { error: fail("Pick a user.", 400) };
  try {
    const user = await getUser(graphqlServer, id);
    if (!user) return { error: fail("User not found.", 404) };
    return { id, self: id === guard.entityId, system: user.system };
  } catch (error) {
    return { error: atomErrorResponse(error) };
  }
}

/**
 * Body { action: "enable" | "disable" } or
 * { action: "reset-password", password }. Platform admins only.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/ejad/users/[id]">,
) {
  const loaded = await load(ctx);
  if ("error" in loaded) return loaded.error;
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    password?: unknown;
  } | null;
  const action = body?.action;
  if (!isUserAction(action)) return fail("Unknown action.", 400);
  if (action === "disable" && (loaded.self || loaded.system))
    return fail(
      loaded.self
        ? "You can't disable your own account."
        : "The built-in admin account can't be disabled.",
      409,
    );

  try {
    if (action === "reset-password") {
      const error = validatePassword(body?.password);
      if (error) return fail(error, 400);
      await resetPassword(graphqlServer, loaded.id, body?.password as string);
    } else {
      await graphqlServer({
        query:
          action === "enable" ? ENABLE_USER_MUTATION : DISABLE_USER_MUTATION,
        variables: { id: loaded.id },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return atomErrorResponse(error);
  }
}

/** Deletes a user. Platform admins only; not yourself or the built-in admin. */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/ejad/users/[id]">,
) {
  const loaded = await load(ctx);
  if ("error" in loaded) return loaded.error;
  if (loaded.self) return fail("You can't delete your own account.", 409);
  if (loaded.system)
    return fail("The built-in admin account can't be deleted.", 409);
  try {
    await graphqlServer({
      query: DELETE_USER_MUTATION,
      variables: { id: loaded.id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return atomErrorResponse(error);
  }
}
