// Ejad workspace members and their roles.
//
// A member is an Atom tenant member. Each workspace has three Atom roles,
// each holding one tenant-scoped permission block, the same shape Atom gives
// the tenant-admin role createTenant makes and Magistrala gives migrated
// workspace roles (one tenant-scope block per workspace role):
//   workspace-admin    everything in the workspace, including members
//   workspace-operator devices, channels, connections, groups, dashboards
//   workspace-viewer   read only
// Atom's own `tenant-admin` (given to whoever creates the workspace) counts
// as Admin.

import type { WorkspaceRoleKey } from "@/lib/ejad/access";
import type { GraphqlFn } from "@/lib/ejad/workspaces";

export type WorkspaceRoleDefinition = {
  key: WorkspaceRoleKey;
  /** Atom role name, unique within the tenant. */
  name: string;
  label: string;
  description: string;
  /** Atom actions on the role's tenant-scoped permission block. */
  actions: string[];
};

/** Atom's TENANT_ADMIN_BASE_CAPABILITIES (src/tenants/repo.rs). */
const ADMIN_ACTIONS = [
  "manage",
  "read",
  "write",
  "delete",
  "publish",
  "subscribe",
  "execute",
  "policy.manage",
  "role.manage",
];

export const WORKSPACE_ROLES: WorkspaceRoleDefinition[] = [
  {
    key: "admin",
    name: "workspace-admin",
    label: "Admin",
    description:
      "Ejad workspace Admin: everything in the workspace, including members.",
    actions: ADMIN_ACTIONS,
  },
  {
    key: "operator",
    name: "workspace-operator",
    label: "Operator",
    description:
      "Ejad workspace Operator: devices, channels, connections, groups, dashboards and message storage; no members.",
    // No policy.manage or role.manage: in Atom those add members and assign
    // roles. Connections need policy.manage, so the connections route makes
    // them as the Ejad service account after checking the Operator's role.
    // ensureWorkspaceRoles replaces older Operator blocks that still had it.
    actions: ADMIN_ACTIONS.filter(
      (action) => action !== "role.manage" && action !== "policy.manage",
    ),
  },
  {
    key: "viewer",
    name: "workspace-viewer",
    label: "Viewer",
    description:
      "Ejad workspace Viewer: reads devices, channels, groups, messages and dashboards.",
    // Magistrala's message reader asks for `subscribe` on the channel
    // (readers/api/http/transport.go authorize): reading stored messages
    // is subscribing, so a Viewer needs it alongside `read`.
    actions: ["read", "subscribe"],
  },
];

/** Atom's system role from createTenant; treated as Admin. */
export const TENANT_ADMIN_ROLE = "tenant-admin";

export const ROLE_RANK: Record<WorkspaceRoleKey, number> = {
  admin: 3,
  operator: 2,
  viewer: 1,
};

export function roleDefinition(key: WorkspaceRoleKey) {
  const role = WORKSPACE_ROLES.find((entry) => entry.key === key);
  if (!role) throw new Error(`unknown workspace role ${key}`);
  return role;
}

export function isWorkspaceRoleKey(value: unknown): value is WorkspaceRoleKey {
  return WORKSPACE_ROLES.some((role) => role.key === value);
}

export function roleLabel(key: WorkspaceRoleKey | null) {
  return key ? roleDefinition(key).label : "No role";
}

/** The Ejad role an Atom role name stands for, if any. */
export function roleKeyForName(name: string): WorkspaceRoleKey | null {
  if (name === TENANT_ADMIN_ROLE) return "admin";
  return WORKSPACE_ROLES.find((role) => role.name === name)?.key ?? null;
}

/** The highest Ejad role among a member's Atom role names. */
export function highestRole(names: string[]): WorkspaceRoleKey | null {
  let best: WorkspaceRoleKey | null = null;
  for (const name of names) {
    const key = roleKeyForName(name);
    if (key && (!best || ROLE_RANK[key] > ROLE_RANK[best])) best = key;
  }
  return best;
}

// --- GraphQL ---------------------------------------------------------------

export const PAGE_SIZE = 200;

export const WORKSPACE_ROLES_QUERY = `
  query EjadWorkspaceRoles($tenantId: ID!, $limit: Int!, $offset: Int!) {
    roles(tenantId: $tenantId, limit: $limit, offset: $offset) {
      total
      items {
        id name tenantId
        permissionBlocks { id tenantId scopeMode effect conditions actions { name } }
      }
    }
  }
`;

