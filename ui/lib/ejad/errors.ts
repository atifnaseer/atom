// Plain-language error messages for the Ejad UI.
//
// Atom's GraphQL errors carry a stable `extensions.code` (see
// api/v1/graphql-error-contract.md); /api/ejad routes forward it as
// `{ message, code }`. Branch on the code, never on the message text.

import { AtomGraphqlError } from "@/lib/graphql/client";

/** An /api/ejad response that was not ok, keeping Atom's error code. */
export class RequestError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
    requestId?: string,
  ) {
    super(message);
    this.name = "RequestError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

/** Builds a RequestError from a failed response and its parsed JSON body. */
export function requestError(response: Response, payload: unknown) {
  const body =
    payload && typeof payload === "object"
      ? (payload as { message?: unknown; code?: unknown; requestId?: unknown })
      : {};
  return new RequestError(
    typeof body.message === "string" && body.message
      ? body.message
      : `Request failed with status ${response.status}`,
    response.status,
    typeof body.code === "string" && body.code ? body.code : undefined,
    typeof body.requestId === "string" ? body.requestId : undefined,
  );
}

/** Plain-language text for each code in Atom's GraphQL error contract. */
export const ERROR_TEXT: Record<string, string> = {
  BAD_REQUEST: "Some of the details are not valid. Check them and try again.",
  UNAUTHENTICATED: "Your session has ended. Sign in again to continue.",
  FORBIDDEN: "You do not have permission to do this in this workspace.",
  NOT_FOUND: "This item no longer exists, or you cannot see it.",
  CONFLICT:
    "This conflicts with something that already exists or was just changed. Refresh and try again.",
  PAYLOAD_TOO_LARGE:
    "This is too large to send. Make it smaller and try again.",
  RATE_LIMITED: "Too many requests right now. Wait a moment and try again.",
  SERVICE_UNAVAILABLE:
    "The service is temporarily unavailable. Try again in a moment.",
  INTERNAL: "Something went wrong on our side. Try again later.",
};

const NETWORK_TEXT =
  "Cannot reach the server. Check your connection and try again.";
const UNKNOWN_TEXT = "Something went wrong. Try again.";

const CODE_BY_STATUS: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  429: "RATE_LIMITED",
  502: "SERVICE_UNAVAILABLE",
  503: "SERVICE_UNAVAILABLE",
  504: "SERVICE_UNAVAILABLE",
};

/** Codes whose Atom message names the field or object at fault. */
const DETAIL_CODES = new Set(["BAD_REQUEST", "CONFLICT"]);

/** Messages that are already Atom/transport internals, not worth showing. */
const TECHNICAL = /graphql|status \d{3}|malformed|fetch|database|internal/i;

export type FriendlyError = {
  /** The plain-language explanation. */
  message: string;
  /** Atom's own wording, when it adds something (validation, conflicts). */
  detail?: string;
  code?: string;
  /** Quote this to support to find the request in the server logs. */
  requestId?: string;
};

/** The Atom error code of any error the Ejad UI can receive. */
export function errorCode(error: unknown): string | undefined {
  if (error instanceof AtomGraphqlError) {
    return error.errors.find((e) => e.extensions?.code)?.extensions?.code;
  }
  if (error instanceof RequestError) {
    return error.code ?? CODE_BY_STATUS[error.status];
  }
  return undefined;
}

function isNetworkError(error: unknown) {
  if (error instanceof TypeError) return true;
  if (error instanceof AtomGraphqlError) {
    // The transport normalizes a failed fetch to an error with no code.
    return error.errors.every(
      (e) => !e.extensions?.code && /fetch|network/i.test(e.message),
    );
  }
  return false;
}

/** Turns any thrown value into something a client can read. */
export function friendlyError(error: unknown): FriendlyError {
  if (isNetworkError(error)) return { message: NETWORK_TEXT };
  const code = errorCode(error);
  const raw = error instanceof Error ? error.message.trim() : "";
  const requestId =
    error instanceof AtomGraphqlError || error instanceof RequestError
      ? error.requestId
      : undefined;
  const text = code ? ERROR_TEXT[code] : undefined;
  if (text) {
    const detail =
      DETAIL_CODES.has(code ?? "") && raw && !TECHNICAL.test(raw)
        ? sentence(raw)
        : undefined;
    return { message: text, detail, code, requestId };
  }
  // No code: a message written by an /api/ejad route or by Ejad itself
  // ("Select a workspace first."), which is already plain language.
  if (raw && !TECHNICAL.test(raw)) {
    return { message: sentence(raw), code, requestId };
  }
  return { message: UNKNOWN_TEXT, code, requestId };
}

/** One line for a toast or an inline hint. */
export function errorText(error: unknown): string {
  const { message, detail } = friendlyError(error);
  return detail ? `${message} ${detail}` : message;
}

function sentence(text: string) {
  const capital = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(capital) ? capital : `${capital}.`;
}
