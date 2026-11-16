// Ejad connections = a device allowed to publish to and/or subscribe to a
// channel, written exactly the way Magistrala does it
// (pkg/atom/policy_service.go):
//
// - connect (PolicyService.AddPolicy): look up the action id for "publish"
//   or "subscribe", create a permission block { tenantId, scopeMode
//   "object", objectKind "resource", objectType "resource:channel",
//   objectId <channel>, effect "allow", conditions {}, actionIds [id] },
//   then a direct policy { tenantId, subjectKind, subjectId <device>,
//   permissionBlockId }. subjectKind comes from policyGrantSubjectKind,
//   which is "entity" for anything that is not a group, so a device is
//   always "entity".
// - disconnect (PolicyService.DeletePolicyFilter): list the device's
//   direct policies in the tenant (subjectKind "entity", 100 per page),
//   collect every policy whose block has exactly that object shape (scope
//   mode, object kind, object type, object id, no group) and carries the
//   action, then delete those direct policies. As in Magistrala, the
//   permission block itself is left in place.
//
// One connection type = one block + one policy, so "publish and subscribe"
// is two of each, the same as two Magistrala Connect calls.

import type { GraphqlFn } from "@/lib/ejad/workspaces";

export const CONNECTION_TYPES = ["publish", "subscribe"] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export const SUBJECT_KIND_ENTITY = "entity";
export const SCOPE_MODE_OBJECT = "object";
export const OBJECT_KIND_RESOURCE = "resource";
export const OBJECT_TYPE_CHANNEL = "resource:channel";
export const EFFECT_ALLOW = "allow";

/** Most devices (or channels) one connect/disconnect request may name. */
export const MAX_CONNECTION_TARGETS = 50;

/** Magistrala's policyPageLimit / capabilityPageLimit. */
export const POLICY_PAGE_LIMIT = 100;

export type PolicyAction = { id: string; name: string };

export type PermissionBlock = {
  id: string;
  tenantId: string | null;
  scopeMode: string;
  objectKind: string | null;
  objectType: string | null;
  objectId: string | null;
  groupId: string | null;
  effect: string;
  actions: PolicyAction[];
};

export type DirectPolicy = {
  id: string;
  tenantId: string | null;
  subjectKind: string;
  subjectId: string;
  permissionBlockId: string;
  permissionBlock: PermissionBlock | null;
};

const BLOCK_FIELDS =
  "id tenantId scopeMode objectKind objectType objectId groupId effect actions { id name }";
const POLICY_FIELDS = `id tenantId subjectKind subjectId permissionBlockId permissionBlock { ${BLOCK_FIELDS} }`;

export const ACTIONS_QUERY = `
  query EjadActions($limit: Int!, $offset: Int!) {
    actions(limit: $limit, offset: $offset) { total items { id name } }
  }
`;

export const CREATE_PERMISSION_BLOCK_MUTATION = `
  mutation EjadCreatePermissionBlock($input: CreatePermissionBlockInput!) {
    createPermissionBlock(input: $input) { ${BLOCK_FIELDS} }
  }
`;

export const CREATE_DIRECT_POLICY_MUTATION = `
  mutation EjadCreateDirectPolicy($input: CreateDirectPolicyInput!) {
    createDirectPolicy(input: $input) { ${POLICY_FIELDS} }
  }
`;

export const DELETE_DIRECT_POLICY_MUTATION = `
  mutation EjadDeleteDirectPolicy($id: ID!) { deleteDirectPolicy(id: $id) }
`;

/** A subject's direct policies in a tenant (Magistrala's ListDirectPolicies). */
export const SUBJECT_POLICIES_QUERY = `
  query EjadSubjectPolicies($tenantId: ID!, $subjectKind: SubjectKind!, $subjectId: ID!, $limit: Int!, $offset: Int!) {
    directPolicies(tenantId: $tenantId, subjectKind: $subjectKind, subjectId: $subjectId, limit: $limit, offset: $offset) {
      total
      items { ${POLICY_FIELDS} }
    }
  }
`;

