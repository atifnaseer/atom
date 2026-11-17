// Plain-language error messages for the Ejad UI.
//
// Atom's GraphQL errors carry a stable `extensions.code` (see
// api/v1/graphql-error-contract.md); /api/ejad routes forward it as
// `{ message, code }`. Branch on the code, never on the message text.

import {
  type Locale,
  localizeText,
  pageLocale,
  translate,
} from "@/lib/ejad/i18n/core";
import type { MessageKey } from "@/lib/ejad/i18n/messages";
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

/** The codes in Atom's GraphQL error contract (texts in i18n/messages.ts). */
export const ERROR_CODES = [
  "BAD_REQUEST",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMITED",
  "SERVICE_UNAVAILABLE",
  "INTERNAL",
] as const;

function codeText(locale: Locale, code: string | undefined) {
  return code && (ERROR_CODES as readonly string[]).includes(code)
    ? translate(locale, `error.${code}` as MessageKey)
    : undefined;
}

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
export function friendlyError(
  error: unknown,
  locale: Locale = pageLocale(),
): FriendlyError {
  if (isNetworkError(error))
    return { message: translate(locale, "error.network") };
  const code = errorCode(error);
  const raw = error instanceof Error ? error.message.trim() : "";
  const requestId =
    error instanceof AtomGraphqlError || error instanceof RequestError
      ? error.requestId
      : undefined;
  const text = codeText(locale, code);
  if (text) {
    const detail =
      DETAIL_CODES.has(code ?? "") && raw && !TECHNICAL.test(raw)
        ? localizeText(locale, sentence(raw))
        : undefined;
    return { message: text, detail, code, requestId };
  }
  // No code: a message written by an /api/ejad route or by Ejad itself
  // ("Select a workspace first."), which is already plain language.
  if (raw && !TECHNICAL.test(raw)) {
    return { message: localizeText(locale, sentence(raw)), code, requestId };
  }
  return { message: translate(locale, "error.unknown"), code, requestId };
}

/** One line for a toast or an inline hint. */
export function errorText(
  error: unknown,
  locale: Locale = pageLocale(),
): string {
  const { message, detail } = friendlyError(error, locale);
  return detail ? `${message} ${detail}` : message;
}

function sentence(text: string) {
  const capital = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(capital) ? capital : `${capital}.`;
}
