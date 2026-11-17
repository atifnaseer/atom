// Ejad platform users = global Atom entities of kind "human", created the
// way Magistrala's CLI does (cli/users.go): createEntity with kind "human"
// and attributes.source = "magistrala", then createPassword so the account
// can sign in. Every user also joins Atom's authenticated-users group,
// which lets them create workspaces of their own.

import { entityEmail, PAGE_SIZE, readAll } from "@/lib/ejad/members";
import type { GraphqlFn } from "@/lib/ejad/workspaces";
import { MAGISTRALA_SOURCE } from "@/lib/ejad/workspaces";

export type PlatformUser = {
  id: string;
  name: string;
  email: string | null;
  status: string;
  system: boolean;
  createdAt: string;
};

type AtomUser = {
  id: string;
  name: string;
  status: string;
  tenantId: string | null;
  attributes: Record<string, unknown> | null;
  createdAt: string;
};

const USER_FIELDS = "id name status tenantId attributes createdAt";

export const USERS_QUERY = `
  query EjadUsers($limit: Int!, $offset: Int!) {
    entities(kind: human, limit: $limit, offset: $offset) {
      total
      items { ${USER_FIELDS} }
    }
  }
`;

export const USER_QUERY = `
  query EjadUser($id: ID!) { entity(id: $id) { ${USER_FIELDS} kind } }
`;

export const CREATE_USER_MUTATION = `
  mutation EjadCreateUser($input: CreateEntityInput!) {
    createEntity(input: $input) { ${USER_FIELDS} }
  }
`;

export const CREATE_PASSWORD_MUTATION = `
  mutation EjadCreatePassword($entityId: ID!, $password: String!) {
    createPassword(entityId: $entityId, password: $password)
  }
`;

export const USER_CREDENTIALS_QUERY = `
  query EjadUserCredentials($entityId: ID!) {
    credentials(entityId: $entityId) { items { id kind status } }
  }
`;

export const REVOKE_CREDENTIAL_MUTATION = `
  mutation EjadRevokeUserCredential($entityId: ID!, $credentialId: ID!) {
    revokeCredential(entityId: $entityId, credentialId: $credentialId)
  }
`;

export const ENABLE_USER_MUTATION = `
  mutation EjadEnableUser($id: ID!) { enableEntity(id: $id) { id status } }
`;

export const DISABLE_USER_MUTATION = `
  mutation EjadDisableUser($id: ID!) { disableEntity(id: $id) { id status } }
`;

export const DELETE_USER_MUTATION = `
  mutation EjadDeleteUser($id: ID!) { deleteEntity(id: $id) }
`;

export const MIN_PASSWORD_LENGTH = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error message for an invalid password, or null. */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string" || !password.trim())
    return "Password is required.";
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  return null;
}

export type NewUser = { name: string; email: string | null; password: string };

/** Checks a create-user body; returns the cleaned values or an error. */
export function parseNewUser(body: unknown): NewUser | string {
  const { name, email, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) return "Username is required.";
  if (/\s/.test(name.trim())) return "Username must not contain spaces.";
  if (email != null && typeof email !== "string") return "Email must be text.";
  const cleanEmail = typeof email === "string" ? email.trim() : "";
  if (cleanEmail && !EMAIL.test(cleanEmail)) return "Email is not valid.";
  const passwordError = validatePassword(password);
  if (passwordError) return passwordError;
  return {
    name: name.trim(),
    email: cleanEmail || null,
    password: password as string,
  };
}

/** createEntity input for a platform user, matching Magistrala's shape. */
export function createUserInput(user: Pick<NewUser, "name" | "email">) {
  return {
    kind: "human",
    name: user.name,
    attributes: {
      source: MAGISTRALA_SOURCE,
      ...(user.email ? { email: user.email } : {}),
    },
  };
}

function toUser(user: AtomUser): PlatformUser {
  return {
    id: user.id,
    name: user.name,
    email: entityEmail(user.attributes),
    status: user.status,
    system: user.attributes?.system === true,
    createdAt: user.createdAt,
  };
}

/** Global human users (workspace-local identities are not platform users). */
export async function listUsers(gql: GraphqlFn): Promise<PlatformUser[]> {
  const users = await readAll(async (offset) => {
    const data = await gql<{
      entities: { total: number; items: AtomUser[] };
    }>({ query: USERS_QUERY, variables: { limit: PAGE_SIZE, offset } });
    return data.entities;
  });
  return users
    .filter((user) => user.tenantId === null)
    .map(toUser)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Loads a platform user; null when it is not a global human. */
export async function getUser(
  gql: GraphqlFn,
  id: string,
): Promise<PlatformUser | null> {
  const { entity } = await gql<{
    entity: (AtomUser & { kind: string }) | null;
  }>({ query: USER_QUERY, variables: { id } });
  if (!entity || entity.kind !== "human" || entity.tenantId !== null)
    return null;
  return toUser(entity);
}

/**
 * Creates the user, then its password. If the password is refused the
 * half-made user is deleted again so the username stays free.
 */
export async function createUser(
  gql: GraphqlFn,
  user: NewUser,
): Promise<PlatformUser> {
  const { createEntity } = await gql<{ createEntity: AtomUser }>({
    query: CREATE_USER_MUTATION,
    variables: { input: createUserInput(user) },
  });
  try {
    await gql({
      query: CREATE_PASSWORD_MUTATION,
      variables: { entityId: createEntity.id, password: user.password },
    });
  } catch (error) {
    await gql({
      query: DELETE_USER_MUTATION,
      variables: { id: createEntity.id },
    }).catch(() => undefined);
    throw error;
  }
  return toUser(createEntity);
}

/**
 * Sets a new password: creates it, then revokes every older active
 * password, so only the new one signs in.
 */
export async function resetPassword(
  gql: GraphqlFn,
  entityId: string,
  password: string,
) {
  const before = await gql<{
    credentials: { items: { id: string; kind: string; status: string }[] };
  }>({ query: USER_CREDENTIALS_QUERY, variables: { entityId } });
  await gql({
    query: CREATE_PASSWORD_MUTATION,
    variables: { entityId, password },
  });
  const old = before.credentials.items.filter(
    (credential) =>
      credential.kind === "password" && credential.status === "active",
  );
  for (const credential of old) {
    await gql({
      query: REVOKE_CREDENTIAL_MUTATION,
      variables: { entityId, credentialId: credential.id },
    });
  }
}

export type UserAction = "enable" | "disable" | "reset-password";

export function isUserAction(value: unknown): value is UserAction {
  return (
    value === "enable" || value === "disable" || value === "reset-password"
  );
}
