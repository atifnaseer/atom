import { describe, expect, it } from "vitest";
import {
  ACTIONS_QUERY,
  ADD_MEMBER_MUTATION,
  CREATE_BLOCK_MUTATION,
  CREATE_ROLE_MUTATION,
  changeMemberRole,
  DELETE_BLOCK_MUTATION,
  DELETE_ROLE_ASSIGNMENT_MUTATION,
  ensureWorkspaceRoles,
  highestRole,
  isLastAdmin,
  LastAdminError,
  type Member,
  membersWithRoles,
  REMOVE_MEMBER_MUTATION,
  REPLACE_ROLE_BLOCKS_MUTATION,
  ROLE_ASSIGNMENTS_QUERY,
  readAll,
  removeMember,
  roleActionIds,
  TENANT_MEMBERS_QUERY,
  WORKSPACE_ROLES,
  WORKSPACE_ROLES_QUERY,
} from "@/lib/ejad/members";
import type { GraphqlFn } from "@/lib/ejad/workspaces";

const ACTION_NAMES = [
  "read",
  "write",
  "delete",
  "manage",
  "publish",
  "subscribe",
  "execute",
  "policy.manage",
  "role.manage",
  "create",
];

type Call = { query: string; variables?: Record<string, unknown> };

/** A fake Atom holding roles, members and assignments for tenant t1. */
function fakeAtom(state: {
  roles?: { id: string; name: string; blocks: number; actions?: string[] }[];
  members?: { id: string; name: string }[];
  assignments?: { id: string; subjectId: string; roleName: string }[];
}) {
  const roles = [...(state.roles ?? [])];
  const calls: Call[] = [];
  let next = 0;
  const roleId = (name: string) => roles.find((r) => r.name === name)?.id;
  const gql = (async (request: Call) => {
    calls.push(request);
    switch (request.query) {
      case WORKSPACE_ROLES_QUERY:
        return {
          roles: {
            total: roles.length,
            items: roles.map((r) => ({
              id: r.id,
              name: r.name,
              tenantId: "t1",
              permissionBlocks: Array.from({ length: r.blocks }, (_, i) => ({
                id: `${r.id}-b${i}`,
                tenantId: "t1",
                scopeMode: "tenant",
                effect: "allow",
                conditions: {},
                actions: (
                  r.actions ??
                  WORKSPACE_ROLES.find((d) => d.name === r.name)?.actions ??
                  []
                ).map((name) => ({ name })),
              })),
            })),
          },
        };
      case ACTIONS_QUERY:
        return {
          actions: {
            total: ACTION_NAMES.length,
            items: ACTION_NAMES.map((name) => ({ id: `act-${name}`, name })),
          },
        };
      case CREATE_ROLE_MUTATION: {
        const input = request.variables?.input as { name: string };
        const id = `role-${++next}`;
        roles.push({ id, name: input.name, blocks: 0 });
        return { createRole: { id, name: input.name } };
      }
      case CREATE_BLOCK_MUTATION:
        return { createPermissionBlock: { id: `block-${++next}` } };
      case REPLACE_ROLE_BLOCKS_MUTATION: {
        const role = roles.find((r) => r.id === request.variables?.roleId);
        if (role) {
          role.blocks = 1;
          role.actions = undefined;
        }
        return { replaceRolePermissionBlocks: true };
      }
      case TENANT_MEMBERS_QUERY:
        return {
          tenantMembers: {
            total: state.members?.length ?? 0,
            items: (state.members ?? []).map((m) => ({
              ...m,
              kind: "human",
              status: "active",
              tenantId: null,
              attributes: {},
            })),
          },
        };
      case ROLE_ASSIGNMENTS_QUERY:
        return {
          roleAssignments: {
            total: state.assignments?.length ?? 0,
            items: (state.assignments ?? []).map((a) => ({
              id: a.id,
              subjectId: a.subjectId,
              roleId: roleId(a.roleName) ?? `other-${a.roleName}`,
              role: { name: a.roleName },
            })),
          },
        };
      case DELETE_BLOCK_MUTATION:
        if (request.variables?.id === "shared") throw new Error("in use");
        return { deletePermissionBlock: true };
      case ADD_MEMBER_MUTATION:
      case REMOVE_MEMBER_MUTATION:
      case DELETE_ROLE_ASSIGNMENT_MUTATION:
        return { ok: true };
    }
    throw new Error(`unexpected query ${request.query}`);
  }) as GraphqlFn;
  const of = (query: string) => calls.filter((c) => c.query === query);
  return { gql, calls, of, roles };
}

