import { NextResponse } from "next/server";
import { getServerToken } from "@/lib/auth/session";
import { ChannelInputError, createChannel } from "@/lib/ejad/channels";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";
import { AtomGraphqlError } from "@/lib/graphql/client";
import { graphqlServer } from "@/lib/graphql/server";

const STATUS_BY_CODE: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function bad(message: string, field?: string) {
  return NextResponse.json(
    { message, code: "BAD_REQUEST", field },
    { status: 400 },
  );
}

/**
 * Creates a channel in the selected workspace the way Magistrala does
 * (resource kind "channel", route in attributes.route). Runs server-side so
 * the route clash check and the create happen together.
 */
export async function POST(request: Request) {
  if (!(await getServerToken())) {
    return NextResponse.json(
      { message: "missing authentication" },
      { status: 401 },
    );
  }
  const tenantId = await getServerWorkspaceId();
  if (!tenantId) return bad("Select a workspace first.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad("invalid JSON");
  }
  const { name, route, tags, metadata } = (body ?? {}) as Record<
    string,
    unknown
  >;
  if (typeof name !== "string" || !name.trim())
    return bad("Name is required.", "name");
  if (typeof route !== "string" || !route.trim())
    return bad("Route is required.", "route");
  if (
    tags != null &&
    !(Array.isArray(tags) && tags.every((tag) => typeof tag === "string"))
  )
    return bad("Tags must be a list of text values.");
  if (metadata != null && !isPlainObject(metadata))
    return bad("Metadata must be a JSON object.");

  try {
    const channel = await createChannel(graphqlServer, tenantId, {
      name,
      route,
      tags: (tags as string[] | undefined) ?? [],
      metadata: (metadata as Record<string, unknown> | undefined) ?? {},
    });
    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    if (error instanceof ChannelInputError) {
      return NextResponse.json(
        { message: error.message, code: error.code, field: error.field },
        { status: STATUS_BY_CODE[error.code] },
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
