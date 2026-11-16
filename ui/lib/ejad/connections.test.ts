import { describe, expect, it } from "vitest";
import {
  ACTIONS_QUERY,
  CHANNEL_POLICIES_QUERY,
  CREATE_DIRECT_POLICY_MUTATION,
  CREATE_PERMISSION_BLOCK_MUTATION,
  connect,
  connectionBlockInput,
  connectionPolicyInput,
  connectionsFromPolicies,
  connectMany,
  DELETE_DIRECT_POLICY_MUTATION,
  type DirectPolicy,
  disconnect,
  disconnectMany,
  listChannelPolicies,
  type PermissionBlock,
  parseConnectionRequest,
  SUBJECT_POLICIES_QUERY,
} from "@/lib/ejad/connections";
import type { GraphqlFn } from "@/lib/ejad/workspaces";

const TENANT = "6d2e6a73-3dd8-4d36-9374-48a0451f39c2";
const DEVICE = "d0000000-0000-0000-0000-000000000001";
const CHANNEL = "c0000000-0000-0000-0000-000000000001";
const OTHER_CHANNEL = "c0000000-0000-0000-0000-000000000002";
const PUBLISH = { id: "a-pub", name: "publish" };
const SUBSCRIBE = { id: "a-sub", name: "subscribe" };

type Call = { query: string; variables?: Record<string, unknown> };

function fakeGql(handler: (call: Call) => unknown) {
  const calls: Call[] = [];
  const gql = (async (call: Call) => {
    calls.push(call);
    return handler(call);
  }) as GraphqlFn;
  return { gql, calls };
}

function block(over: Partial<PermissionBlock> = {}): PermissionBlock {
  return {
    id: "b1",
    tenantId: TENANT,
    scopeMode: "object",
    objectKind: "resource",
    objectType: "resource:channel",
    objectId: CHANNEL,
    groupId: null,
    effect: "allow",
    actions: [PUBLISH],
    ...over,
  };
}

function policy(
  id: string,
  blockOver: Partial<PermissionBlock> = {},
  over: Partial<DirectPolicy> = {},
): DirectPolicy {
  const b = block({ id: `block-${id}`, ...blockOver });
  return {
    id,
    tenantId: TENANT,
    subjectKind: "entity",
    subjectId: DEVICE,
    permissionBlockId: b.id,
    permissionBlock: b,
    ...over,
  };
}

const actionsPage = {
  actions: { total: 2, items: [PUBLISH, SUBSCRIBE] },
};

describe("AddPolicy inputs", () => {
  it("builds the permission block exactly like Magistrala", () => {
    expect(connectionBlockInput(TENANT, CHANNEL, "a-pub")).toEqual({
      tenantId: TENANT,
      scopeMode: "object",
      objectKind: "resource",
      objectType: "resource:channel",
      objectId: CHANNEL,
      effect: "allow",
      conditions: {},
      actionIds: ["a-pub"],
    });
  });

  it("builds the direct policy with subject kind entity", () => {
    expect(connectionPolicyInput(TENANT, DEVICE, "b1")).toEqual({
      tenantId: TENANT,
      subjectKind: "entity",
      subjectId: DEVICE,
      permissionBlockId: "b1",
    });
  });
});

describe("connect", () => {
  it("creates the block, then the policy that points at it", async () => {
    const { gql, calls } = fakeGql((call) => {
      if (call.query === CREATE_PERMISSION_BLOCK_MUTATION)
        return { createPermissionBlock: block({ id: "new-block" }) };
      if (call.query === CREATE_DIRECT_POLICY_MUTATION)
        return { createDirectPolicy: policy("p1") };
      throw new Error("unexpected");
    });
    await connect(gql, TENANT, DEVICE, CHANNEL, "a-pub");
    expect(calls.map((c) => c.query)).toEqual([
      CREATE_PERMISSION_BLOCK_MUTATION,
      CREATE_DIRECT_POLICY_MUTATION,
    ]);
    expect(calls[1].variables?.input).toEqual({
      tenantId: TENANT,
      subjectKind: "entity",
      subjectId: DEVICE,
      permissionBlockId: "new-block",
    });
  });
});

