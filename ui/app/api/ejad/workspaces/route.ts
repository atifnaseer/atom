import { NextResponse } from "next/server";
import { getServerToken } from "@/lib/auth/session";
import { createWorkspace, validateRoute } from "@/lib/ejad/workspaces";
import { AtomGraphqlError } from "@/lib/graphql/client";
import { graphqlServer } from "@/lib/graphql/server";

const STATUS_BY_CODE: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

/**
 * Creates a workspace (Atom tenant) the way Magistrala does. Runs
 * server-side so the multi-step create (tenant, then default device types)
 * finishes even if the browser navigates away.
 */
export async function POST(request: Request) {
  if (!(await getServerToken())) {
    return NextResponse.json(
      { message: "missing authentication" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "invalid JSON" }, { status: 400 });
  }
  const { name, route } = (body ?? {}) as { name?: unknown; route?: unknown };
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ message: "Name is required." }, { status: 400 });
  }
  const routeError =
    typeof route === "string" ? validateRoute(route) : "Route is required.";
  if (routeError || typeof route !== "string") {
    return NextResponse.json({ message: routeError }, { status: 400 });
  }

  try {
    const result = await createWorkspace(graphqlServer, { name, route });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
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
