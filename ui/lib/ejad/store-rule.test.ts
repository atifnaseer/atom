import { describe, expect, it } from "vitest";
import {
  buildStoreRule,
  getStoreState,
  isStoreRule,
  type Rule,
  RulesApiError,
  STORE_RULE_LOGIC,
  setStoreMessages,
  storeState,
} from "@/lib/ejad/store-rule";

const WS = "dcb2b6e0-ec6a-4d46-b384-363918e729d4";
const CHANNEL = "f31ba3d3-52f5-40dd-8d72-ad8587564217";
const CH = { id: CHANNEL, name: "cold-room-telemetry", route: "cold-room" };

// "store-cold-room", created by hand in the Magistrala UI and read back
// through GET /{workspace}/rules (metadata.flow left out).
const REFERENCE: Rule = {
  id: "f2cd0514-3878-40d5-855b-fde18516d4d5",
  name: "store-cold-room",
  input_channel: CHANNEL,
  input_topic: "",
  logic: {
    type: 0,
    value:
      "function logicFunction()\n  return message.payload\nend\n\nreturn logicFunction()",
    mode: "unrestricted",
  },
  outputs: [{ id: "e624968e-ff50-404f-9f61-94325424389f", type: "save_senml" }],
  status: "enabled",
};

function rule(overrides: Partial<Rule> = {}): Rule {
  return { ...REFERENCE, ...overrides };
}

describe("buildStoreRule", () => {
  it("builds the rule the Magistrala UI creates", () => {
    let n = 0;
    const body = buildStoreRule(CH, () => `id-${++n}`);
    expect(body).toMatchObject({
      name: "store-cold-room",
      input_channel: CHANNEL,
      input_topic: "",
      logic: { type: 0, value: STORE_RULE_LOGIC, mode: "unrestricted" },
      outputs: [{ type: "save_senml" }],
    });
    expect(body.logic.value).toBe(REFERENCE.logic?.value);
    const flow = JSON.parse(
      Buffer.from(body.metadata.flow, "base64").toString(),
    );
    expect(flow.outputMetadata).toEqual({
      inputChannel: "cold-room-telemetry",
    });
    expect(flow.nodes.map((node: { type: string }) => node.type)).toEqual([
      "input",
      "editor",
      "senMl",
    ]);
    expect(flow.nodes[0].id).toBe("node_id-1");
    expect(flow.edges).toEqual([]);
  });

  it("names the rule after the channel ID when there is no route", () => {
    expect(buildStoreRule({ ...CH, route: "" }).name).toBe(`store-${CHANNEL}`);
  });
});

describe("isStoreRule", () => {
  it("recognises the reference rule and its built twin", () => {
    expect(isStoreRule(REFERENCE, CHANNEL)).toBe(true);
    const built = buildStoreRule(CH);
    expect(isStoreRule({ ...built, id: "x", status: "enabled" }, CHANNEL)).toBe(
      true,
    );
  });

  it("ignores rules that do more, or are on another channel", () => {
    expect(isStoreRule(rule({ input_channel: "other" }), CHANNEL)).toBe(false);
    expect(isStoreRule(rule({ input_topic: "temp" }), CHANNEL)).toBe(false);
    expect(isStoreRule(rule({ status: "deleted" }), CHANNEL)).toBe(false);
    expect(
      isStoreRule(
        rule({ logic: { type: 0, value: "return message.payload * 2" } }),
        CHANNEL,
      ),
    ).toBe(false);
    expect(
      isStoreRule(
        rule({ outputs: [{ type: "save_senml" }, { type: "email" }] }),
        CHANNEL,
      ),
    ).toBe(false);
    expect(isStoreRule(rule({ outputs: null }), CHANNEL)).toBe(false);
  });

  it("accepts the bare Lua form", () => {
    expect(
      isStoreRule(
        rule({ logic: { type: 0, value: "  return message.payload\n" } }),
        CHANNEL,
      ),
    ).toBe(true);
  });
});