/** Direct policies whose block names a channel (the channel-side view). */
export const CHANNEL_POLICIES_QUERY = `
  query EjadChannelPolicies($tenantId: ID!, $objectId: ID!, $limit: Int!, $offset: Int!) {
    directPolicies(tenantId: $tenantId, objectId: $objectId, objectKind: "${OBJECT_KIND_RESOURCE}", objectType: "${OBJECT_TYPE_CHANNEL}", limit: $limit, offset: $offset) {
      total
      items { ${POLICY_FIELDS} }
    }
  }
`;

export function isConnectionType(value: unknown): value is ConnectionType {
  return CONNECTION_TYPES.includes(value as ConnectionType);
}

/** Resolves an action name to its id, paging like Magistrala's CapabilityID. */
export async function actionId(gql: GraphqlFn, name: string): Promise<string> {
  for (let offset = 0; ; offset += POLICY_PAGE_LIMIT) {
    const { actions } = await gql<{
      actions: { total: number; items: PolicyAction[] };
    }>({
      query: ACTIONS_QUERY,
      variables: { limit: POLICY_PAGE_LIMIT, offset },
    });
    const match = actions.items.find((action) => action.name === name);
    if (match) return match.id;
    if (
      actions.items.length < POLICY_PAGE_LIMIT ||
      offset + actions.items.length >= actions.total
    )
      break;
  }
  throw new Error(`Action “${name}” not found.`);
}

/** Resolves action ids once per call site (publish + subscribe in one pass). */
export function actionIdResolver(gql: GraphqlFn) {
  const cache = new Map<string, Promise<string>>();
  return (name: ConnectionType) => {
    let id = cache.get(name);
    if (!id) {
      id = actionId(gql, name);
      cache.set(name, id);
      id.catch(() => cache.delete(name));
    }
    return id;
  };
}

/** createPermissionBlock input, as AddPolicy builds it for a channel. */
export function connectionBlockInput(
  tenantId: string,
  channelId: string,
  actionIdValue: string,
) {
  return {
    tenantId,
    scopeMode: SCOPE_MODE_OBJECT,
    objectKind: OBJECT_KIND_RESOURCE,
    objectType: OBJECT_TYPE_CHANNEL,
    objectId: channelId,
    effect: EFFECT_ALLOW,
    conditions: {},
    actionIds: [actionIdValue],
  };
}

/** createDirectPolicy input, as AddPolicy builds it for a device. */
export function connectionPolicyInput(
  tenantId: string,
  deviceId: string,
  permissionBlockId: string,
) {
  return {
    tenantId,
    subjectKind: SUBJECT_KIND_ENTITY,
    subjectId: deviceId,
    permissionBlockId,
  };
}

/**
 * Whether a policy's block is the object shape a connection to `channelId`
 * writes — Magistrala's directPolicyMatches (group id must be empty too).
 */
export function policyTargetsChannel(policy: DirectPolicy, channelId: string) {
  const block = policy.permissionBlock;
  if (!block?.id) return false;
  return (
    block.scopeMode === SCOPE_MODE_OBJECT &&
    block.objectKind === OBJECT_KIND_RESOURCE &&
    block.objectType === OBJECT_TYPE_CHANNEL &&
    block.objectId === channelId &&
    !block.groupId
  );
}

/** Magistrala's blockHasAction. */
export function blockHasAction(
  block: PermissionBlock | null,
  actionIdValue: string,
) {
  return Boolean(block?.actions.some((action) => action.id === actionIdValue));
}

/** Pages through a directPolicies query until every row is loaded. */
async function listAllPolicies(
  gql: GraphqlFn,
  query: string,
  variables: Record<string, unknown>,
): Promise<DirectPolicy[]> {
  const all: DirectPolicy[] = [];
  for (let offset = 0; ; offset += POLICY_PAGE_LIMIT) {
    const { directPolicies } = await gql<{
      directPolicies: { total: number; items: DirectPolicy[] };
    }>({
      query,
      variables: { ...variables, limit: POLICY_PAGE_LIMIT, offset },
    });
    all.push(...directPolicies.items);
    if (
      directPolicies.items.length < POLICY_PAGE_LIMIT ||
      offset + directPolicies.items.length >= directPolicies.total
    )
      break;
  }
  return all;
}

