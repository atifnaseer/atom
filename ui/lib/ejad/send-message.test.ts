import { describe, expect, it } from "vitest";
import { SUBJECT_POLICIES_QUERY } from "@/lib/ejad/connections";
import { REVEAL_SHARED_KEY_MUTATION } from "@/lib/ejad/devices";
import {
  SEND_TARGETS_QUERY,
  SendMessageError,
  sendDeviceMessage,
} from "@/lib/ejad/send-message";
import type { GraphqlFn } from "@/lib/ejad/workspaces";

const TENANT = "dcb2b6e0-ec6a-4d46-b384-363918e729d4";
const DEVICE = "63250f6a-31e7-46ed-bf2d-1ccebb863429";
const CHANNEL = "f31ba3d3-52f5-40dd-8d72-ad8587564217";
const KEY = "atom_secret_key";
const NOW = Date.parse("2026-11-16T20:00:00Z");

const INPUT = {
  channelId: CHANNEL,
  deviceId: DEVICE,
  name: "temperature",
  value: "4.2",
  unit: "Cel",
};

function policy(action: string, objectId = CHANNEL) {
  return {
    id: `p-${action}`,
    tenantId: TENANT,
    subjectKind: "entity",
    subjectId: DEVICE,
    permissionBlockId: `b-${action}`,
    permissionBlock: {
      id: `b-${action}`,
      tenantId: TENANT,
      scopeMode: "object",
      objectKind: "resource",
      objectType: "resource:channel",
      objectId,
      groupId: null,
      effect: "allow",
      actions: [{ id: action, name: action }],
    },
  };
}

function targets(over: Record<string, unknown> = {}) {
  return {
    tenant: { id: TENANT, alias: "ejad-demo" },
    device: { id: DEVICE, kind: "device", tenantId: TENANT, status: "active" },
    channel: {
      id: CHANNEL,
      kind: "channel",
      tenantId: TENANT,
      attributes: { route: "cold-room" },
    },
    credentials: {
      items: [
        {
          id: "old",
          kind: "shared_key",
          status: "active",
          expiresAt: null,
          createdAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "new",
          kind: "shared_key",
          status: "active",
          expiresAt: null,
          createdAt: "2026-06-01T00:00:00Z",
        },
        {
          id: "revoked",
          kind: "shared_key",
          status: "revoked",
          expiresAt: null,
          createdAt: "2026-09-01T00:00:00Z",
        },
      ],
    },
    ...over,
  };
}

function fakeGql(opts: {
  targets?: ReturnType<typeof targets>;
  policies?: unknown[];
}) {
  const revealed: string[] = [];
  const gql = (async ({
    query,
    variables,
  }: {
    query: string;
    variables?: Record<string, unknown>;
  }) => {
    if (query === SEND_TARGETS_QUERY) return opts.targets ?? targets();
    if (query === SUBJECT_POLICIES_QUERY) {
      const items = opts.policies ?? [policy("publish")];
      return { directPolicies: { total: items.length, items } };
    }
    if (query === REVEAL_SHARED_KEY_MUTATION) {
      revealed.push(String(variables?.credentialId));
      return {
        revealSharedKey: {
          credentialId: variables?.credentialId,
          key: KEY,
          expiresAt: null,
        },
      };
    }
    throw new Error(`unexpected query ${query}`);
  }) as GraphqlFn;
  return { gql, revealed };
}

function fakeFetch(statuses: number[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const status = statuses[calls.length - 1] ?? 500;
    return new Response(status === 200 ? "" : "unauthorized", { status });
  };
  return { fn, calls };
}

describe("sendDeviceMessage", () => {
  it("posts SenML on the routes with Basic device-ID:key auth", async () => {
    const { gql, revealed } = fakeGql({});
    const { fn, calls } = fakeFetch([200]);
    const result = await sendDeviceMessage(gql, TENANT, INPUT, {
      httpUrl: "http://localhost/http/",
      fetch: fn,
      nowMs: NOW,
    });
    expect(result).toEqual({ topic: "m/ejad-demo/c/cold-room" });
    expect(revealed).toEqual(["new"]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://localhost/http/m/ejad-demo/c/cold-room");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.authorization).toBe(
      `Basic ${Buffer.from(`${DEVICE}:${KEY}`).toString("base64")}`,
    );
    expect(headers["content-type"]).toBe("application/senml+json");
    expect(JSON.parse(String(calls[0].init.body))).toEqual([
      { n: "temperature", u: "Cel", t: NOW / 1000, v: 4.2 },
    ]);
  });

  it("does not retry when the adapter refuses the key", async () => {
    const { gql } = fakeGql({});
    const { fn, calls } = fakeFetch([401, 200]);
    await expect(
      sendDeviceMessage(gql, TENANT, INPUT, {
        httpUrl: "http://localhost/http",
        fetch: fn,
        nowMs: NOW,
      }),
    ).rejects.toThrow(/secret was rejected/);
    expect(calls).toHaveLength(1);
  });

  it("falls back to IDs when the workspace or channel has no route", async () => {
    const t = targets({
      tenant: { id: TENANT, alias: null },
      channel: {
        id: CHANNEL,
        kind: "channel",
        tenantId: TENANT,
        attributes: {},
      },
    });
    const { gql } = fakeGql({ targets: t });
    const { fn } = fakeFetch([200]);
    const result = await sendDeviceMessage(gql, TENANT, INPUT, {
      httpUrl: "http://h",
      fetch: fn,
      nowMs: NOW,
    });
    expect(result.topic).toBe(`m/${TENANT}/c/${CHANNEL}`);
  });

  it("refuses a device that is not connected for publishing", async () => {
    const { gql, revealed } = fakeGql({ policies: [policy("subscribe")] });
    const { fn, calls } = fakeFetch([200]);
    await expect(
      sendDeviceMessage(gql, TENANT, INPUT, {
        httpUrl: "http://h",
        fetch: fn,
        nowMs: NOW,
      }),
    ).rejects.toThrow(/not connected/);
    expect(revealed).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("refuses targets from another workspace", async () => {
    const other = targets({
      device: { id: DEVICE, kind: "device", tenantId: "x", status: "active" },
    });
    const { gql } = fakeGql({ targets: other });
    await expect(
      sendDeviceMessage(gql, TENANT, INPUT, { httpUrl: "http://h" }),
    ).rejects.toBeInstanceOf(SendMessageError);
  });

  it("refuses a device without an active, unexpired key", async () => {
    const t = targets({
      credentials: {
        items: [
          {
            id: "expired",
            kind: "shared_key",
            status: "active",
            expiresAt: "2026-01-01T00:00:00Z",
            createdAt: "2025-01-01T00:00:00Z",
          },
        ],
      },
    });
    const { gql } = fakeGql({ targets: t });
    await expect(
      sendDeviceMessage(gql, TENANT, INPUT, {
        httpUrl: "http://h",
        nowMs: NOW,
      }),
    ).rejects.toThrow(/no active secret/);
  });

  it("reports an adapter rejection without leaking the key", async () => {
    const { gql } = fakeGql({});
    const { fn } = fakeFetch([401]);
    const error = await sendDeviceMessage(gql, TENANT, INPUT, {
      httpUrl: "http://h",
      fetch: fn,
      nowMs: NOW,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(SendMessageError);
    expect(error.message).toMatch(/401/);
    expect(error.message).not.toContain(KEY);
  });
});