// With tenantId Atom checks policy-read in the workspace; without it,
// platform-wide (which a workspace's own admin does not have).
export const ACTIONS_QUERY = `
  query EjadRoleActions($tenantId: ID!, $limit: Int!, $offset: Int!) {
    actions(tenantId: $tenantId, limit: $limit, offset: $offset) { total items { id name } }
  }
`;

export const CREATE_ROLE_MUTATION = `
  mutation EjadCreateRole($input: CreateRoleInput!) {
    createRole(input: $input) { id name }
  }
`;

export const CREATE_BLOCK_MUTATION = `
  mutation EjadCreateRoleBlock($input: CreatePermissionBlockInput!) {
    createPermissionBlock(input: $input) { id }
  }
`;

export const REPLACE_ROLE_BLOCKS_MUTATION = `
  mutation EjadReplaceRoleBlocks($roleId: ID!, $permissionBlockIds: [ID!]!) {
    replaceRolePermissionBlocks(roleId: $roleId, permissionBlockIds: $permissionBlockIds)
  }
`;

export const DELETE_BLOCK_MUTATION = `
  mutation EjadDeleteRoleBlock($id: ID!) { deletePermissionBlock(id: $id) }
`;

export const TENANT_MEMBERS_QUERY = `
  query EjadMembers($tenantId: ID!, $limit: Int!, $offset: Int!) {
    tenantMembers(tenantId: $tenantId, limit: $limit, offset: $offset) {
      total
      items { id name kind status tenantId attributes }
    }
  }
`;

export const ROLE_ASSIGNMENTS_QUERY = `
  query EjadRoleAssignments($tenantId: ID!, $limit: Int!, $offset: Int!) {
    roleAssignments(tenantId: $tenantId, subjectKind: entity, limit: $limit, offset: $offset) {
      total
      items { id subjectId roleId role { name } }
    }
  }
`;

export const ASSIGNABLE_QUERY = `
  query EjadAssignable($tenantId: ID!, $q: String!) {
    tenantAssignableEntities(tenantId: $tenantId, q: $q, limit: 20) {
      items { id name kind status tenantId attributes }
    }
  }
`;

export const ADD_MEMBER_MUTATION = `
  mutation EjadAddMember($tenantId: ID!, $entityId: ID!, $roleId: ID) {
    addTenantMember(tenantId: $tenantId, entityId: $entityId, roleId: $roleId)
  }
`;

export const REMOVE_MEMBER_MUTATION = `
  mutation EjadRemoveMember($tenantId: ID!, $entityId: ID!) {
    removeTenantMember(tenantId: $tenantId, entityId: $entityId)
  }
`;

export const DELETE_ROLE_ASSIGNMENT_MUTATION = `
  mutation EjadDeleteRoleAssignment($id: ID!) { deleteRoleAssignment(id: $id) }
`;

/** Reads every page of a `{ total, items }` list. */
export async function readAll<T>(
  read: (offset: number) => Promise<{ total: number; items: T[] }>,
): Promise<T[]> {
  const items: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await read(offset);
    items.push(...page.items);
    if (page.items.length === 0 || items.length >= page.total) return items;
  }
}

// --- Roles -----------------------------------------------------------------

type AtomRoleBlock = {
  id: string;
  tenantId: string | null;
  scopeMode: string;
  effect: string;
  conditions?: Record<string, unknown> | null;
  actions: { name: string }[];
};

type AtomRole = {
  id: string;
  name: string;
  tenantId: string | null;
  permissionBlocks: AtomRoleBlock[];
};

/**
 * Whether a role holds exactly the block Ejad defines for it: one
 * unconditional tenant-scoped allow with the definition's actions.
 */
export function roleMatchesDefinition(
  role: Pick<AtomRole, "permissionBlocks">,
  definition: WorkspaceRoleDefinition,
  tenantId: string,
) {
  if (role.permissionBlocks.length !== 1) return false;
  const [block] = role.permissionBlocks;
  const actions = new Set(block.actions.map((action) => action.name));
  return (
    block.scopeMode === "tenant" &&
    block.tenantId === tenantId &&
    block.effect.toLowerCase() === "allow" &&
    Object.keys(block.conditions ?? {}).length === 0 &&
    actions.size === definition.actions.length &&
    definition.actions.every((action) => actions.has(action))
  );
}

/**
 * Makes sure the workspace has the three Ejad roles, each with exactly its
 * tenant-scoped block: creates missing roles (also for workspaces made
 * before roles existed) and puts the defined block back on a role whose
 * blocks differ (Atom blocks are immutable, so a new one replaces the old,
 * which is then deleted if nothing else uses it). Returns role ids by key. Needs
 * role.manage and policy.manage in the workspace.
 */
