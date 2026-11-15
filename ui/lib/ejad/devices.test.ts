import { describe, expect, it } from "vitest";
import {
  BULK_CSV_TEMPLATE,
  bulkResultsCsv,
  CREATE_DEVICE_MUTATION,
  CREATE_SHARED_KEY_MUTATION,
  createDevice,
  createDeviceInput,
  deviceMetadata,
  deviceTags,
  parseBulkDevicesCsv,
  parseTagsCell,
  REVOKE_CREDENTIAL_MUTATION,
  rotateSharedKey,
} from "@/lib/ejad/devices";
import type { GraphqlFn } from "@/lib/ejad/workspaces";

const TENANT = "6d2e6a73-3dd8-4d36-9374-48a0451f39c2";

type Call = { query: string; variables?: Record<string, unknown> };

function fakeGql(handler: (call: Call) => unknown) {
  const calls: Call[] = [];
  const gql = (async (call: Call) => {
    calls.push(call);
    return handler(call);
  }) as GraphqlFn;
  return { gql, calls };
}

describe("createDeviceInput", () => {
  it("matches Magistrala's EntityFromFields for a device", () => {
    expect(
      createDeviceInput(TENANT, {
        name: "  sensor-1 ",
        externalId: " AA:BB:CC ",
        tags: ["a", " b ", ""],
        metadata: { room: 101 },
      }),
    ).toEqual({
      name: "sensor-1",
      kind: "device",
      tenantId: TENANT,
      externalId: "AA:BB:CC",
      attributes: {
        source: "magistrala",
        magistrala_kind: "device",
        tags: ["a", "b"],
        metadata: { room: 101 },
      },
    });
  });

  it("leaves out empty tags, metadata and external ID (compact)", () => {
    expect(
      createDeviceInput(TENANT, {
        name: "x",
        externalId: "  ",
        tags: [],
        metadata: {},
      }),
    ).toEqual({
      name: "x",
      kind: "device",
      tenantId: TENANT,
      attributes: { source: "magistrala", magistrala_kind: "device" },
    });
  });
});

describe("device attribute readers", () => {
  it("reads tags and metadata defensively", () => {
    expect(deviceTags({ attributes: { tags: ["a", 1, "b"] } })).toEqual([
      "a",
      "b",
    ]);
    expect(deviceTags({ attributes: null })).toEqual([]);
    expect(deviceMetadata({ attributes: { metadata: [1] } })).toEqual({});
    expect(deviceMetadata({ attributes: { metadata: { a: 1 } } })).toEqual({
      a: 1,
    });
  });
});

describe("createDevice", () => {
  it("creates the entity, then a generated shared key", async () => {
    const { gql, calls } = fakeGql(({ query }) =>
      query === CREATE_DEVICE_MUTATION
        ? { createEntity: { id: "dev-1", name: "x" } }
        : { createSharedKey: { credentialId: "c1", key: "atom_shared_k" } },
    );
    const result = await createDevice(gql, TENANT, {
      name: "x",
      tags: [],
      metadata: {},
    });
    expect(calls.map((c) => c.query)).toEqual([
      CREATE_DEVICE_MUTATION,
      CREATE_SHARED_KEY_MUTATION,
    ]);
    expect(calls[1].variables).toEqual({ entityId: "dev-1", input: {} });
    expect(result.sharedKey?.key).toBe("atom_shared_k");
    expect(result.keyError).toBeNull();
  });

  it("passes a provided secret as the key", async () => {
    const { gql, calls } = fakeGql(({ query }) =>
      query === CREATE_DEVICE_MUTATION
        ? { createEntity: { id: "dev-1" } }
        : { createSharedKey: { credentialId: "c1", key: "mine" } },
    );
    await createDevice(gql, TENANT, {
      name: "x",
      secret: " mine ",
      tags: [],
      metadata: {},
    });
    expect(calls[1].variables).toEqual({
      entityId: "dev-1",
      input: { key: "mine" },
    });
  });

  it("keeps the device and reports a failed key step", async () => {
    const { gql } = fakeGql(({ query }) => {
      if (query === CREATE_DEVICE_MUTATION)
        return { createEntity: { id: "dev-1" } };
      throw new Error("boom");
    });
    const result = await createDevice(gql, TENANT, {
      name: "x",
      tags: [],
      metadata: {},
    });
    expect(result.device.id).toBe("dev-1");
    expect(result.sharedKey).toBeNull();
    expect(result.keyError).toBe("boom");
  });
});

