// Ejad groups = Atom object groups (group_type "object") in the workspace
// tenant, managed the way Magistrala does in pkg/atom/api.go:
// - createObjectGroup, then setObjectGroupParent when a parent is given
//   (CreateGroupInput has no parentId); if the reparent fails the new group
//   is deleted again;
// - attributes as mapping.go GroupFromFields: { source: "magistrala",
//   parent_id } with empty values left out;
// - setObjectGroupParent / removeObjectGroupParent to move a group;
// - addEntityToObjectGroup / removeEntityFromObjectGroup for devices.
// Channels are Atom resources, not entities, so they use Atom's resource
// counterparts addResourceToObjectGroup / removeResourceFromObjectGroup.
//
// Membership is many-to-many: a device or channel can be in several groups
// (entity/resource objectGroupIds). Listing members uses
// entities/resources(parentGroupId: ...), which filters by that membership.

import { RESOURCE_KIND_CHANNEL } from "@/lib/ejad/channels";
import { type GraphqlFn, MAGISTRALA_SOURCE } from "@/lib/ejad/workspaces";

export type ObjectGroup = {
  id: string;
  name: string;
  description: string | null;
  tenantId: string | null;
  parentId: string | null;
  status: string;
  attributes: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
  managedBy: string | null;
};

export const GROUP_FIELDS =
  "id name description tenantId parentId status attributes createdAt updatedAt managedBy";

/** Atom's page size cap for list queries. */
export const GROUPS_PAGE_LIMIT = 100;

export const OBJECT_GROUPS_QUERY = `
  query EjadObjectGroups($tenantId: ID!, $limit: Int, $offset: Int) {
    objectGroups(tenantId: $tenantId, order: name, dir: asc, limit: $limit, offset: $offset) {
      total
      items { ${GROUP_FIELDS} }
    }
  }
`;

export const GROUP_QUERY = `
  query EjadGroup($id: ID!) {
    group(id: $id) { ${GROUP_FIELDS} groupType }
  }
`;

export const CREATE_GROUP_MUTATION = `
  mutation EjadCreateGroup($input: CreateGroupInput!) {
    createObjectGroup(input: $input) { ${GROUP_FIELDS} }
  }
`;

export const UPDATE_GROUP_MUTATION = `
  mutation EjadUpdateGroup($id: ID!, $input: UpdateGroupInput!) {
    updateGroup(id: $id, input: $input) { ${GROUP_FIELDS} }
  }
`;

export const SET_GROUP_PARENT_MUTATION = `
  mutation EjadSetGroupParent($objectGroupId: ID!, $parentGroupId: ID!) {
    setObjectGroupParent(objectGroupId: $objectGroupId, parentGroupId: $parentGroupId) { ${GROUP_FIELDS} }
  }
`;

export const REMOVE_GROUP_PARENT_MUTATION = `
  mutation EjadRemoveGroupParent($objectGroupId: ID!) {
    removeObjectGroupParent(objectGroupId: $objectGroupId)
  }
`;

export const DELETE_GROUP_MUTATION = `
  mutation EjadDeleteGroup($id: ID!) { deleteGroup(id: $id) }
`;

export const ADD_DEVICE_TO_GROUP_MUTATION = `
  mutation EjadAddDeviceToGroup($entityId: ID!, $objectGroupId: ID!) {
    addEntityToObjectGroup(entityId: $entityId, objectGroupId: $objectGroupId) { id }
  }
`;

export const REMOVE_DEVICE_FROM_GROUP_MUTATION = `
  mutation EjadRemoveDeviceFromGroup($entityId: ID!, $objectGroupId: ID!) {
    removeEntityFromObjectGroup(entityId: $entityId, objectGroupId: $objectGroupId) { id }
  }
`;

export const ADD_CHANNEL_TO_GROUP_MUTATION = `
  mutation EjadAddChannelToGroup($resourceId: ID!, $objectGroupId: ID!) {
    addResourceToObjectGroup(resourceId: $resourceId, objectGroupId: $objectGroupId) { id }
  }
`;

export const REMOVE_CHANNEL_FROM_GROUP_MUTATION = `
  mutation EjadRemoveChannelFromGroup($resourceId: ID!, $objectGroupId: ID!) {
    removeResourceFromObjectGroup(resourceId: $resourceId, objectGroupId: $objectGroupId) { id }
  }
`;

/** Counts of a group's direct devices and channels (limit 0 → total only). */
export const GROUP_MEMBER_COUNTS_QUERY = `
  query EjadGroupMemberCounts($tenantId: ID!, $groupId: ID!) {
    entities(kind: device, tenantId: $tenantId, parentGroupId: $groupId, limit: 1) { total }
    resources(kind: "${RESOURCE_KIND_CHANNEL}", tenantId: $tenantId, parentGroupId: $groupId, limit: 1) { total }
  }
`;