describe("storeState", () => {
  it("is on only when an enabled store rule exists", () => {
    expect(storeState([], CHANNEL).enabled).toBe(false);
    expect(storeState([rule({ status: "disabled" })], CHANNEL)).toEqual({
      enabled: false,
      rules: [{ id: REFERENCE.id, name: REFERENCE.name, status: "disabled" }],
    });
    expect(storeState([rule()], CHANNEL).enabled).toBe(true);
  });
});

type Call = { url: string; method: string; body: unknown; auth: string };

function fakeRe(initial: Rule[]) {
  let rules = [...initial];
  const calls: Call[] = [];
  const fn = async (url: string, init: RequestInit) => {
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    const headers = init.headers as Record<string, string>;
    calls.push({ url, method, body, auth: headers.authorization });
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (method === "GET") {
      const page = rules.filter(
        (r) => r.input_channel === u.searchParams.get("input_channel"),
      );
      return Response.json({ total: page.length, rules: page });
    }
    if (method === "POST" && parts.length === 2) {
      const created = { ...body, id: "new-rule", status: "enabled" };
      rules.push(created);
      return Response.json(created, { status: 201 });
    }
    if (method === "POST" && parts[3] === "enable") {
      rules = rules.map((r) =>
        r.id === parts[2] ? { ...r, status: "enabled" } : r,
      );
      return Response.json({});
    }
    if (method === "DELETE") {
      rules = rules.filter((r) => r.id !== parts[2]);
      return new Response(null, { status: 204 });
    }
    return new Response("nope", { status: 500 });
  };
  return { fn, calls };
}

const OPTS = { baseUrl: "http://re:9008/", workspaceId: WS, token: "tok" };

describe("rules engine calls", () => {
  it("reads state with the login token, listing all statuses", async () => {
    const { fn, calls } = fakeRe([rule()]);
    const state = await getStoreState({ ...OPTS, fetch: fn }, CHANNEL);
    expect(state.enabled).toBe(true);
    expect(calls[0].auth).toBe("Bearer tok");
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe(`/${WS}/rules`);
    expect(url.searchParams.get("input_channel")).toBe(CHANNEL);
    expect(url.searchParams.get("status")).toBe("all");
  });

  it("creates the rule when turning on", async () => {
    const { fn, calls } = fakeRe([]);
    const state = await setStoreMessages({ ...OPTS, fetch: fn }, CH, true);
    expect(state.enabled).toBe(true);
    const post = calls.find((c) => c.method === "POST");
    expect(post?.url).toBe(`http://re:9008/${WS}/rules`);
    expect(post?.body).toMatchObject({ name: "store-cold-room" });
  });

  it("does nothing when already on", async () => {
    const { fn, calls } = fakeRe([rule()]);
    await setStoreMessages({ ...OPTS, fetch: fn }, CH, true);
    expect(calls.every((c) => c.method === "GET")).toBe(true);
  });

  it("re-enables a disabled store rule instead of adding one", async () => {
    const { fn, calls } = fakeRe([rule({ status: "disabled" })]);
    const state = await setStoreMessages({ ...OPTS, fetch: fn }, CH, true);
    expect(state.enabled).toBe(true);
    expect(calls.map((c) => c.method)).toEqual(["GET", "POST", "GET"]);
    expect(calls[1].url).toBe(
      `http://re:9008/${WS}/rules/${REFERENCE.id}/enable`,
    );
  });

  it("deletes only store rules when turning off", async () => {
    const other = rule({ id: "other", outputs: [{ type: "email" }] });
    const { fn, calls } = fakeRe([rule(), other]);
    const state = await setStoreMessages({ ...OPTS, fetch: fn }, CH, false);
    expect(state).toEqual({ enabled: false, rules: [] });
    const deletes = calls.filter((c) => c.method === "DELETE");
    expect(deletes.map((c) => c.url)).toEqual([
      `http://re:9008/${WS}/rules/${REFERENCE.id}`,
    ]);
  });

  it("surfaces re service errors", async () => {
    const fn = async () =>
      Response.json({ error: "missing or invalid token" }, { status: 401 });
    const err = await getStoreState({ ...OPTS, fetch: fn }, CHANNEL).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(RulesApiError);
    expect(err.status).toBe(401);
    expect(err.message).toMatch(/missing or invalid token/);
  });
});
