import { describe, expect, it } from "vitest";
import {
  CHANNELS_BY_ROUTE_QUERY,
  CHANNELS_SEARCH_QUERY,
  type Channel,
  ChannelInputError,
  CREATE_CHANNEL_MUTATION,
  channelLabel,
  channelRouteFromName,
  channelTopic,
  createChannel,
  createChannelInput,
  validateChannelRoute,
} from "@/lib/ejad/channels";
import type { GraphqlFn } from "@/lib/ejad/workspaces";

const TENANT = "6d2e6a73-3dd8-4d36-9374-48a0451f39c2";

type Call = { query: string; variables?: Record<string, unknown> };

function fakeGql(handler: (call: Call) => unknown) {
  const calls: Call[] = [];
  const gql = (async (call: Call) => {
    calls.push(call);
    return handler(call);
  }) as GraphqlFn;
  return { gql, calls };
}

function channel(over: Partial<Channel>): Channel {
  return {
    id: "c1",
    kind: "channel",
    name: "Existing",
    tenantId: TENANT,
    attributes: { source: "magistrala", route: "existing" },
    createdAt: "2026-11-16T00:00:00Z",
    updatedAt: null,
    managedBy: null,
    ...over,
  };
}

describe("validateChannelRoute", () => {
  it("accepts Magistrala routes", () => {
    for (const route of ["a", "temp", "Floor_1-temp", `a${"b".repeat(35)}`]) {
      expect(validateChannelRoute(route)).toBeNull();
    }
  });

  it("rejects what Magistrala's ValidateRoute rejects", () => {
    expect(validateChannelRoute("")).toMatch(/required/);
    expect(validateChannelRoute("1abc")).toMatch(/start with a letter/);
    expect(validateChannelRoute("-abc")).toMatch(/start with a letter/);
    expect(validateChannelRoute("a.b")).toMatch(/letters, digits/);
    expect(validateChannelRoute("a/b")).toMatch(/letters, digits/);
    expect(validateChannelRoute("a b")).toMatch(/letters, digits/);
    expect(validateChannelRoute(`a${"b".repeat(36)}`)).toMatch(/at most 36/);
    expect(validateChannelRoute("a__b")).toMatch(/__/);
    expect(validateChannelRoute("a--b")).toMatch(/__/);
  });

  it("rejects UUID-shaped routes, which the resolver treats as IDs", () => {
    expect(
      validateChannelRoute("a5370e71-4ac4-42cb-a4db-2702f76c3c80"),
    ).toMatch(/UUID/);
  });
});

describe("channelRouteFromName", () => {
  it("suggests a valid route", () => {
    expect(channelRouteFromName("Floor 1 / Temp")).toBe("floor-1-temp");
    expect(channelRouteFromName("  2nd floor  ")).toBe("nd-floor");
    expect(channelRouteFromName("a__b")).toBe("a_b");
    for (const name of ["Floor 1 / Temp", "x".repeat(80), "Hello -- World!"]) {
      const route = channelRouteFromName(name);
      expect(validateChannelRoute(route)).toBeNull();
    }
  });
});

describe("createChannelInput", () => {
  it("matches Magistrala's ResourceFromFields", () => {
    expect(
      createChannelInput(TENANT, {
        name: " Floor 1 ",
        route: " floor-1 ",
        tags: ["a", " b ", "", "a"],
        metadata: { unit: "C" },
      }),
    ).toEqual({
      kind: "channel",
      name: "Floor 1",
      tenantId: TENANT,
      attributes: {
        source: "magistrala",
        route: "floor-1",
        tags: ["a", "b"],
        metadata: { unit: "C" },
      },
    });
  });

  it("leaves out empty tags and metadata", () => {
    expect(
      createChannelInput(TENANT, {
        name: "x",
        route: "x",
        tags: [],
        metadata: {},
      }).attributes,
    ).toEqual({ source: "magistrala", route: "x" });
  });
});

describe("helpers", () => {
  it("builds the topic and label", () => {
    expect(channelTopic("plant", "temp")).toBe("m/plant/c/temp");
    expect(channelLabel(channel({ name: null }))).toBe("existing");
  });
});

describe("createChannel", () => {
  const values = { name: "New", route: "new", tags: [], metadata: {} };

  function handler(items: {
    byRoute?: Channel[];
    search?: Channel[];
    byName?: Channel[];
  }) {
    return (call: Call) => {
      if (call.query === CREATE_CHANNEL_MUTATION)
        return { createResource: channel({ id: "new" }) };
      if (call.query === CHANNELS_SEARCH_QUERY)
        return { resources: { items: items.search ?? [] } };
      if (call.query === CHANNELS_BY_ROUTE_QUERY) {
        const route = (call.variables?.attributes as { route: string }).route;
        return {
          resources: {
            items:
              (route === values.route ? items.byRoute : items.byName) ?? [],
          },
        };
      }
      throw new Error(`unexpected ${call.query}`);
    };
  }

  it("creates when nothing clashes", async () => {
    const { gql, calls } = fakeGql(handler({}));
    const created = await createChannel(gql, TENANT, values);
    expect(created.id).toBe("new");
    const create = calls.find((call) => call.query === CREATE_CHANNEL_MUTATION);
    expect(create?.variables?.input).toEqual(
      createChannelInput(TENANT, values),
    );
    const byRoute = calls.find((c) => c.query === CHANNELS_BY_ROUTE_QUERY);
    expect(byRoute?.variables).toEqual({
      tenantId: TENANT,
      attributes: { route: "new" },
    });
  });

  it("rejects a route already used by another channel", async () => {
    const { gql, calls } = fakeGql(
      handler({ byRoute: [channel({ attributes: { route: "new" } })] }),
    );
    await expect(createChannel(gql, TENANT, values)).rejects.toMatchObject({
      field: "route",
      code: "CONFLICT",
    });
    expect(calls.some((c) => c.query === CREATE_CHANNEL_MUTATION)).toBe(false);
  });

  it("rejects a route equal to another channel's name", async () => {
    const { gql } = fakeGql(
      handler({
        search: [channel({ name: "newer" }), channel({ name: "new" })],
      }),
    );
    await expect(createChannel(gql, TENANT, values)).rejects.toMatchObject({
      field: "route",
      code: "CONFLICT",
    });
  });

  it("ignores substring matches from the text search", async () => {
    const { gql } = fakeGql(handler({ search: [channel({ name: "newer" })] }));
    await expect(createChannel(gql, TENANT, values)).resolves.toBeTruthy();
  });

  it("rejects a name equal to another channel's route", async () => {
    const { gql } = fakeGql(
      handler({ byName: [channel({ attributes: { route: "New" } })] }),
    );
    await expect(createChannel(gql, TENANT, values)).rejects.toMatchObject({
      field: "name",
      code: "CONFLICT",
    });
  });

  it("rejects an invalid route without calling Atom", async () => {
    const { gql, calls } = fakeGql(handler({}));
    const error = await createChannel(gql, TENANT, {
      ...values,
      route: "1bad",
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ChannelInputError);
    expect(error).toMatchObject({ field: "route", code: "BAD_REQUEST" });
    expect(calls).toHaveLength(0);
  });
});
