import { NextResponse } from "next/server";
import { getServerToken } from "@/lib/auth/session";
import { createDevice } from "@/lib/ejad/devices";
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

/**
 * Creates a device in the selected workspace the way Magistrala does
 * (entity kind "device", then a shared key). Runs server-side so both
 * steps finish together; the response carries the key, shown once.
 */
export async function POST(request: Request) {
  if (!(await getServerToken())) {
    return NextResponse.json(
      { message: "missing authentication" },
      { status: 401 },
    );
  }
  const tenantId = await getServerWorkspaceId();
  if (!tenantId) {
    return NextResponse.json(
      { message: "Select a workspace first." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "invalid JSON" }, { status: 400 });
  }
  const { name, externalId, secret, tags, metadata } = (body ?? {}) as Record<
    string,
    unknown
  >;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ message: "Name is required." }, { status: 400 });
  }
  if (externalId != null && typeof externalId !== "string") {
    return NextResponse.json(
      { message: "External ID must be text." },
      { status: 400 },
    );
  }
  if (secret != null && typeof secret !== "string") {
    return NextResponse.json(
      { message: "Secret must be text." },
      { status: 400 },
    );
  }
  if (
    tags != null &&
    !(Array.isArray(tags) && tags.every((tag) => typeof tag === "string"))
  ) {
    return NextResponse.json(
      { message: "Tags must be a list of text values." },
      { status: 400 },
    );
  }
  if (metadata != null && !isPlainObject(metadata)) {
    return NextResponse.json(
      { message: "Metadata must be a JSON object." },
      { status: 400 },
    );
  }

  try {
    const result = await createDevice(graphqlServer, tenantId, {
      name,
      externalId: externalId ?? undefined,
      secret: secret ?? undefined,
      tags: (tags as string[] | undefined) ?? [],
      metadata: (metadata as Record<string, unknown> | undefined) ?? {},
    });
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
