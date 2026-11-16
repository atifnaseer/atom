// Server-side: the "Store messages" switch of a channel. Magistrala only
// writes a channel's messages to the message store when a rules-engine rule
// sends them there, so storing = one rule on the channel:
//   input  Channel Subscriber on the channel (no topic filter)
//   logic  Lua `return message.payload`
//   output save_senml
// The rule is built exactly like the one the Magistrala UI creates for that
// flow (read back from the re service: GET /{workspace}/rules), including the
// base64 `metadata.flow` its rule editor needs to draw the nodes.

export type RuleOutput = { id?: string; type: string };

export type Rule = {
  id: string;
  name: string;
  input_channel: string;
  input_topic?: string;
  logic?: { type: number; value: string; mode?: string };
  outputs?: RuleOutput[] | null;
  status: string;
};

export type StoreChannel = { id: string; name: string | null; route: string };

export type StoreState = {
  /** True when an enabled store rule exists for the channel. */
  enabled: boolean;
  /** Store rules on the channel (enabled and disabled). */
  rules: { id: string; name: string; status: string }[];
};

/** Lua script the Magistrala UI's rule editor writes for this flow. */
export const STORE_RULE_LOGIC =
  "function logicFunction()\n  return message.payload\nend\n\nreturn logicFunction()";

const LUA = 0;
const SAVE_SENML = "save_senml";

function squash(script: string) {
  return script.replace(/\s+/g, " ").trim();
}

const STORE_LOGIC_FORMS = new Set([
  squash(STORE_RULE_LOGIC),
  "return message.payload",
]);

/** "store-<route>", the name pattern of the hand-made reference rule. */
export function storeRuleName(channel: StoreChannel) {
  return `store-${channel.route || channel.id}`;
}

/** Rule-editor layout: input -> Lua editor -> SenML storage. */
export function storeRuleFlow(
  channel: StoreChannel,
  newId: () => string = () => crypto.randomUUID(),
) {
  const flow = {
    outputMetadata: { inputChannel: channel.name || channel.route },
    nodes: [
      {
        id: `node_${newId()}`,
        type: "input",
        position: { x: 10, y: 100 },
        measured: { width: 320, height: 173 },
        selected: true,
      },
      {
        id: `node_${newId()}`,
        type: "editor",
        position: { x: 550, y: 100 },
        measured: { width: 420, height: 273 },
      },
      {
        id: `node_${newId()}`,
        type: "senMl",
        position: { x: 1200, y: 100 },
        measured: { width: 320, height: 121 },
      },
    ],
    edges: [],
  };
  return Buffer.from(JSON.stringify(flow)).toString("base64");
}

/** POST /{workspace}/rules body. */
export function buildStoreRule(channel: StoreChannel, newId?: () => string) {
  return {
    name: storeRuleName(channel),
    metadata: { flow: storeRuleFlow(channel, newId) },
    input_channel: channel.id,
    input_topic: "",
    logic: { type: LUA, value: STORE_RULE_LOGIC, mode: "unrestricted" },
    outputs: [{ type: SAVE_SENML }],
  };
}

/**
 * A rule counts as this channel's store rule when it does nothing but pass
 * the channel's messages to save_senml. The name is not checked, so rules
 * made by hand in the Magistrala UI are recognised too, and rules that
 * transform, filter or fan out are never touched by the switch.
 */
export function isStoreRule(rule: Rule, channelId: string) {
  return (
    rule.status !== "deleted" &&
    rule.input_channel === channelId &&
    !rule.input_topic &&
    rule.logic?.type === LUA &&
    STORE_LOGIC_FORMS.has(squash(rule.logic.value ?? "")) &&
    rule.outputs?.length === 1 &&
    rule.outputs[0].type === SAVE_SENML
  );
}

export function storeState(rules: Rule[], channelId: string): StoreState {
  const matches = rules.filter((rule) => isStoreRule(rule, channelId));
  return {
    enabled: matches.some((rule) => rule.status === "enabled"),
    rules: matches.map(({ id, name, status }) => ({ id, name, status })),
  };
}

/** The re service answered with an error. */
export class RulesApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type FetchFn = (input: string, init: RequestInit) => Promise<Response>;

export type RulesClientOptions = {
  baseUrl: string;
  workspaceId: string;
  token: string;
  fetch?: FetchFn;
};

const PAGE = 1000;
const TIMEOUT_MS = 10_000;

function rulesClient({
  baseUrl,
  workspaceId,
  token,
  ...rest
}: RulesClientOptions) {
  const doFetch = rest.fetch ?? fetch;
  const root = `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(workspaceId)}/rules`;
  return async function call(path: string, init: RequestInit = {}) {
    const response = await doFetch(`${root}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await response.text().catch(() => "");
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const record = (payload ?? {}) as Record<string, unknown>;
      const detail =
        (typeof record.message === "string" && record.message) ||
        (typeof record.error === "string" && record.error) ||
        text.trim().slice(0, 200) ||
        response.statusText;
      throw new RulesApiError(
        `The rules engine answered ${response.status}: ${detail}`,
        response.status,
      );
    }
    return payload;
  };
}

async function listChannelRules(
  call: ReturnType<typeof rulesClient>,
  channelId: string,
): Promise<Rule[]> {
  const rules: Rule[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const params = new URLSearchParams({
      input_channel: channelId,
      status: "all",
      offset: String(offset),
      limit: String(PAGE),
    });
    const page = (await call(`?${params}`)) as {
      total?: number;
      rules?: Rule[] | null;
    } | null;
    const batch = page?.rules ?? [];
    rules.push(...batch);
    if (!batch.length || rules.length >= Number(page?.total ?? 0)) break;
  }
  return rules;
}

/** Whether the channel's messages are being stored. */
export async function getStoreState(
  options: RulesClientOptions,
  channelId: string,
): Promise<StoreState> {
  const call = rulesClient(options);
  return storeState(await listChannelRules(call, channelId), channelId);
}

/**
 * Turns storing on (enables a disabled store rule, or creates one) or off
 * (deletes every store rule on the channel). Returns the new state.
 */
export async function setStoreMessages(
  options: RulesClientOptions,
  channel: StoreChannel,
  enabled: boolean,
): Promise<StoreState> {
  const call = rulesClient(options);
  const current = storeState(
    await listChannelRules(call, channel.id),
    channel.id,
  );
  if (enabled) {
    if (current.enabled) return current;
    const disabled = current.rules[0];
    if (disabled) {
      await call(`/${encodeURIComponent(disabled.id)}/enable`, {
        method: "POST",
      });
    } else {
      await call("", {
        method: "POST",
        body: JSON.stringify(buildStoreRule(channel)),
      });
    }
  } else {
    for (const rule of current.rules) {
      await call(`/${encodeURIComponent(rule.id)}`, { method: "DELETE" });
    }
  }
  return getStoreState(options, channel.id);
}