/** Every object group in the workspace, following Atom's page cap. */
export async function fetchAllObjectGroups(
  gql: GraphqlFn,
  tenantId: string,
): Promise<ObjectGroup[]> {
  const all: ObjectGroup[] = [];
  for (let offset = 0; ; offset += GROUPS_PAGE_LIMIT) {
    const { objectGroups } = await gql<{
      objectGroups: { total: number; items: ObjectGroup[] };
    }>({
      query: OBJECT_GROUPS_QUERY,
      variables: { tenantId, limit: GROUPS_PAGE_LIMIT, offset },
    });
    all.push(...objectGroups.items);
    if (
      objectGroups.items.length < GROUPS_PAGE_LIMIT ||
      all.length >= objectGroups.total
    )
      return all;
  }
}

// ---------------------------------------------------------------------------
// Tree

export type GroupNode = {
  group: ObjectGroup;
  depth: number;
  children: GroupNode[];
};

export type GroupTree = {
  roots: GroupNode[];
  byId: Map<string, ObjectGroup>;
};

function byName(a: GroupNode, b: GroupNode) {
  return a.group.name.localeCompare(b.group.name, undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

/**
 * Builds the group tree. A group whose parent is not in the list (deleted,
 * or in another workspace) is shown at the top level.
 */
export function buildGroupTree(groups: ObjectGroup[]): GroupTree {
  const byId = new Map(groups.map((group) => [group.id, group]));
  const nodes = new Map<string, GroupNode>(
    groups.map((group) => [group.id, { group, depth: 0, children: [] }]),
  );
  const roots: GroupNode[] = [];
  for (const node of nodes.values()) {
    const parentId = node.group.parentId;
    const parent =
      parentId && parentId !== node.group.id ? nodes.get(parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  // Atom rejects cycles, but guard anyway: anything not reachable from a
  // root is attached at the top level so it is never hidden.
  const seen = new Set<string>();
  const visit = (node: GroupNode, depth: number) => {
    seen.add(node.group.id);
    node.depth = depth;
    node.children.sort(byName);
    for (const child of node.children)
      if (!seen.has(child.group.id)) visit(child, depth + 1);
  };
  roots.sort(byName);
  for (const root of roots) visit(root, 0);
  for (const node of nodes.values()) {
    if (!seen.has(node.group.id)) {
      // Break the cycle here: detach from its parent, make it a root.
      const parent = node.group.parentId
        ? nodes.get(node.group.parentId)
        : undefined;
      if (parent)
        parent.children = parent.children.filter((child) => child !== node);
      roots.push(node);
      visit(node, 0);
    }
  }
  return { roots, byId };
}

/** Depth-first list of nodes, skipping the children of collapsed ids. */
export function flattenGroupTree(
  roots: GroupNode[],
  collapsed: ReadonlySet<string> = new Set(),
): GroupNode[] {
  const out: GroupNode[] = [];
  const walk = (nodes: GroupNode[]) => {
    for (const node of nodes) {
      out.push(node);
      if (!collapsed.has(node.group.id)) walk(node.children);
    }
  };
  walk(roots);
  return out;
}

/**
 * Ids of groups to show for a name search: matches plus their ancestors,
 * so the tree still reads top-down. Null when there is no search.
 */
export function groupSearchVisibleIds(
  tree: GroupTree,
  q: string,
): Set<string> | null {
  const term = q.trim().toLowerCase();
  if (!term) return null;
  const visible = new Set<string>();
  for (const group of tree.byId.values()) {
    const text = `${group.name} ${group.description ?? ""}`.toLowerCase();
    if (!text.includes(term)) continue;
    for (const ancestor of groupPath(tree.byId, group.id))
      visible.add(ancestor.id);
  }
  return visible;
}

/** Root-to-group chain of groups, ending with the group itself. */
export function groupPath(
  byId: ReadonlyMap<string, ObjectGroup>,
  id: string,
): ObjectGroup[] {
  const path: ObjectGroup[] = [];
  const seen = new Set<string>();
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

/** "Building A / Floor 1 / Room 3" */
export function groupPathLabel(
  byId: ReadonlyMap<string, ObjectGroup>,
  id: string,
): string {
  return groupPath(byId, id)
    .map((group) => group.name)
    .join(" / ");
}

/** Ids of every group below `id` (not including `id`). */
export function descendantIds(
  groups: Iterable<ObjectGroup>,
  id: string,
): Set<string> {
  const children = new Map<string, string[]>();
  for (const group of groups) {
    if (!group.parentId) continue;
    const list = children.get(group.parentId) ?? [];
    list.push(group.id);
    children.set(group.parentId, list);
  }
  const out = new Set<string>();
  const stack = [...(children.get(id) ?? [])];
  while (stack.length) {
    const next = stack.pop() as string;
    if (out.has(next) || next === id) continue;
    out.add(next);
    stack.push(...(children.get(next) ?? []));
  }
  return out;
}

/** Indented select options for every group, in tree order. */
export function groupOptions(
  tree: GroupTree,
  exclude: ReadonlySet<string> = new Set(),
): Array<{ value: string; label: string; depth: number }> {
  return flattenGroupTree(tree.roots)
    .filter((node) => !exclude.has(node.group.id))
    .map((node) => ({
      value: node.group.id,
      label: node.group.name,
      depth: node.depth,
    }));
}

// ---------------------------------------------------------------------------
// Mutations

export type GroupValues = {
  name: string;
  description: string;
};

/** Attributes as Magistrala's GroupFromFields writes them (empties dropped). */
export function groupAttributes(
  parentId: string | null,
  existing: Record<string, unknown> | null = null,
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {
    ...(existing ?? {}),
    source: MAGISTRALA_SOURCE,
  };
  if (parentId) attributes.parent_id = parentId;
  else delete attributes.parent_id;
  return attributes;
}

/** createObjectGroup input, matching Magistrala's groupCreateInput. */
export function createGroupInput(
  tenantId: string,
  values: GroupValues,
  parentId: string | null,
) {
  const input: Record<string, unknown> = {
    name: values.name.trim(),
    tenantId,
    attributes: groupAttributes(parentId),
  };
  const description = values.description.trim();
  if (description) input.description = description;
  return input;
}

/**
 * Creates an object group, then nests it under `parentId` when given. If
 * nesting fails the new group is deleted, as Magistrala's createGroup does.
 */
export async function createGroup(
  gql: GraphqlFn,
  tenantId: string,
  values: GroupValues,
  parentId: string | null,
): Promise<ObjectGroup> {
  const { createObjectGroup: created } = await gql<{
    createObjectGroup: ObjectGroup;
  }>({
    query: CREATE_GROUP_MUTATION,
    variables: { input: createGroupInput(tenantId, values, parentId) },
  });
  if (!parentId) return created;
  try {
    const { setObjectGroupParent } = await gql<{
      setObjectGroupParent: ObjectGroup;
    }>({
      query: SET_GROUP_PARENT_MUTATION,
      variables: { objectGroupId: created.id, parentGroupId: parentId },
    });
    return setObjectGroupParent;
  } catch (error) {
    await gql({
      query: DELETE_GROUP_MUTATION,
      variables: { id: created.id },
    }).catch(() => undefined);
    throw error;
  }
}

/** Renames a group and sets its description (empty clears it). */
export async function updateGroupDetails(
  gql: GraphqlFn,
  id: string,
  values: GroupValues,
): Promise<ObjectGroup> {
  const { updateGroup } = await gql<{ updateGroup: ObjectGroup }>({
    query: UPDATE_GROUP_MUTATION,
    variables: {
      id,
      input: {
        name: values.name.trim(),
        description: values.description.trim(),
      },
    },
  });
  return updateGroup;
}

/**
 * Moves a group under `parentId`, or to the top level when null. Also keeps
 * attributes.parent_id (written by Magistrala at create) in step. Atom
 * replaces attributes wholesale, so the existing ones are carried over.
 */
export async function moveGroup(
  gql: GraphqlFn,
  group: Pick<ObjectGroup, "id" | "attributes">,
  parentId: string | null,
): Promise<void> {
  if (parentId) {
    await gql({
      query: SET_GROUP_PARENT_MUTATION,
      variables: { objectGroupId: group.id, parentGroupId: parentId },
    });
  } else {
    await gql({
      query: REMOVE_GROUP_PARENT_MUTATION,
      variables: { objectGroupId: group.id },
    });
  }
  await gql({
    query: UPDATE_GROUP_MUTATION,
    variables: {
      id: group.id,
      input: { attributes: groupAttributes(parentId, group.attributes) },
    },
  });
}

export type MemberKind = "device" | "channel";

/** Adds or removes one device or channel in a group. */
export function setGroupMembership(
  gql: GraphqlFn,
  kind: MemberKind,
  memberId: string,
  groupId: string,
  member: boolean,
): Promise<unknown> {
  if (kind === "device") {
    return gql({
      query: member
        ? ADD_DEVICE_TO_GROUP_MUTATION
        : REMOVE_DEVICE_FROM_GROUP_MUTATION,
      variables: { entityId: memberId, objectGroupId: groupId },
    });
  }
  return gql({
    query: member
      ? ADD_CHANNEL_TO_GROUP_MUTATION
      : REMOVE_CHANNEL_FROM_GROUP_MUTATION,
    variables: { resourceId: memberId, objectGroupId: groupId },
  });
}

/**
 * Adds or removes many members, a few at a time. Returns the ids that
 * failed with their error messages.
 */
export async function setGroupMemberships(
  gql: GraphqlFn,
  kind: MemberKind,
  memberIds: string[],
  groupId: string,
  member: boolean,
  concurrency = 4,
): Promise<{ done: string[]; failed: Array<{ id: string; error: string }> }> {
  const done: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  let next = 0;
  const worker = async () => {
    while (next < memberIds.length) {
      const id = memberIds[next++];
      try {
        await setGroupMembership(gql, kind, id, groupId, member);
        done.push(id);
      } catch (error) {
        failed.push({ id, error: (error as Error).message });
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, memberIds.length) }, worker),
  );
  return { done, failed };
}

/** objectGroupIds on a device or channel, ignoring anything malformed. */
export function memberGroupIds(item: { objectGroupIds?: unknown }): string[] {
  return Array.isArray(item.objectGroupIds)
    ? item.objectGroupIds.filter((id): id is string => typeof id === "string")
    : [];
}
