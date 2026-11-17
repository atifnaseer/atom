import { describe, expect, it } from "vitest";
import {
  abilitiesFromActions,
  accessCheckMutation,
  accessFromCheck,
  checkAlias,
  roleFromAbilities,
  rolesFromCheck,
  WORKSPACE_CHECK_ACTIONS,
  workspaceRolesMutation,
  workspaceRolesVariables,
} from "@/lib/ejad/access";
import { WORKSPACE_ROLES } from "@/lib/ejad/members";

const actionsOf = (key: string) =>
  new Set(WORKSPACE_ROLES.find((role) => role.key === key)?.actions);

describe("abilities", () => {
  it("gives each workspace role exactly its abilities", () => {
    expect(abilitiesFromActions(actionsOf("admin"))).toEqual({
      view: true,
      manage: true,
      connect: true,
      members: true,
    });
    expect(abilitiesFromActions(actionsOf("operator"))).toEqual({
      view: true,
      manage: true,
      connect: true,
      members: false,
    });
    expect(abilitiesFromActions(actionsOf("viewer"))).toEqual({
      view: true,
      manage: false,
      connect: false,
      members: false,
    });
  });

  it("needs both role.manage and policy.manage for members", () => {
    expect(
      abilitiesFromActions(new Set(["read", "manage", "role.manage"])).members,
    ).toBe(false);
  });

  it("maps abilities back to the role", () => {
    for (const role of WORKSPACE_ROLES)
      expect(roleFromAbilities(abilitiesFromActions(actionsOf(role.key)))).toBe(
        role.key,
      );
    expect(roleFromAbilities(abilitiesFromActions(new Set()))).toBeNull();
  });
});

describe("accessCheckMutation", () => {
  it("checks every workspace action on the tenant, aliased", () => {
    const query = accessCheckMutation(true);
    for (const action of WORKSPACE_CHECK_ACTIONS)
      expect(query).toContain(
        `${checkAlias(action)}: authzCheck(input: { subjectId: $subjectId, action: "${action}", objectKind: "tenant", objectId: $workspaceId })`,
      );
    expect(checkAlias("policy.manage")).toBe("a_policy_manage");
  });

  it("only checks the platform without a workspace", () => {
    const query = accessCheckMutation(false);
    expect(query).not.toContain("$workspaceId");
    expect(query).toContain("platform: authzCheck");
  });
});

describe("accessFromCheck", () => {
  const yes = { allowed: true };
  const no = { allowed: false };

  it("reads an operator", () => {
    const access = accessFromCheck("u1", "t1", {
      platform: no,
      a_read: yes,
      a_manage: yes,
      a_policy_manage: yes,
      a_role_manage: no,
    });
    expect(access).toMatchObject({
      entityId: "u1",
      workspaceId: "t1",
      platformAdmin: false,
      role: "operator",
    });
    expect(access.can.members).toBe(false);
  });

  it("treats missing answers as denied", () => {
    const access = accessFromCheck("u1", "t1", {});
    expect(access.role).toBeNull();
    expect(access.platformAdmin).toBe(false);
  });

  it("ignores workspace answers without a workspace", () => {
    const access = accessFromCheck("u1", null, { platform: yes, a_read: yes });
    expect(access.platformAdmin).toBe(true);
    expect(access.can.view).toBe(false);
  });
});

describe("workspace roles across workspaces", () => {
  it("builds one variable per workspace", () => {
    expect(workspaceRolesVariables("u1", ["a", "b"])).toEqual({
      subjectId: "u1",
      w0: "a",
      w1: "b",
    });
    const query = workspaceRolesMutation(["a", "b"]);
    expect(query).toContain("$w1: ID!");
    expect(query).toContain(
      'w1_a_role_manage: authzCheck(input: { subjectId: $subjectId, action: "role.manage", objectKind: "tenant", objectId: $w1 })',
    );
  });

  it("reads each workspace's role", () => {
    const yes = { allowed: true };
    expect(
      rolesFromCheck(["a", "b", "c"], {
        w0_a_read: yes,
        w0_a_manage: yes,
        w0_a_role_manage: yes,
        w0_a_policy_manage: yes,
        w1_a_read: yes,
      }),
    ).toEqual({ a: "admin", b: "viewer", c: null });
  });
});