/** Every direct policy held by a device in a workspace. */
export function listDevicePolicies(
  gql: GraphqlFn,
  tenantId: string,
  deviceId: string,
) {
  return listAllPolicies(gql, SUBJECT_POLICIES_QUERY, {
    tenantId,
    subjectKind: SUBJECT_KIND_ENTITY,
    subjectId: deviceId,
  });
}

/** Every direct policy whose block names a channel, in a workspace. */
export function listChannelPolicies(
  gql: GraphqlFn,
  tenantId: string,
  channelId: string,
) {
  return listAllPolicies(gql, CHANNEL_POLICIES_QUERY, {
    tenantId,
    objectId: channelId,
  });
}

/** A device ↔ channel pair and which connection types it has. */
export type Connection = {
  deviceId: string;
  channelId: string;
  publish: boolean;
  subscribe: boolean;
};

/**
 * Folds direct policies into one row per device/channel pair. Only policies
 * a connection could have written count: an entity subject, an allow block
 * of the connection shape, holding publish and/or subscribe.
 */
export function connectionsFromPolicies(
  policies: DirectPolicy[],
): Connection[] {
  const byPair = new Map<string, Connection>();
  for (const policy of policies) {
    const block = policy.permissionBlock;
    if (policy.subjectKind !== SUBJECT_KIND_ENTITY || !block?.objectId)
      continue;
    if (block.effect !== EFFECT_ALLOW) continue;
    if (!policyTargetsChannel(policy, block.objectId)) continue;
    const names = new Set(block.actions.map((action) => action.name));
    const publish = names.has("publish");
    const subscribe = names.has("subscribe");
    if (!publish && !subscribe) continue;
    const key = `${policy.subjectId}\u0000${block.objectId}`;
    const row = byPair.get(key) ?? {
      deviceId: policy.subjectId,
      channelId: block.objectId,
      publish: false,
      subscribe: false,
    };
    row.publish ||= publish;
    row.subscribe ||= subscribe;
    byPair.set(key, row);
  }
  return [...byPair.values()];
}

/** AddPolicy for one device, channel and connection type. */
export async function connect(
  gql: GraphqlFn,
  tenantId: string,
  deviceId: string,
  channelId: string,
  actionIdValue: string,
): Promise<DirectPolicy> {
  const { createPermissionBlock } = await gql<{
    createPermissionBlock: PermissionBlock;
  }>({
    query: CREATE_PERMISSION_BLOCK_MUTATION,
    variables: {
      input: connectionBlockInput(tenantId, channelId, actionIdValue),
    },
  });
  const { createDirectPolicy } = await gql<{
    createDirectPolicy: DirectPolicy;
  }>({
    query: CREATE_DIRECT_POLICY_MUTATION,
    variables: {
      input: connectionPolicyInput(
        tenantId,
        deviceId,
        createPermissionBlock.id,
      ),
    },
  });
  return createDirectPolicy;
}

/**
 * DeletePolicyFilter for one device, channel and connection type: collects
 * every matching direct policy first (deleting while paging would skip
 * rows), then deletes them. Returns how many were deleted.
 */
export async function disconnect(
  gql: GraphqlFn,
  tenantId: string,
  deviceId: string,
  channelId: string,
  actionIdValue: string,
  policies?: DirectPolicy[],
): Promise<number> {
  const all = policies ?? (await listDevicePolicies(gql, tenantId, deviceId));
  const ids = all
    .filter(
      (policy) =>
        policyTargetsChannel(policy, channelId) &&
        blockHasAction(policy.permissionBlock, actionIdValue),
    )
    .map((policy) => policy.id);
  for (const id of ids) {
    await gql({ query: DELETE_DIRECT_POLICY_MUTATION, variables: { id } });
  }
  return ids.length;
}

export type ConnectionRequest = {
  deviceIds: string[];
  channelIds: string[];
  types: ConnectionType[];
};

