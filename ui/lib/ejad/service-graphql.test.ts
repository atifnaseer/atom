// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  graphqlService,
  ServiceTokenMissingError,
} from "@/lib/ejad/service-graphql";

describe("graphqlService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("refuses to run without the service token", async () => {
    vi.stubEnv("EJAD_ATOM_SERVICE_TOKEN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(graphqlService({ query: "{ x }" })).rejects.toBeInstanceOf(
      ServiceTokenMissingError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the service token, not the user's", async () => {
    vi.stubEnv("EJAD_ATOM_SERVICE_TOKEN", "atom_test_service");
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: { ok: true } }), {
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(graphqlService({ query: "{ ok }" })).resolves.toEqual({
      ok: true,
    });
    const init = (
      fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    )[1];
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer atom_test_service",
    );
  });
});
