import { describe, expect, it } from "vitest";
import {
  ERROR_TEXT,
  errorCode,
  errorText,
  friendlyError,
  RequestError,
  requestError,
} from "@/lib/ejad/errors";
import { AtomGraphqlError } from "@/lib/graphql/client";

function atom(code: string | undefined, message = "boom", requestId?: string) {
  return new AtomGraphqlError([
    {
      message,
      extensions: code ? { code, retryable: false, requestId } : undefined,
    },
  ]);
}

describe("friendlyError", () => {
  it("maps every Atom error code to plain language", () => {
    for (const code of Object.keys(ERROR_TEXT)) {
      expect(friendlyError(atom(code)).message).toBe(ERROR_TEXT[code]);
    }
  });

  it("keeps Atom's wording for validation and conflicts", () => {
    const result = friendlyError(atom("CONFLICT", "alias already in use"));
    expect(result.message).toBe(ERROR_TEXT.CONFLICT);
    expect(result.detail).toBe("Alias already in use.");
  });

  it("hides Atom's wording for other codes", () => {
    expect(friendlyError(atom("FORBIDDEN", "forbidden")).detail).toBe(
      undefined,
    );
  });

  it("drops technical detail", () => {
    expect(
      friendlyError(atom("BAD_REQUEST", "GraphQL parse error at 1:5")).detail,
    ).toBe(undefined);
  });

  it("carries the request id", () => {
    expect(friendlyError(atom("INTERNAL", "x", "req-1")).requestId).toBe(
      "req-1",
    );
  });

  it("reports network failures", () => {
    expect(friendlyError(new TypeError("Failed to fetch")).message).toMatch(
      /Cannot reach the server/,
    );
    expect(friendlyError(atom(undefined, "fetch failed")).message).toMatch(
      /Cannot reach the server/,
    );
  });

  it("uses the code an /api/ejad route forwarded", () => {
    const error = new RequestError("forbidden", 403, "FORBIDDEN");
    expect(friendlyError(error).message).toBe(ERROR_TEXT.FORBIDDEN);
  });

  it("falls back to the HTTP status when no code came back", () => {
    expect(errorCode(new RequestError("x", 401))).toBe("UNAUTHENTICATED");
    expect(errorCode(new RequestError("x", 502))).toBe("SERVICE_UNAVAILABLE");
  });

  it("keeps plain messages written by Ejad itself", () => {
    expect(friendlyError(new Error("select a workspace first")).message).toBe(
      "Select a workspace first.",
    );
  });

  it("never shows a bare status line", () => {
    expect(
      friendlyError(new Error("Request failed with status 418")).message,
    ).toBe("Something went wrong. Try again.");
  });
});

describe("errorText", () => {
  it("joins the message and detail", () => {
    expect(errorText(atom("BAD_REQUEST", "name is required"))).toBe(
      `${ERROR_TEXT.BAD_REQUEST} Name is required.`,
    );
  });
});

describe("requestError", () => {
  it("reads message and code from the body", () => {
    const error = requestError(new Response(null, { status: 409 }), {
      message: "taken",
      code: "CONFLICT",
    });
    expect(error.status).toBe(409);
    expect(error.code).toBe("CONFLICT");
    expect(error.message).toBe("taken");
  });

  it("tolerates a non-JSON body", () => {
    const error = requestError(new Response(null, { status: 500 }), null);
    expect(error.message).toBe("Request failed with status 500");
    expect(error.code).toBe(undefined);
  });
});
