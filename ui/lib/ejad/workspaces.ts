// Ejad workspaces = Atom tenants, created the way Magistrala does
// (pkg/atom/api.go CreateTenant + mapping.go TenantFromFields):
// the workspace route is the tenant alias and attributes carry
// { source: "magistrala", metadata: {...} }.

import defaultDeviceTypes from "@/lib/ejad/default-device-types.json";

export const MAGISTRALA_SOURCE = "magistrala";

export type Workspace = {
  id: string;
  name: string;
  alias: string | null;
  status: string;
  tags: string[];
  attributes: Record<string, unknown> | null;
  createdAt: string;
};

export const WORKSPACE_FIELDS =
  "id name alias status tags attributes createdAt";

export const WORKSPACES_QUERY = `
  query EjadWorkspaces($limit: Int = 200, $offset: Int = 0) {
    tenants(limit: $limit, offset: $offset) {
      total
      items { ${WORKSPACE_FIELDS} }
    }
  }
`;

export const CREATE_WORKSPACE_MUTATION = `
  mutation EjadCreateWorkspace($input: CreateTenantInput!) {
    createTenant(input: $input) { ${WORKSPACE_FIELDS} }
  }
`;

export const UPDATE_WORKSPACE_MUTATION = `
  mutation EjadUpdateWorkspace($id: ID!, $input: UpdateTenantInput!) {
    updateTenant(id: $id, input: $input) { ${WORKSPACE_FIELDS} }
  }
`;

export const DELETE_WORKSPACE_MUTATION = `
  mutation EjadDeleteWorkspace($id: ID!) { deleteTenant(id: $id) }
`;

// Atom's alias rule (src/models/alias.rs): lowercase letters, digits and
// '-', 1-63 chars, starts with a letter or digit, no trailing '-', and not
// UUID-shaped.
export const ROUTE_MAX_LENGTH = 63;
const UUID_SHAPED =
  /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/;

/** Returns an error message for an invalid route, or null when valid. */
export function validateRoute(route: string): string | null {
  if (route.length === 0) return "Route is required.";
  if (route.length > ROUTE_MAX_LENGTH)
    return `Route must be at most ${ROUTE_MAX_LENGTH} characters.`;
  if (!/^[a-z0-9-]+$/.test(route))
    return "Use only lowercase letters, digits and hyphens.";
  if (route.startsWith("-")) return "Route must start with a letter or digit.";
  if (route.endsWith("-")) return "Route must not end with a hyphen.";
  if (UUID_SHAPED.test(route)) return "Route must not look like a UUID.";
  return null;
}

/** Suggests a valid route from a workspace name ("Riyadh Water" → "riyadh-water"). */
export function routeFromName(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, ROUTE_MAX_LENGTH)
    .replace(/^-+|-+$/g, "");
}

/** Input for createTenant, matching Magistrala's tenantCreateInput. */
export function createWorkspaceInput(values: { name: string; route: string }) {
  return {
    name: values.name.trim(),
    alias: values.route,
    attributes: { source: MAGISTRALA_SOURCE, metadata: {} },
  };
}

/**
 * Input for updateTenant. The route (alias) is omitted so it never changes;
 * attributes are replaced wholesale by Atom, so every other attribute is
 * carried over and only `metadata` is swapped.
 */
export function updateWorkspaceInput(
  workspace: Pick<Workspace, "attributes">,
  values: { name: string; tags: string[]; metadata: Record<string, unknown> },
) {
  return {
    name: values.name.trim(),
    tags: values.tags,
    attributes: {
      ...(workspace.attributes ?? {}),
      source: workspace.attributes?.source ?? MAGISTRALA_SOURCE,
      metadata: values.metadata,
    },
  };
}

export function workspaceMetadata(
  workspace: Pick<Workspace, "attributes">,
): Record<string, unknown> {
  const metadata = workspace.attributes?.metadata;
  return isPlainObject(metadata) ? metadata : {};
}