const COMPLETE_ROLES = WORKSPACE_ROLES.map((role) => ({
  id: `r-${role.key}`,
  name: role.name,
  blocks: 1,
}));

describe("ensureWorkspaceRoles", () => {
  it("creates all three roles, each with one tenant-scoped block", async () => {
    const atom = fakeAtom({});
    const ids = await ensureWorkspaceRoles(atom.gql, "t1");

    expect(Object.keys(ids).sort()).toEqual(["admin", "operator", "viewer"]);
    expect(
      atom.of(CREATE_ROLE_MUTATION).map((c) => c.variables?.input),
    ).toEqual(
      WORKSPACE_ROLES.map((role) => ({
        name: role.name,
        tenantId: "t1",
        description: role.description,
      })),
    );
    const blocks = atom
      .of(CREATE_BLOCK_MUTATION)
      .map((c) => c.variables?.input);
    expect(blocks).toHaveLength(3);
    for (const [i, role] of WORKSPACE_ROLES.entries())
      expect(blocks[i]).toEqual({
        tenantId: "t1",
        scopeMode: "tenant",
        effect: "allow",
        conditions: {},
        actionIds: role.actions.map((name) => `act-${name}`),
      });
    expect(atom.of(REPLACE_ROLE_BLOCKS_MUTATION)).toHaveLength(3);
    // Scoped to the workspace so its own admin may read the actions.
    expect(atom.of(ACTIONS_QUERY)[0].variables?.tenantId).toBe("t1");
  });

  it("does nothing when the roles exist", async () => {
    const atom = fakeAtom({ roles: COMPLETE_ROLES });
    const ids = await ensureWorkspaceRoles(atom.gql, "t1");
    expect(ids).toEqual({
      admin: "r-admin",
      operator: "r-operator",
      viewer: "r-viewer",
    });
    expect(atom.calls.map((c) => c.query)).toEqual([WORKSPACE_ROLES_QUERY]);
  });

  it("replaces the block of a role whose actions drifted", async () => {
    const atom = fakeAtom({
      roles: [
        ...COMPLETE_ROLES.filter((r) => r.name !== "workspace-viewer"),
        {
          id: "r-viewer",
          name: "workspace-viewer",
          blocks: 1,
          actions: ["read"],
        },
      ],
    });
    const ids = await ensureWorkspaceRoles(atom.gql, "t1");
    expect(ids.viewer).toBe("r-viewer");
    expect(atom.of(CREATE_ROLE_MUTATION)).toHaveLength(0);
    expect(atom.of(CREATE_BLOCK_MUTATION)[0].variables?.input).toMatchObject({
      actionIds: ["act-read", "act-subscribe"],
    });
    expect(atom.of(REPLACE_ROLE_BLOCKS_MUTATION)).toHaveLength(1);
    expect(atom.of(DELETE_BLOCK_MUTATION).map((c) => c.variables?.id)).toEqual([
      "r-viewer-b0",
    ]);
  });

  it("finishes a role left without its block", async () => {
    const atom = fakeAtom({
      roles: [
        ...COMPLETE_ROLES.filter((r) => r.name !== "workspace-viewer"),
        { id: "r-viewer", name: "workspace-viewer", blocks: 0 },
      ],
    });
    const ids = await ensureWorkspaceRoles(atom.gql, "t1");
    expect(ids.viewer).toBe("r-viewer");
    expect(atom.of(CREATE_ROLE_MUTATION)).toHaveLength(0);
    expect(atom.of(REPLACE_ROLE_BLOCKS_MUTATION)[0].variables?.roleId).toBe(
      "r-viewer",
    );
  });
});