describe("rotateSharedKey", () => {
  it("creates the new key before revoking the old one", async () => {
    const { gql, calls } = fakeGql(({ query }) =>
      query === CREATE_SHARED_KEY_MUTATION
        ? { createSharedKey: { credentialId: "new", key: "k" } }
        : { revokeCredential: true },
    );
    const result = await rotateSharedKey(gql, "dev-1", "old");
    expect(calls.map((c) => c.query)).toEqual([
      CREATE_SHARED_KEY_MUTATION,
      REVOKE_CREDENTIAL_MUTATION,
    ]);
    expect(calls[1].variables).toEqual({
      entityId: "dev-1",
      credentialId: "old",
    });
    expect(result).toEqual({
      sharedKey: { credentialId: "new", key: "k" },
      revokeError: null,
    });
  });

  it("returns the new key even if the revoke fails", async () => {
    const { gql } = fakeGql(({ query }) => {
      if (query === CREATE_SHARED_KEY_MUTATION)
        return { createSharedKey: { credentialId: "new", key: "k" } };
      throw new Error("denied");
    });
    const result = await rotateSharedKey(gql, "dev-1", "old");
    expect(result.sharedKey.key).toBe("k");
    expect(result.revokeError).toBe("denied");
  });
});

describe("parseTagsCell", () => {
  it("splits on commas and semicolons and dedupes", () => {
    expect(parseTagsCell(" a, b;c ,a,, ")).toEqual(["a", "b", "c"]);
  });
});

describe("parseBulkDevicesCsv", () => {
  it("parses the template", () => {
    const rows = parseBulkDevicesCsv(BULK_CSV_TEMPLATE);
    expect(rows).toEqual([
      {
        line: 2,
        name: "temperature-sensor-01",
        secret: "",
        tags: ["sensor", "floor-1"],
        metadata: { location: "Room 101" },
        error: null,
      },
      {
        line: 3,
        name: "water-meter-02",
        secret: "my-own-secret-123",
        tags: ["meter"],
        metadata: {},
        error: null,
      },
    ]);
  });

  it("accepts headers in any order and case, with optional columns", () => {
    const rows = parseBulkDevicesCsv("tags,NAME\nx,dev-1\n");
    expect(rows[0]).toMatchObject({ name: "dev-1", secret: "", tags: ["x"] });
  });

  it("flags rows without a name or with bad metadata", () => {
    const rows = parseBulkDevicesCsv(
      'Name,Secret,Tags,Metadata\n,,,\nok,,,"[1]"\nbad,,,{nope\n',
    );
    expect(rows.map((r) => r.error)).toEqual([
      "Name is required.",
      "Metadata must be a JSON object.",
      "Metadata must be valid JSON.",
    ]);
  });

  it("rejects files without a Name header or without rows", () => {
    expect(() => parseBulkDevicesCsv("")).toThrow(/empty/);
    expect(() => parseBulkDevicesCsv("Secret,Tags\nx,y")).toThrow(/Name/);
    expect(() => parseBulkDevicesCsv("Name\n")).toThrow(/no devices/);
  });
});

describe("bulkResultsCsv", () => {
  it("writes one row per result with secrets", () => {
    const csv = bulkResultsCsv([
      { line: 2, name: "a", deviceId: "id-a", key: "k-a", error: null },
      { line: 3, name: "b", deviceId: null, key: null, error: "conflict" },
      {
        line: 4,
        name: "c",
        deviceId: "id-c",
        key: null,
        error: "Secret not created: x",
      },
    ]);
    expect(csv.split("\r\n")).toEqual([
      "Name,Device ID,Secret,Status,Error",
      "a,id-a,k-a,created,",
      "b,,,failed,conflict",
      "c,id-c,,created without secret,Secret not created: x",
      "",
    ]);
  });
});
