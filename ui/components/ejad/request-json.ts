import { requestError } from "@/lib/ejad/errors";

/**
 * Calls an /api/ejad route and returns its JSON. A failure throws a
 * RequestError that keeps Atom's error code for friendlyError().
 */
export async function requestJson<T>(
  url: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const { body, ...rest } = init ?? {};
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    ...rest,
    ...(body === undefined
      ? {}
      : {
          body: JSON.stringify(body),
          headers: { "content-type": "application/json", ...rest.headers },
        }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw requestError(response, payload);
  return payload as T;
}
