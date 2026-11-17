import { describe, expect, it } from "vitest";
import {
  ADD_CHANNEL_TO_GROUP_MUTATION,
  ADD_DEVICE_TO_GROUP_MUTATION,
  buildGroupTree,
  CREATE_GROUP_MUTATION,
  createGroup,
  createGroupInput,
  DELETE_GROUP_MUTATION,
  descendantIds,
  fetchAllObjectGroups,
  flattenGroupTree,
  GROUPS_PAGE_LIMIT,
  groupOptions,
  groupPathLabel,
  groupSearchVisibleIds,
  memberGroupIds,
  moveGroup,
  type ObjectGroup,
  REMOVE_CHANNEL_FROM_GROUP_MUTATION,
  REMOVE_DEVICE_FROM_GROUP_MUTATION,
  REMOVE_GROUP_PARENT_MUTATION,
  SET_GROUP_PARENT_MUTATION,
  setGroupMemberships,
  UPDATE_GROUP_MUTATION,
} from "@/lib/ejad/groups";
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

function group(id: string, parentId: string | null = null): ObjectGroup {
  return {
    id,
    name: id.toUpperCase(),
    description: null,
    tenantId: TENANT,
    parentId,
    status: "active",
    attributes: { source: "magistrala" },
    createdAt: "2026-11-17T00:00:00Z",
    updatedAt: null,
    managedBy: null,
  };
}

// a ─┬─ b ── d
//    └─ c
// e
const GROUPS = [
  group("d", "b"),
  group("c", "a"),
  group("e"),
  group("b", "a"),
  group("a"),
];

describe("buildGroupTree", () => {
  it("nests children under parents, sorted by name, with depths", () => {
    const tree = buildGroupTree(GROUPS);
    const flat = flattenGroupTree(tree.roots).map(
      (node) => `${node.depth}:${node.group.id}`,
    );
    expect(flat).toEqual(["0:a", "1:b", "2:d", "1:c", "0:e"]);
  });

  it("puts a group whose parent is missing at the top level", () => {
    const tree = buildGroupTree([group("x", "gone"), group("y")]);
    expect(tree.roots.map((node) => node.group.id)).toEqual(["x", "y"]);
  });

  it("never hides groups caught in a cycle", () => {
    const tree = buildGroupTree([group("p", "q"), group("q", "p")]);
    const ids = flattenGroupTree(tree.roots).map((node) => node.group.id);
    expect(ids.sort()).toEqual(["p", "q"]);
  });

  it("skips children of collapsed groups", () => {
    const tree = buildGroupTree(GROUPS);
    const ids = flattenGroupTree(tree.roots, new Set(["a"])).map(
      (node) => node.group.id,
    );
    expect(ids).toEqual(["a", "e"]);
  });
});

describe("paths and descendants", () => {
  const tree = buildGroupTree(GROUPS);

  it("labels a group with its path", () => {
    expect(groupPathLabel(tree.byId, "d")).toBe("A / B / D");
  });

  it("finds descendants", () => {
    expect([...descendantIds(GROUPS, "a")].sort()).toEqual(["b", "c", "d"]);
    expect([...descendantIds(GROUPS, "e")]).toEqual([]);
  });

  it("builds indented options, honoring exclusions", () => {
    expect(groupOptions(tree, new Set(["c"]))).toEqual([
      { value: "a", label: "A", depth: 0 },
      { value: "b", label: "B", depth: 1 },
      { value: "d", label: "D", depth: 2 },
      { value: "e", label: "E", depth: 0 },
    ]);
  });

  it("search keeps matches and their ancestors", () => {
    expect(groupSearchVisibleIds(tree, "  ")).toBeNull();
    expect([...(groupSearchVisibleIds(tree, "d") ?? [])].sort()).toEqual([
      "a",
      "b",
      "d",
    ]);
  });
});

describe("createGroupInput", () => {
  it("matches Magistrala's GroupFromFields attributes", () => {
    expect(
      createGroupInput(TENANT, { name: " Floor 1 ", description: "" }, null),
    ).toEqual({
      name: "Floor 1",
      tenantId: TENANT,
      attributes: { source: "magistrala" },
    });
    expect(
      createGroupInput(TENANT, { name: "Room", description: " hot " }, "a"),
    ).toEqual({
      name: "Room",
      tenantId: TENANT,
      description: "hot",
      attributes: { source: "magistrala", parent_id: "a" },
    });
  });
});