export type ConnectionFailure = {
  deviceId: string;
  channelId: string;
  type: ConnectionType;
  message: string;
};

export type ConnectionResult = {
  /** Pair/type combinations written (connect) or removed (disconnect). */
  changed: number;
  /** Combinations left alone: already connected / not connected. */
  skipped: number;
  failed: ConnectionFailure[];
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Connects every device to every channel with every type. A device that
 * already holds a matching grant for a channel/type is skipped, so pressing
 * Connect twice does not stack duplicate blocks and policies.
 */
export async function connectMany(
  gql: GraphqlFn,
  tenantId: string,
  request: ConnectionRequest,
): Promise<ConnectionResult> {
  const resolve = actionIdResolver(gql);
  const result: ConnectionResult = { changed: 0, skipped: 0, failed: [] };
  for (const deviceId of request.deviceIds) {
    let existing: DirectPolicy[];
    try {
      existing = await listDevicePolicies(gql, tenantId, deviceId);
    } catch (error) {
      for (const channelId of request.channelIds)
        for (const type of request.types)
          result.failed.push({
            deviceId,
            channelId,
            type,
            message: errorMessage(error),
          });
      continue;
    }
    for (const channelId of request.channelIds) {
      for (const type of request.types) {
        try {
          const id = await resolve(type);
          const already = existing.some(
            (policy) =>
              policyTargetsChannel(policy, channelId) &&
              policy.permissionBlock?.effect === EFFECT_ALLOW &&
              blockHasAction(policy.permissionBlock, id),
          );
          if (already) {
            result.skipped += 1;
            continue;
          }
          await connect(gql, tenantId, deviceId, channelId, id);
          result.changed += 1;
        } catch (error) {
          result.failed.push({
            deviceId,
            channelId,
            type,
            message: errorMessage(error),
          });
        }
      }
    }
  }
  return result;
}

/** Disconnects every device from every channel for every type. */
export async function disconnectMany(
  gql: GraphqlFn,
  tenantId: string,
  request: ConnectionRequest,
): Promise<ConnectionResult> {
  const resolve = actionIdResolver(gql);
  const result: ConnectionResult = { changed: 0, skipped: 0, failed: [] };
  for (const deviceId of request.deviceIds) {
    for (const channelId of request.channelIds) {
      for (const type of request.types) {
        try {
          const id = await resolve(type);
          const removed = await disconnect(
            gql,
            tenantId,
            deviceId,
            channelId,
            id,
          );
          if (removed > 0) result.changed += 1;
          else result.skipped += 1;
        } catch (error) {
          result.failed.push({
            deviceId,
            channelId,
            type,
            message: errorMessage(error),
          });
        }
      }
    }
  }
  return result;
}

/** Validates a route-handler body; returns the request or an error message. */
export function parseConnectionRequest(
  body: unknown,
): ConnectionRequest | string {
  if (body === null || typeof body !== "object" || Array.isArray(body))
    return "invalid request body";
  const { deviceIds, channelIds, types } = body as Record<string, unknown>;
  const isIdList = (value: unknown): value is string[] =>
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim() !== "");
  if (!isIdList(deviceIds)) return "Pick at least one device.";
  if (!isIdList(channelIds)) return "Pick at least one channel.";
  if (
    !Array.isArray(types) ||
    types.length === 0 ||
    !types.every(isConnectionType)
  )
    return "Pick Publish, Subscribe or both.";
  if (deviceIds.length > 1 && channelIds.length > 1)
    return "Connect many devices to one channel, or one device to many channels.";
  if (deviceIds.length > MAX_CONNECTION_TARGETS)
    return `Pick at most ${MAX_CONNECTION_TARGETS} devices at a time.`;
  if (channelIds.length > MAX_CONNECTION_TARGETS)
    return `Pick at most ${MAX_CONNECTION_TARGETS} channels at a time.`;
  return {
    deviceIds: [...new Set(deviceIds)],
    channelIds: [...new Set(channelIds)],
    types: [...new Set(types)],
  };
}
