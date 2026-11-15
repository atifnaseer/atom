import { describe, expect, it } from "vitest";
import {
  CREATE_DEVICE_TYPE_MUTATION,
  CREATE_DEVICE_TYPE_VERSION_MUTATION,
  CREATE_WORKSPACE_MUTATION,
  createWorkspace,
  createWorkspaceInput,
  DEFAULT_DEVICE_TYPES,
  DEVICE_TYPE_VERSIONS_QUERY,
  DEVICE_TYPES_QUERY,
  type GraphqlFn,
  parseMetadata,
  routeFromName,
  updateWorkspaceInput,
  validateRoute,
} from "@/lib/ejad/workspaces";

describe("validateRoute", () => {
  it.each(["a", "riyadh-water", "plant-01", "9lives"])("accepts %s", (r) => {
    expect(validateRoute(r)).toBeNull();
  });

  it.each([
    ["", "required"],
    ["Riyadh", "lowercase"],
    ["has space", "lowercase"],
    ["under_score", "lowercase"],
    ["-lead", "start"],
    ["trail-", "end"],
    ["a".repeat(64), "63"],
    ["123e4567-e89b-12d3-a456-426614174000", "UUID"],
  ])("rejects %j", (route, fragment) => {
    expect(validateRoute(route)).toContain(fragment);
  });
});

describe("routeFromName", () => {
  it("slugifies names into valid routes", () => {
    expect(routeFromName("Riyadh Water  Network!")).toBe(
      "riyadh-water-network",
    );
    expect(routeFromName("  --Plant #1-- ")).toBe("plant-1");
    expect(validateRoute(routeFromName("x".repeat(80)))).toBeNull();
  });
});

describe("createWorkspaceInput", () => {
  it("matches Magistrala's CreateTenant input", () => {
    expect(createWorkspaceInput({ name: " Plant ", route: "plant" })).toEqual({
      name: "Plant",
      alias: "plant",
      attributes: { source: "magistrala", metadata: {} },
    });
  });
});

describe("updateWorkspaceInput", () => {
  it("never sends the route and keeps other attributes", () => {
    const input = updateWorkspaceInput(
      { attributes: { source: "magistrala", metadata: { a: 1 }, extra: true } },
      { name: "New", tags: ["x"], metadata: { b: 2 } },
    );
    expect(input).toEqual({
      name: "New",
      tags: ["x"],
      attributes: { source: "magistrala", metadata: { b: 2 }, extra: true },
    });
    expect(input).not.toHaveProperty("alias");
  });

  it("adds source when missing", () => {
    const input = updateWorkspaceInput(
      { attributes: null },
      { name: "n", tags: [], metadata: {} },
    );
    expect(input.attributes).toEqual({ source: "magistrala", metadata: {} });
  });
});

describe("parseMetadata", () => {
  it("parses objects and treats blank as empty", () => {
    expect(parseMetadata('{"a":1}')).toEqual({ a: 1 });
    expect(parseMetadata("  ")).toEqual({});
  });
  it("rejects non-objects and bad JSON", () => {
    expect(() => parseMetadata("[1]")).toThrow("JSON object");
    expect(() => parseMetadata("{")).toThrow("valid JSON");
  });
});

describe("createWorkspace", () => {
  function fakeGraphql(opts: {
    existingKeys?: string[];
    withVersions?: boolean;
  }) {
    const calls: { query: string; variables?: Record<string, unknown> }[] = [];
    const gql = (async (request) => {
      calls.push(request);
      switch (request.query) {
        case CREATE_WORKSPACE_MUTATION:
          return {
            createTenant: { id: "t1", name: "Plant", alias: "plant" },
          };
        case DEVICE_TYPES_QUERY:
          return {
            profiles: {
              items: (opts.existingKeys ?? []).map((key) => ({
                id: `p-${key}`,
                key,
              })),
            },
          };
        case CREATE_DEVICE_TYPE_MUTATION: {
          const input = request.variables?.input as { key: string };
          return { createProfile: { id: `p-${input.key}` } };
        }
        case DEVICE_TYPE_VERSIONS_QUERY:
          return { profileVersions: opts.withVersions ? [{ id: "v" }] : [] };
        case CREATE_DEVICE_TYPE_VERSION_MUTATION:
          return { createProfileVersion: { id: "v" } };
      }
      throw new Error(`unexpected query ${request.query}`);
    }) as GraphqlFn;
    return { gql, calls };
  }

  it("creates the tenant then seeds every default device type", async () => {
    const { gql, calls } = fakeGraphql({});
    const result = await createWorkspace(gql, {
      name: "Plant",
      route: "plant",
    });

    expect(result.seedError).toBeNull();
    expect(calls[0]).toEqual({
      query: CREATE_WORKSPACE_MUTATION,
      variables: {
        input: {
          name: "Plant",
          alias: "plant",
          attributes: { source: "magistrala", metadata: {} },
        },
      },
    });
    const profiles = calls.filter(
      (c) => c.query === CREATE_DEVICE_TYPE_MUTATION,
    );
    expect(profiles.map((c) => c.variables?.input)).toEqual(
      DEFAULT_DEVICE_TYPES.map((d) => ({ ...d.profile, tenantId: "t1" })),
    );
    const versions = calls.filter(
      (c) => c.query === CREATE_DEVICE_TYPE_VERSION_MUTATION,
    );
    expect(versions).toHaveLength(4);
    expect(versions[0].variables).toEqual({
      profileId: "p-water-meter",
      input: DEFAULT_DEVICE_TYPES[0].version,
    });
  });

  it("skips types and versions that already exist", async () => {
    const { gql, calls } = fakeGraphql({
      existingKeys: DEFAULT_DEVICE_TYPES.map((d) => d.profile.key),
      withVersions: true,
    });
    await createWorkspace(gql, { name: "Plant", route: "plant" });
    expect(
      calls.some(
        (c) =>
          c.query === CREATE_DEVICE_TYPE_MUTATION ||
          c.query === CREATE_DEVICE_TYPE_VERSION_MUTATION,
      ),
    ).toBe(false);
  });

  it("returns the workspace with a seed error if seeding fails", async () => {
    const gql = (async (request) => {
      if (request.query === CREATE_WORKSPACE_MUTATION)
        return { createTenant: { id: "t1" } };
      throw new Error("boom");
    }) as GraphqlFn;
    const result = await createWorkspace(gql, { name: "P", route: "p" });
    expect(result.workspace.id).toBe("t1");
    expect(result.seedError).toBe("boom");
  });
});

describe("DEFAULT_DEVICE_TYPES", () => {
  it("is Magistrala's catalogue", () => {
    expect(DEFAULT_DEVICE_TYPES.map((d) => d.profile.key)).toEqual([
      "water-meter",
      "pressure-sensor",
      "energy-meter",
      "pump-controller",
    ]);
    for (const d of DEFAULT_DEVICE_TYPES) {
      expect(d.profile).toMatchObject({ objectKind: "entity", kind: "device" });
      expect(d.version).toMatchObject({ version: 1, status: "active" });
    }
  });
});