/** Parses the metadata editor's text; throws with a user-facing message. */
export function parseMetadata(text: string): Record<string, unknown> {
  if (!text.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Metadata must be valid JSON.");
  }
  if (!isPlainObject(parsed))
    throw new Error("Metadata must be a JSON object.");
  return parsed;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// --- Default device types -------------------------------------------------
// Magistrala's CreateTenant seeds this catalogue into every new tenant
// (pkg/atom/default_device_types.go). The JSON is the exact createProfile /
// createProfileVersion input Magistrala's Go code generates.

export type DefaultDeviceType = {
  profile: {
    key: string;
    displayName: string;
    description: string;
    objectKind: string;
    kind: string;
    status: string;
  };
  version: {
    version: number;
    status: string;
    jsonSchema: unknown;
    uiSchema: unknown;
  };
};

export const DEFAULT_DEVICE_TYPES = defaultDeviceTypes as DefaultDeviceType[];

export const DEVICE_TYPES_QUERY = `
  query EjadDeviceTypes($tenantId: ID) {
    profiles(objectKind: "entity", kind: "device", tenantId: $tenantId, limit: 1000) {
      items { id key }
    }
  }
`;

export const DEVICE_TYPE_VERSIONS_QUERY = `
  query EjadDeviceTypeVersions($profileId: ID!) {
    profileVersions(profileId: $profileId) { id }
  }
`;

export const CREATE_DEVICE_TYPE_MUTATION = `
  mutation EjadCreateDeviceType($input: CreateProfileInput!) {
    createProfile(input: $input) { id key }
  }
`;

export const CREATE_DEVICE_TYPE_VERSION_MUTATION = `
  mutation EjadCreateDeviceTypeVersion($profileId: ID!, $input: CreateProfileVersionInput!) {
    createProfileVersion(profileId: $profileId, input: $input) { id }
  }
`;

export type GraphqlFn = <T>(request: {
  query: string;
  variables?: Record<string, unknown>;
}) => Promise<T>;

/**
 * Idempotently seeds the default device types into a tenant, mirroring
 * Magistrala's seedDefaultDeviceTypes: create missing types, and give each
 * type without versions its default version.
 */
export async function seedDefaultDeviceTypes(
  gql: GraphqlFn,
  tenantId: string,
): Promise<void> {
  const existing = await gql<{
    profiles: { items: { id: string; key: string }[] };
  }>({ query: DEVICE_TYPES_QUERY, variables: { tenantId } });
  const byKey = new Map(existing.profiles.items.map((p) => [p.key, p.id]));

  for (const seed of DEFAULT_DEVICE_TYPES) {
    let profileId = byKey.get(seed.profile.key);
    if (!profileId) {
      const created = await gql<{ createProfile: { id: string } }>({
        query: CREATE_DEVICE_TYPE_MUTATION,
        variables: { input: { ...seed.profile, tenantId } },
      });
      profileId = created.createProfile.id;
    }

    const versions = await gql<{ profileVersions: { id: string }[] }>({
      query: DEVICE_TYPE_VERSIONS_QUERY,
      variables: { profileId },
    });
    if (versions.profileVersions.length > 0) continue;

    await gql({
      query: CREATE_DEVICE_TYPE_VERSION_MUTATION,
      variables: { profileId, input: seed.version },
    });
  }
}

/**
 * Creates a workspace exactly like Magistrala's CreateTenant: createTenant
 * (which, in Atom, also gives the caller a tenant-admin role, role
 * assignment and membership in the same transaction), then seed the
 * default device types.
 */
export async function createWorkspace(
  gql: GraphqlFn,
  values: { name: string; route: string },
): Promise<{ workspace: Workspace; seedError: string | null }> {
  const { createTenant } = await gql<{ createTenant: Workspace }>({
    query: CREATE_WORKSPACE_MUTATION,
    variables: { input: createWorkspaceInput(values) },
  });
  try {
    await seedDefaultDeviceTypes(gql, createTenant.id);
    return { workspace: createTenant, seedError: null };
  } catch (error) {
    return {
      workspace: createTenant,
      seedError: error instanceof Error ? error.message : String(error),
    };
  }
}