describe("roles", () => {
  it("keeps Operator from managing roles and Viewer read-only", () => {
    const [admin, operator, viewer] = WORKSPACE_ROLES;
    expect(admin.actions).toContain("role.manage");
    expect(operator.actions).not.toContain("role.manage");
    expect(operator.actions).toContain("policy.manage");
    // The message reader needs subscribe on the channel to read messages.
    expect(viewer.actions).toEqual(["read", "subscribe"]);
  });

  it("fails clearly when Atom lacks an action", () => {
    expect(() => roleActionIds(WORKSPACE_ROLES[0], new Map())).toThrow(
      /Atom has no manage/,
    );
  });

  it("ranks tenant-admin as Admin and picks the highest role", () => {
    expect(highestRole(["tenant-admin"])).toBe("admin");
    expect(highestRole(["workspace-viewer", "workspace-operator"])).toBe(
      "operator",
    );
    expect(highestRole(["something-else"])).toBeNull();
  });
});

describe("members", () => {
  it("lists human members with their highest role", () => {
    const members = membersWithRoles(
      [
        {
          id: "b",
          name: "bob",
          kind: "human",
          status: "active",
          tenantId: null,
          attributes: { email: "b@x.io" },
        },
        {
          id: "a",
          name: "ann",
          kind: "human",
          status: "active",
          tenantId: null,
          attributes: {},
        },
        {
          id: "d",
          name: "dev",
          kind: "device",
          status: "active",
          tenantId: "t1",
          attributes: {},
        },
      ],
      [
        {
          id: "x1",
          subjectId: "b",
          roleId: "r",
          role: { name: "workspace-viewer" },
        },
        {
          id: "x2",
          subjectId: "a",
          roleId: "r",
          role: { name: "tenant-admin" },
        },
      ],
    );
    expect(members).toEqual([
      { id: "a", name: "ann", email: null, status: "active", role: "admin" },
      {
        id: "b",
        name: "bob",
        email: "b@x.io",
        status: "active",
        role: "viewer",
      },
    ]);
  });

  it("detects the last admin", () => {
    const m = (id: string, role: Member["role"]): Member => ({
      id,
      name: id,
      email: null,
      status: "active",
      role,
    });
    expect(isLastAdmin([m("a", "admin"), m("b", "viewer")], "a")).toBe(true);
    expect(isLastAdmin([m("a", "admin"), m("b", "admin")], "a")).toBe(false);
    expect(isLastAdmin([m("a", "admin"), m("b", "viewer")], "b")).toBe(false);
  });

  it("changes a role: adds the new one, then drops the old ones", async () => {
    const atom = fakeAtom({
      roles: COMPLETE_ROLES,
      members: [
        { id: "admin1", name: "admin" },
        { id: "u1", name: "op" },
      ],
      assignments: [
        { id: "as-0", subjectId: "admin1", roleName: "tenant-admin" },
        { id: "as-1", subjectId: "u1", roleName: "workspace-viewer" },
        { id: "as-2", subjectId: "u1", roleName: "custom-role" },
      ],
    });
    await changeMemberRole(atom.gql, "t1", "u1", "operator");
    expect(atom.of(ADD_MEMBER_MUTATION)[0].variables).toEqual({
      tenantId: "t1",
      entityId: "u1",
      roleId: "r-operator",
    });
    // Only Ejad roles are dropped; custom Atom roles stay.
    expect(
      atom.of(DELETE_ROLE_ASSIGNMENT_MUTATION).map((c) => c.variables?.id),
    ).toEqual(["as-1"]);
    const order = atom.calls.map((c) => c.query);
    expect(order.indexOf(ADD_MEMBER_MUTATION)).toBeLessThan(
      order.indexOf(DELETE_ROLE_ASSIGNMENT_MUTATION),
    );
  });

  it("refuses to demote or remove the last admin", async () => {
    const state = {
      roles: COMPLETE_ROLES,
      members: [{ id: "a", name: "ann" }],
      assignments: [{ id: "as", subjectId: "a", roleName: "tenant-admin" }],
    };
    await expect(
      changeMemberRole(fakeAtom(state).gql, "t1", "a", "viewer"),
    ).rejects.toBeInstanceOf(LastAdminError);
    const atom = fakeAtom(state);
    await expect(removeMember(atom.gql, "t1", "a")).rejects.toBeInstanceOf(
      LastAdminError,
    );
    expect(atom.of(REMOVE_MEMBER_MUTATION)).toHaveLength(0);
  });
});

describe("readAll", () => {
  it("reads until total", async () => {
    const pages = [
      { total: 3, items: [1, 2] },
      { total: 3, items: [3] },
    ];
    let i = 0;
    expect(await readAll(async () => pages[i++])).toEqual([1, 2, 3]);
  });
});