export async function ensureWorkspaceRoles(
  gql: GraphqlFn,
  tenantId: string,
): Promise<Record<WorkspaceRoleKey, string>> {
  const roles = await readAll(async (offset) => {
    const data = await gql<{ roles: { total: number; items: AtomRole[] } }>({
      query: WORKSPACE_ROLES_QUERY,
      variables: { tenantId, limit: PAGE_SIZE, offset },
    });
    return data.roles;
  });
  const byName = new Map(
    roles
      .filter((role) => role.tenantId === tenantId)
      .map((role) => [role.name, role]),
  );

  let actionIds: Map<string, string> | null = null;
  const ids = {} as Record<WorkspaceRoleKey, string>;
  for (const definition of WORKSPACE_ROLES) {
    const existing = byName.get(definition.name);
    if (existing && roleMatchesDefinition(existing, definition, tenantId)) {
      ids[definition.key] = existing.id;
      continue;
    }
    actionIds ??= await loadActionIds(gql, tenantId);
    ids[definition.key] = await createRoleWithBlock(
      gql,
      tenantId,
      definition,
      actionIds,
      existing?.id,
    );
    // Atom does not garbage-collect blocks a role stops using. Remove the
    // replaced ones; Atom refuses (and we ignore it) if another role or
    // policy still uses a block.
    for (const block of existing?.permissionBlocks ?? []) {
      await gql({
        query: DELETE_BLOCK_MUTATION,
        variables: { id: block.id },
      }).catch(() => undefined);
    }
  }
  return ids;
}

async function loadActionIds(gql: GraphqlFn, tenantId: string) {
  const actions = await readAll(async (offset) => {
    const data = await gql<{
      actions: { total: number; items: { id: string; name: string }[] };
    }>({
      query: ACTIONS_QUERY,
      variables: { tenantId, limit: PAGE_SIZE, offset },
    });
    return data.actions;
  });
  return new Map(actions.map((action) => [action.name, action.id]));
}

/** Action ids for a role, failing if Atom lacks any of its actions. */
export function roleActionIds(
  definition: WorkspaceRoleDefinition,
  actionIds: Map<string, string>,
) {
  const missing = definition.actions.filter((name) => !actionIds.has(name));
  if (missing.length > 0)
    throw new Error(
      `Atom has no ${missing.join(", ")} action, needed by the ${definition.label} role.`,
    );
  return definition.actions.map((name) => actionIds.get(name) as string);
}

async function createRoleWithBlock(
  gql: GraphqlFn,
  tenantId: string,
  definition: WorkspaceRoleDefinition,
  actionIds: Map<string, string>,
  roleId: string | undefined,
) {
  const blockActionIds = roleActionIds(definition, actionIds);
  // Role first: if a later step fails, the next run finds the role without
  // its block and finishes it instead of leaving an orphan block behind.
  const id =
    roleId ??
    (
      await gql<{ createRole: { id: string } }>({
        query: CREATE_ROLE_MUTATION,
        variables: {
          input: {
            name: definition.name,
            tenantId,
            description: definition.description,
          },
        },
      })
    ).createRole.id;
  const { createPermissionBlock } = await gql<{
    createPermissionBlock: { id: string };
  }>({
    query: CREATE_BLOCK_MUTATION,
    variables: {
      input: {
        tenantId,
        scopeMode: "tenant",
        effect: "allow",
        conditions: {},
        actionIds: blockActionIds,
      },
    },
  });
  await gql({
    query: REPLACE_ROLE_BLOCKS_MUTATION,
    variables: { roleId: id, permissionBlockIds: [createPermissionBlock.id] },
  });
  return id;
}

// --- Members ---------------------------------------------------------------

export type Member = {
  id: string;
  name: string;
  email: string | null;
  status: string;
  role: WorkspaceRoleKey | null;
};

type AtomMember = {
  id: string;
  name: string;
  kind: string;
  status: string;
  tenantId: string | null;
  attributes: Record<string, unknown> | null;
};

type AtomAssignment = {
  id: string;
  subjectId: string;
  roleId: string;
  role: { name: string } | null;
};

export type MemberCandidate = {
  id: string;
  name: string;
  email: string | null;
};

export function entityEmail(attributes: Record<string, unknown> | null) {
  const email = attributes?.email;
  return typeof email === "string" && email ? email : null;
}

async function loadAssignments(gql: GraphqlFn, tenantId: string) {
  return readAll(async (offset) => {
    const data = await gql<{
      roleAssignments: { total: number; items: AtomAssignment[] };
    }>({
      query: ROLE_ASSIGNMENTS_QUERY,
      variables: { tenantId, limit: PAGE_SIZE, offset },
    });
    return data.roleAssignments;
  });
}