describe("disconnect", () => {
  it("deletes only policies whose block targets the channel with the action", async () => {
    const policies = [
      policy("match"),
      policy("both", { actions: [PUBLISH, SUBSCRIBE] }),
      policy("sub-only", { actions: [SUBSCRIBE] }),
      policy("other-channel", { objectId: OTHER_CHANNEL }),
      policy("group-scoped", { groupId: "g1" }),
      policy("tenant-scope", {
        scopeMode: "tenant",
        objectKind: null,
        objectType: null,
        objectId: null,
      }),
      policy("no-block", {}, { permissionBlock: null }),
    ];
    const { gql, calls } = fakeGql(() => ({ deleteDirectPolicy: true }));
    const removed = await disconnect(
      gql,
      TENANT,
      DEVICE,
      CHANNEL,
      "a-pub",
      policies,
    );
    expect(removed).toBe(2);
    expect(calls.map((c) => [c.query, c.variables?.id])).toEqual([
      [DELETE_DIRECT_POLICY_MUTATION, "match"],
      [DELETE_DIRECT_POLICY_MUTATION, "both"],
    ]);
  });

  it("lists the device's policies in the tenant, all pages, before deleting", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) =>
      policy(`p${i}`, { objectId: OTHER_CHANNEL }),
    );
    const page2 = [policy("target")];
    const { gql, calls } = fakeGql((call) => {
      if (call.query === SUBJECT_POLICIES_QUERY) {
        const items = call.variables?.offset === 0 ? page1 : page2;
        return { directPolicies: { total: 101, items } };
      }
      return { deleteDirectPolicy: true };
    });
    await disconnect(gql, TENANT, DEVICE, CHANNEL, "a-pub");
    expect(calls[0].variables).toEqual({
      tenantId: TENANT,
      subjectKind: "entity",
      subjectId: DEVICE,
      limit: 100,
      offset: 0,
    });
    expect(calls[1].variables?.offset).toBe(100);
    expect(calls.slice(2).map((c) => c.variables?.id)).toEqual(["target"]);
  });
});

describe("connectionsFromPolicies", () => {
  it("folds policies into one row per device/channel", () => {
    const rows = connectionsFromPolicies([
      policy("p1", { actions: [PUBLISH] }),
      policy("p2", { actions: [SUBSCRIBE] }),
      policy("p3", { objectId: OTHER_CHANNEL, actions: [SUBSCRIBE] }),
      policy("deny", { effect: "deny", objectId: "c-deny" }),
      policy("group", { groupId: "g", objectId: "c-group" }),
      policy("read", { actions: [{ id: "r", name: "read" }], objectId: "c-r" }),
      policy("grp-subject", { objectId: "c-g" }, { subjectKind: "group" }),
    ]);
    expect(rows).toEqual([
      {
        deviceId: DEVICE,
        channelId: CHANNEL,
        publish: true,
        subscribe: true,
      },
      {
        deviceId: DEVICE,
        channelId: OTHER_CHANNEL,
        publish: false,
        subscribe: true,
      },
    ]);
  });
});

describe("listChannelPolicies", () => {
  it("queries by channel object id within the tenant", async () => {
    const { gql, calls } = fakeGql(() => ({
      directPolicies: { total: 0, items: [] },
    }));
    await listChannelPolicies(gql, TENANT, CHANNEL);
    expect(calls[0].query).toBe(CHANNEL_POLICIES_QUERY);
    expect(calls[0].variables).toEqual({
      tenantId: TENANT,
      objectId: CHANNEL,
      limit: 100,
      offset: 0,
    });
    expect(CHANNEL_POLICIES_QUERY).toContain('objectType: "resource:channel"');
  });
});