describe("createGroup", () => {
  it("creates a top-level group with one call", async () => {
    const { gql, calls } = fakeGql(() => ({ createObjectGroup: group("n") }));
    await createGroup(gql, TENANT, { name: "N", description: "" }, null);
    expect(calls.map((call) => call.query)).toEqual([CREATE_GROUP_MUTATION]);
  });

  it("reparents a child after creating it", async () => {
    const { gql, calls } = fakeGql((call) =>
      call.query === CREATE_GROUP_MUTATION
        ? { createObjectGroup: group("n") }
        : { setObjectGroupParent: group("n", "a") },
    );
    const created = await createGroup(
      gql,
      TENANT,
      { name: "N", description: "" },
      "a",
    );
    expect(created.parentId).toBe("a");
    expect(calls[1]).toEqual({
      query: SET_GROUP_PARENT_MUTATION,
      variables: { objectGroupId: "n", parentGroupId: "a" },
    });
  });

  it("deletes the new group when reparenting fails", async () => {
    const { gql, calls } = fakeGql((call) => {
      if (call.query === CREATE_GROUP_MUTATION)
        return { createObjectGroup: group("n") };
      if (call.query === SET_GROUP_PARENT_MUTATION)
        throw new Error("parent not found");
      return { deleteGroup: true };
    });
    await expect(
      createGroup(gql, TENANT, { name: "N", description: "" }, "a"),
    ).rejects.toThrow("parent not found");
    expect(calls[2]).toEqual({
      query: DELETE_GROUP_MUTATION,
      variables: { id: "n" },
    });
  });
});

describe("moveGroup", () => {
  it("sets the parent and keeps attributes.parent_id in step", async () => {
    const { gql, calls } = fakeGql(() => ({}));
    await moveGroup(
      gql,
      { id: "b", attributes: { source: "magistrala", parent_id: "a", x: 1 } },
      "e",
    );
    expect(calls).toEqual([
      {
        query: SET_GROUP_PARENT_MUTATION,
        variables: { objectGroupId: "b", parentGroupId: "e" },
      },
      {
        query: UPDATE_GROUP_MUTATION,
        variables: {
          id: "b",
          input: {
            attributes: { source: "magistrala", parent_id: "e", x: 1 },
          },
        },
      },
    ]);
  });

  it("removes the parent to move to the top level", async () => {
    const { gql, calls } = fakeGql(() => ({}));
    await moveGroup(
      gql,
      { id: "b", attributes: { source: "magistrala", parent_id: "a" } },
      null,
    );
    expect(calls[0]).toEqual({
      query: REMOVE_GROUP_PARENT_MUTATION,
      variables: { objectGroupId: "b" },
    });
    expect(calls[1].variables).toEqual({
      id: "b",
      input: { attributes: { source: "magistrala" } },
    });
  });
});

describe("memberships", () => {
  it("uses the entity mutations for devices and resource ones for channels", async () => {
    const { gql, calls } = fakeGql(() => ({}));
    await setGroupMemberships(gql, "device", ["d1"], "g", true);
    await setGroupMemberships(gql, "device", ["d1"], "g", false);
    await setGroupMemberships(gql, "channel", ["c1"], "g", true);
    await setGroupMemberships(gql, "channel", ["c1"], "g", false);
    expect(calls).toEqual([
      {
        query: ADD_DEVICE_TO_GROUP_MUTATION,
        variables: { entityId: "d1", objectGroupId: "g" },
      },
      {
        query: REMOVE_DEVICE_FROM_GROUP_MUTATION,
        variables: { entityId: "d1", objectGroupId: "g" },
      },
      {
        query: ADD_CHANNEL_TO_GROUP_MUTATION,
        variables: { resourceId: "c1", objectGroupId: "g" },
      },
      {
        query: REMOVE_CHANNEL_FROM_GROUP_MUTATION,
        variables: { resourceId: "c1", objectGroupId: "g" },
      },
    ]);
  });

  it("reports failures per member and carries on", async () => {
    const { gql } = fakeGql((call) => {
      if (call.variables?.entityId === "bad") throw new Error("forbidden");
      return {};
    });
    const result = await setGroupMemberships(
      gql,
      "device",
      ["ok1", "bad", "ok2"],
      "g",
      true,
    );
    expect(result.done.sort()).toEqual(["ok1", "ok2"]);
    expect(result.failed).toEqual([{ id: "bad", error: "forbidden" }]);
  });

  it("reads objectGroupIds defensively", () => {
    expect(memberGroupIds({})).toEqual([]);
    expect(memberGroupIds({ objectGroupIds: ["a", 3, "b"] })).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("fetchAllObjectGroups", () => {
  it("pages through Atom's page cap", async () => {
    const all = Array.from({ length: GROUPS_PAGE_LIMIT + 3 }, (_, i) =>
      group(`g${i}`),
    );
    const { gql, calls } = fakeGql((call) => {
      const offset = call.variables?.offset as number;
      return {
        objectGroups: {
          total: all.length,
          items: all.slice(offset, offset + GROUPS_PAGE_LIMIT),
        },
      };
    });
    expect(await fetchAllObjectGroups(gql, TENANT)).toHaveLength(all.length);
    expect(calls.map((call) => call.variables?.offset)).toEqual([
      0,
      GROUPS_PAGE_LIMIT,
    ]);
  });
});
