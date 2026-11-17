import { describe, expect, it } from "vitest";
import {
  CREATE_PASSWORD_MUTATION,
  CREATE_USER_MUTATION,
  createUser,
  createUserInput,
  DELETE_USER_MUTATION,
  parseNewUser,
  REVOKE_CREDENTIAL_MUTATION,
  resetPassword,
  USER_CREDENTIALS_QUERY,
  validatePassword,
} from "@/lib/ejad/users";
import type { GraphqlFn } from "@/lib/ejad/workspaces";

type Call = { query: string; variables?: Record<string, unknown> };

describe("parseNewUser", () => {
  it("cleans valid input", () => {
    expect(
      parseNewUser({ name: " jane ", email: " j@x.io ", password: "12345678" }),
    ).toEqual({ name: "jane", email: "j@x.io", password: "12345678" });
    expect(parseNewUser({ name: "jane", password: "12345678" })).toMatchObject({
      email: null,
    });
  });

  it("rejects bad input", () => {
    expect(parseNewUser({ password: "12345678" })).toBe(
      "Username is required.",
    );
    expect(parseNewUser({ name: "a b", password: "12345678" })).toMatch(
      /spaces/,
    );
    expect(
      parseNewUser({ name: "a", email: "nope", password: "12345678" }),
    ).toBe("Email is not valid.");
    expect(parseNewUser({ name: "a", password: "short" })).toMatch(
      /at least 8/,
    );
    expect(validatePassword("        ")).toBe("Password is required.");
  });
});

describe("createUser", () => {
  it("creates a Magistrala-style human, then its password", async () => {
    expect(createUserInput({ name: "jane", email: "j@x.io" })).toEqual({
      kind: "human",
      name: "jane",
      attributes: { source: "magistrala", email: "j@x.io" },
    });
    const calls: Call[] = [];
    const gql = (async (request: Call) => {
      calls.push(request);
      if (request.query === CREATE_USER_MUTATION)
        return {
          createEntity: {
            id: "u1",
            name: "jane",
            status: "active",
            tenantId: null,
            attributes: {},
            createdAt: "2026-01-01T00:00:00Z",
          },
        };
      return { createPassword: true };
    }) as GraphqlFn;
    const user = await createUser(gql, {
      name: "jane",
      email: null,
      password: "12345678",
    });
    expect(user.id).toBe("u1");
    expect(calls.map((c) => c.query)).toEqual([
      CREATE_USER_MUTATION,
      CREATE_PASSWORD_MUTATION,
    ]);
  });

  it("deletes the user again when the password is refused", async () => {
    const calls: Call[] = [];
    const gql = (async (request: Call) => {
      calls.push(request);
      if (request.query === CREATE_USER_MUTATION)
        return { createEntity: { id: "u1", attributes: {} } };
      if (request.query === CREATE_PASSWORD_MUTATION)
        throw new Error("password too weak");
      return { deleteEntity: true };
    }) as GraphqlFn;
    await expect(
      createUser(gql, { name: "j", email: null, password: "12345678" }),
    ).rejects.toThrow("password too weak");
    expect(calls.at(-1)).toEqual({
      query: DELETE_USER_MUTATION,
      variables: { id: "u1" },
    });
  });
});

describe("resetPassword", () => {
  it("creates the new password, then revokes the old active ones", async () => {
    const calls: Call[] = [];
    const gql = (async (request: Call) => {
      calls.push(request);
      if (request.query === USER_CREDENTIALS_QUERY)
        return {
          credentials: {
            items: [
              { id: "p1", kind: "password", status: "active" },
              { id: "p0", kind: "password", status: "revoked" },
              { id: "k1", kind: "access_token", status: "active" },
            ],
          },
        };
      return { ok: true };
    }) as GraphqlFn;
    await resetPassword(gql, "u1", "newpassword");
    expect(calls.map((c) => c.query)).toEqual([
      USER_CREDENTIALS_QUERY,
      CREATE_PASSWORD_MUTATION,
      REVOKE_CREDENTIAL_MUTATION,
    ]);
    expect(calls[2].variables).toEqual({ entityId: "u1", credentialId: "p1" });
  });
});