describe("connectMany / disconnectMany", () => {
  it("skips types the device already has and connects the rest", async () => {
    const created: unknown[] = [];
    const { gql } = fakeGql((call) => {
      if (call.query === ACTIONS_QUERY) return actionsPage;
      if (call.query === SUBJECT_POLICIES_QUERY)
        return { directPolicies: { total: 1, items: [policy("p1")] } };
      if (call.query === CREATE_PERMISSION_BLOCK_MUTATION) {
        created.push(call.variables?.input);
        return { createPermissionBlock: block({ id: "nb" }) };
      }
      if (call.query === CREATE_DIRECT_POLICY_MUTATION)
        return { createDirectPolicy: policy("np") };
      throw new Error(call.query);
    });
    const result = await connectMany(gql, TENANT, {
      deviceIds: [DEVICE],
      channelIds: [CHANNEL],
      types: ["publish", "subscribe"],
    });
    expect(result).toEqual({ changed: 1, skipped: 1, failed: [] });
    expect(created).toEqual([connectionBlockInput(TENANT, CHANNEL, "a-sub")]);
  });

  it("reports per-device failures without stopping the others", async () => {
    const { gql } = fakeGql((call) => {
      if (call.query === ACTIONS_QUERY) return actionsPage;
      if (call.query === SUBJECT_POLICIES_QUERY) {
        if (call.variables?.subjectId === "bad") throw new Error("boom");
        return { directPolicies: { total: 0, items: [] } };
      }
      if (call.query === CREATE_PERMISSION_BLOCK_MUTATION)
        return { createPermissionBlock: block({ id: "nb" }) };
      return { createDirectPolicy: policy("np") };
    });
    const result = await connectMany(gql, TENANT, {
      deviceIds: ["bad", DEVICE],
      channelIds: [CHANNEL],
      types: ["publish"],
    });
    expect(result.changed).toBe(1);
    expect(result.failed).toEqual([
      { deviceId: "bad", channelId: CHANNEL, type: "publish", message: "boom" },
    ]);
  });

  it("counts a type with nothing to delete as skipped", async () => {
    const { gql } = fakeGql((call) => {
      if (call.query === ACTIONS_QUERY) return actionsPage;
      if (call.query === SUBJECT_POLICIES_QUERY)
        return { directPolicies: { total: 1, items: [policy("p1")] } };
      return { deleteDirectPolicy: true };
    });
    const result = await disconnectMany(gql, TENANT, {
      deviceIds: [DEVICE],
      channelIds: [CHANNEL],
      types: ["publish", "subscribe"],
    });
    expect(result).toEqual({ changed: 1, skipped: 1, failed: [] });
  });
});

describe("parseConnectionRequest", () => {
  it("accepts and de-duplicates a valid body", () => {
    expect(
      parseConnectionRequest({
        deviceIds: [DEVICE, DEVICE],
        channelIds: [CHANNEL],
        types: ["subscribe", "publish"],
      }),
    ).toEqual({
      deviceIds: [DEVICE],
      channelIds: [CHANNEL],
      types: ["subscribe", "publish"],
    });
  });

  it("rejects bad bodies", () => {
    expect(parseConnectionRequest(null)).toBeTypeOf("string");
    expect(
      parseConnectionRequest({
        deviceIds: [],
        channelIds: [CHANNEL],
        types: ["publish"],
      }),
    ).toMatch(/device/);
    expect(
      parseConnectionRequest({
        deviceIds: [DEVICE],
        channelIds: [CHANNEL],
        types: ["read"],
      }),
    ).toMatch(/Publish/);
    expect(
      parseConnectionRequest({
        deviceIds: ["a", "b"],
        channelIds: ["c", "d"],
        types: ["publish"],
      }),
    ).toMatch(/one channel/);
    expect(
      parseConnectionRequest({
        deviceIds: Array.from({ length: 51 }, (_, i) => `d${i}`),
        channelIds: [CHANNEL],
        types: ["publish"],
      }),
    ).toMatch(/at most 50/);
  });
});
