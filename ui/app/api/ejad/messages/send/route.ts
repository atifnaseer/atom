import { NextResponse } from "next/server";
import { getServerToken } from "@/lib/auth/session";
import { parseSendMessage } from "@/lib/ejad/messages";
import { httpAdapterUrl } from "@/lib/ejad/messaging-config";
import { SendMessageError, sendDeviceMessage } from "@/lib/ejad/send-message";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";
import { AtomGraphqlError } from "@/lib/graphql/client";
import { graphqlServer } from "@/lib/graphql/server";

const STATUS_BY_CODE: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
};

/**
 * Publishes one SenML record as a connected device. Body:
 * { channelId, deviceId, name, value, unit }. The device key is revealed
 * and used server-side only; the response never contains it.
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
  const input = parseSendMessage(body);
  if (typeof input === "string") {
    return NextResponse.json({ message: input }, { status: 400 });
  }

  try {
    const result = await sendDeviceMessage(graphqlServer, tenantId, input, {
      httpUrl: httpAdapterUrl(),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SendMessageError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    if (error instanceof AtomGraphqlError) {
      const code = error.errors[0]?.extensions?.code ?? "";
      const message =
        code === "NOT_FOUND"
          ? "The device or channel no longer exists."
          : error.message;
      return NextResponse.json(
        { message, code },
        { status: STATUS_BY_CODE[code] ?? 502 },
      );
    }
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { message: "The HTTP adapter did not answer in time." },
        { status: 504 },
      );
    }
    if (error instanceof TypeError) {
      return NextResponse.json(
        { message: "The HTTP adapter is not reachable." },
        { status: 502 },
      );
    }
    throw error;
  }
}