/** Members with the Ejad role each holds; humans first by name. */
export function membersWithRoles(
  members: AtomMember[],
  assignments: AtomAssignment[],
): Member[] {
  const names = new Map<string, string[]>();
  for (const assignment of assignments) {
    const list = names.get(assignment.subjectId) ?? [];
    if (assignment.role?.name) list.push(assignment.role.name);
    names.set(assignment.subjectId, list);
  }
  return members
    .filter((member) => member.kind === "human")
    .map((member) => ({
      id: member.id,
      name: member.name,
      email: entityEmail(member.attributes),
      status: member.status,
      role: highestRole(names.get(member.id) ?? []),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listMembers(
  gql: GraphqlFn,
  tenantId: string,
): Promise<Member[]> {
  const [members, assignments] = await Promise.all([
    readAll(async (offset) => {
      const data = await gql<{
        tenantMembers: { total: number; items: AtomMember[] };
      }>({
        query: TENANT_MEMBERS_QUERY,
        variables: { tenantId, limit: PAGE_SIZE, offset },
      });
      return data.tenantMembers;
    }),
    loadAssignments(gql, tenantId),
  ]);
  return membersWithRoles(members, assignments);
}

/** Users that can be added: global humans that are not members yet. */
export async function searchCandidates(
  gql: GraphqlFn,
  tenantId: string,
  q: string,
): Promise<MemberCandidate[]> {
  const data = await gql<{
    tenantAssignableEntities: { items: AtomMember[] };
  }>({ query: ASSIGNABLE_QUERY, variables: { tenantId, q } });
  return data.tenantAssignableEntities.items
    .filter((entity) => entity.kind === "human" && entity.status === "active")
    .map((entity) => ({
      id: entity.id,
      name: entity.name,
      email: entityEmail(entity.attributes),
    }));
}

/** Thrown when a change would leave the workspace without an Admin. */
export class LastAdminError extends Error {
  constructor() {
    super(
      "A workspace needs at least one Admin. Make someone else Admin first.",
    );
    this.name = "LastAdminError";
  }
}

/** Whether removing `entityId`'s Admin role would leave no Admin. */
export function isLastAdmin(members: Member[], entityId: string) {
  const admins = members.filter(
    (member) => member.role === "admin" && member.status === "active",
  );
  return admins.length === 1 && admins[0].id === entityId;
}

export async function addMember(
  gql: GraphqlFn,
  tenantId: string,
  entityId: string,
  role: WorkspaceRoleKey,
) {
  const roleIds = await ensureWorkspaceRoles(gql, tenantId);
  await gql({
    query: ADD_MEMBER_MUTATION,
    variables: { tenantId, entityId, roleId: roleIds[role] },
  });
}

/**
 * Gives a member exactly one Ejad role: assigns the new one first, then
 * drops their other Ejad roles (and tenant-admin), so they never pass
 * through having no role.
 */
export async function changeMemberRole(
  gql: GraphqlFn,
  tenantId: string,
  entityId: string,
  role: WorkspaceRoleKey,
) {
  const members = await listMembers(gql, tenantId);
  const member = members.find((entry) => entry.id === entityId);
  if (!member) throw new MemberNotFoundError();
  if (role !== "admin" && isLastAdmin(members, entityId))
    throw new LastAdminError();

  const roleIds = await ensureWorkspaceRoles(gql, tenantId);
  await gql({
    query: ADD_MEMBER_MUTATION,
    variables: { tenantId, entityId, roleId: roleIds[role] },
  });
  const stale = (await loadAssignments(gql, tenantId)).filter(
    (assignment) =>
      assignment.subjectId === entityId &&
      assignment.roleId !== roleIds[role] &&
      assignment.role?.name !== undefined &&
      roleKeyForName(assignment.role.name) !== null,
  );
  for (const assignment of stale) {
    await gql({
      query: DELETE_ROLE_ASSIGNMENT_MUTATION,
      variables: { id: assignment.id },
    });
  }
}

export class MemberNotFoundError extends Error {
  constructor() {
    super("That user is not a member of this workspace.");
    this.name = "MemberNotFoundError";
  }
}

/** Removes a member (Atom also drops their role assignments). */
export async function removeMember(
  gql: GraphqlFn,
  tenantId: string,
  entityId: string,
) {
  const members = await listMembers(gql, tenantId);
  if (!members.some((member) => member.id === entityId))
    throw new MemberNotFoundError();
  if (isLastAdmin(members, entityId)) throw new LastAdminError();
  await gql({
    query: REMOVE_MEMBER_MUTATION,
    variables: { tenantId, entityId },
  });
}
