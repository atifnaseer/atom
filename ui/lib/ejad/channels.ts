// Ejad channels = Atom resources of kind "channel" (object type
// "resource:channel") in the workspace tenant, created the way Magistrala
// does (pkg/atom/mapping.go ResourceFromFields + cli/atom_commands.go):
// attributes { source: "magistrala", route, tags, metadata }, with empty
// values left out (mapping.go compact).
//
// The route lives in attributes.route, not in the resource alias. FluxMQ
// resolves the channel segment of m/<workspace>/c/<channel> through
// pkg/messaging/topics.go resolveChannel: a UUID is used as the channel ID
// as-is; anything else goes to AtomChannelsCompat.RetrieveIDByRoute
// (pkg/atom/grpc_compat.go). That call lists kind=channel resources in the
// workspace with q=<route>, limit 20, and takes the first one whose
// name == route or attributes.route == route. The alias is never read.

import { type GraphqlFn, MAGISTRALA_SOURCE } from "@/lib/ejad/workspaces";

export const RESOURCE_KIND_CHANNEL = "channel";

export type Channel = {
  id: string;
  kind: string;
  name: string | null;
  tenantId: string | null;
  attributes: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
  managedBy: string | null;
};

export const CHANNEL_FIELDS =
  "id kind name tenantId attributes createdAt updatedAt managedBy";

export const CHANNELS_QUERY = `
  query EjadChannels($tenantId: ID!, $q: String, $limit: Int, $offset: Int) {
    resources(kind: "${RESOURCE_KIND_CHANNEL}", tenantId: $tenantId, q: $q, order: created_at, dir: desc, limit: $limit, offset: $offset) {
      total
      items { ${CHANNEL_FIELDS} }
    }
  }
`;

export const CHANNEL_QUERY = `
  query EjadChannel($id: ID!) {
    resource(id: $id) { ${CHANNEL_FIELDS} }
  }
`;

/** Channels in a workspace whose attributes.route is exactly $route. */
export const CHANNELS_BY_ROUTE_QUERY = `
  query EjadChannelsByRoute($tenantId: ID!, $attributes: JSON!) {
    resources(kind: "${RESOURCE_KIND_CHANNEL}", tenantId: $tenantId, attributesContains: $attributes, limit: 100) {
      items { ${CHANNEL_FIELDS} }
    }
  }
`;

/** Text search, used to find channels whose name equals a value. */
export const CHANNELS_SEARCH_QUERY = `
  query EjadChannelsSearch($tenantId: ID!, $q: String!) {
    resources(kind: "${RESOURCE_KIND_CHANNEL}", tenantId: $tenantId, q: $q, limit: 100) {
      items { ${CHANNEL_FIELDS} }
    }
  }
`;

export const CREATE_CHANNEL_MUTATION = `
  mutation EjadCreateChannel($input: CreateResourceInput!) {
    createResource(input: $input) { ${CHANNEL_FIELDS} }
  }
`;

export const DELETE_CHANNEL_MUTATION = `
  mutation EjadDeleteChannel($id: ID!) { deleteResource(id: $id) }
`;

// Magistrala's route rule (api/http/common.go ValidateRoute):
// ^[a-zA-Z][a-zA-Z0-9_-]{0,35}$ and no "__" or "--". A UUID-shaped route
// is also rejected: the topic resolver treats a UUID as a channel ID and
// would never look the route up.
export const CHANNEL_ROUTE_MAX_LENGTH = 36;
const CHANNEL_ROUTE = /^[a-zA-Z][a-zA-Z0-9_-]{0,35}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns an error message for an invalid channel route, or null. */
export function validateChannelRoute(route: string): string | null {
  if (route.length === 0) return "Route is required.";
  if (route.length > CHANNEL_ROUTE_MAX_LENGTH)
    return `Route must be at most ${CHANNEL_ROUTE_MAX_LENGTH} characters.`;
  if (!/^[a-zA-Z]/.test(route)) return "Route must start with a letter.";
  if (!CHANNEL_ROUTE.test(route))
    return "Use only letters, digits, hyphens and underscores.";
  if (route.includes("__") || route.includes("--"))
    return "Route must not contain “__” or “--”.";
  if (UUID.test(route)) return "Route must not look like a UUID.";
  return null;
}

/** Suggests a valid route from a channel name ("Floor 1 / Temp" → "floor-1-temp"). */
export function channelRouteFromName(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/_{2,}/g, "_")
    .replace(/^[^a-z]+/, "")
    .slice(0, CHANNEL_ROUTE_MAX_LENGTH)
    .replace(/[-_]+$/, "");
}

export type ChannelValues = {
  name: string;
  route: string;
  tags: string[];
  metadata: Record<string, unknown>;
};

