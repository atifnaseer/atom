// Atom GraphQL as the Ejad UI's own service account (MG_ATOM_TOKEN_EJAD_UI in
// Magistrala, EJAD_ATOM_SERVICE_TOKEN here).
//
// Server-side only, and only for the connect/disconnect route: workspace
// Operators may connect devices to channels, but in Atom that needs
// `policy.manage`, which also adds members and assigns roles. So Operators do
// not get `policy.manage`; the route checks their role and the workspace of
// every device and channel first, then makes the change with this token.
// The token is never sent to the browser and never logged.

import {
  AtomGraphqlError,
  fetchGraphqlRaw,
  getGraphqlEndpoint,
} from "@/lib/graphql/client";

export class ServiceTokenMissingError extends Error {
  constructor() {
    super("Connecting devices is not configured on this server.");
    this.name = "ServiceTokenMissingError";
  }
}

function serviceToken() {
  if (typeof window !== "undefined") throw new ServiceTokenMissingError();
  const token = process.env.EJAD_ATOM_SERVICE_TOKEN?.trim();
  if (!token) throw new ServiceTokenMissingError();
  return token;
}

/** Same contract as graphqlServer, authenticated as the Ejad UI service. */
export async function graphqlService<TData>({
  query,
  variables,
}: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<TData> {
  const { data, errors } = await fetchGraphqlRaw<TData>(getGraphqlEndpoint(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${serviceToken()}`,
    },
    cache: "no-store",
    body: JSON.stringify({ query, variables }),
  });
  if (errors.length > 0) throw new AtomGraphqlError(errors);
  return data as TData;
}