/** createResource input, matching Magistrala's ResourceFromFields for a channel. */
export function createChannelInput(tenantId: string, values: ChannelValues) {
  const attributes: Record<string, unknown> = {
    source: MAGISTRALA_SOURCE,
    route: values.route.trim(),
  };
  const tags = [
    ...new Set(values.tags.map((tag) => tag.trim()).filter(Boolean)),
  ];
  if (tags.length > 0) attributes.tags = tags;
  if (Object.keys(values.metadata).length > 0)
    attributes.metadata = values.metadata;
  return {
    kind: RESOURCE_KIND_CHANNEL,
    name: values.name.trim(),
    tenantId,
    attributes,
  };
}

function attrString(channel: Pick<Channel, "attributes">, key: string) {
  const value = channel.attributes?.[key];
  return typeof value === "string" ? value : null;
}

export function channelRoute(channel: Pick<Channel, "attributes">) {
  return attrString(channel, "route");
}

export function channelTags(channel: Pick<Channel, "attributes">): string[] {
  const tags = channel.attributes?.tags;
  return Array.isArray(tags)
    ? tags.filter((tag): tag is string => typeof tag === "string")
    : [];
}

export function channelMetadata(
  channel: Pick<Channel, "attributes">,
): Record<string, unknown> {
  const metadata = channel.attributes?.metadata;
  return metadata !== null &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

/** Display name: the resource name, falling back to the route, then the ID. */
export function channelLabel(
  channel: Pick<Channel, "id" | "name" | "attributes">,
) {
  return channel.name || channelRoute(channel) || channel.id;
}

/** MQTT topic for a channel, as FluxMQ resolves it. */
export function channelTopic(workspaceRoute: string, channelRoute: string) {
  return `m/${workspaceRoute}/c/${channelRoute}`;
}

/** A problem with one create-dialog field: an invalid value or a clash. */
export class ChannelInputError extends Error {
  field: "route" | "name";
  code: "BAD_REQUEST" | "CONFLICT";
  constructor(
    field: "route" | "name",
    code: "BAD_REQUEST" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.field = field;
    this.code = code;
  }
}

/**
 * Atom does not keep attributes unique, so check before creating that the
 * new channel cannot be confused with an existing one by the topic
 * resolver, which matches a route against both name and attributes.route:
 * - the route must not equal another channel's route or name;
 * - the name must not equal another channel's route.
 */
export async function findChannelConflict(
  gql: GraphqlFn,
  tenantId: string,
  values: Pick<ChannelValues, "name" | "route">,
): Promise<ChannelInputError | null> {
  const route = values.route.trim();
  const name = values.name.trim();
  type Items = { resources: { items: Channel[] } };
  const [byRoute, byRouteText, byNameAsRoute] = await Promise.all([
    gql<Items>({
      query: CHANNELS_BY_ROUTE_QUERY,
      variables: { tenantId, attributes: { route } },
    }),
    gql<Items>({
      query: CHANNELS_SEARCH_QUERY,
      variables: { tenantId, q: route },
    }),
    name && name !== route
      ? gql<Items>({
          query: CHANNELS_BY_ROUTE_QUERY,
          variables: { tenantId, attributes: { route: name } },
        })
      : Promise.resolve<Items>({ resources: { items: [] } }),
  ]);

  const routeTaken = byRoute.resources.items.find(
    (channel) => channelRoute(channel) === route,
  );
  if (routeTaken)
    return new ChannelInputError(
      "route",
      "CONFLICT",
      `Channel “${channelLabel(routeTaken)}” already uses this route.`,
    );
  const nameClash = byRouteText.resources.items.find(
    (channel) => channel.name === route,
  );
  if (nameClash)
    return new ChannelInputError(
      "route",
      "CONFLICT",
      "Another channel is named exactly like this route, so messages could reach the wrong channel.",
    );
  const nameIsRoute = byNameAsRoute.resources.items.find(
    (channel) => channelRoute(channel) === name,
  );
  if (nameIsRoute)
    return new ChannelInputError(
      "name",
      "CONFLICT",
      `Channel “${channelLabel(nameIsRoute)}” uses this name as its route. Pick another name.`,
    );
  return null;
}

/** Validates, checks for route clashes, and creates the channel. */
export async function createChannel(
  gql: GraphqlFn,
  tenantId: string,
  values: ChannelValues,
): Promise<Channel> {
  const routeError = validateChannelRoute(values.route.trim());
  if (routeError)
    throw new ChannelInputError("route", "BAD_REQUEST", routeError);
  if (!values.name.trim())
    throw new ChannelInputError("name", "BAD_REQUEST", "Name is required.");
  const conflict = await findChannelConflict(gql, tenantId, values);
  if (conflict) throw conflict;
  const { createResource } = await gql<{ createResource: Channel }>({
    query: CREATE_CHANNEL_MUTATION,
    variables: { input: createChannelInput(tenantId, values) },
  });
  return createResource;
}
