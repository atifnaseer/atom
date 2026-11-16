// Server-side: publishes one SenML message as a device, through the
// Magistrala HTTP adapter. The device key is revealed and used here only;
// it is never returned to the browser.

import { RESOURCE_KIND_CHANNEL } from "@/lib/ejad/channels";
import {
  connectionsFromPolicies,
  listDevicePolicies,
} from "@/lib/ejad/connections";
import { REVEAL_SHARED_KEY_MUTATION, type SharedKey } from "@/lib/ejad/devices";
import { buildSenml, type SendMessageInput } from "@/lib/ejad/messages";
import type { GraphqlFn } from "@/lib/ejad/workspaces";

export const SEND_TARGETS_QUERY = `
  query EjadSendTargets($tenantId: ID!, $deviceId: ID!, $channelId: ID!) {
    tenant(id: $tenantId) { id alias }
    device: entity(id: $deviceId) { id kind tenantId status }
    channel: resource(id: $channelId) { id kind tenantId attributes }
    credentials(entityId: $deviceId) {
      items { id kind status expiresAt createdAt }
    }
  }
`;

type SendTargets = {
  tenant: { id: string; alias: string | null } | null;
  device: {
    id: string;
    kind: string;
    tenantId: string | null;
    status: string;
  } | null;
  channel: {
    id: string;
    kind: string;
    tenantId: string | null;
    attributes: Record<string, unknown> | null;
  } | null;
  credentials: {
    items: {
      id: string;
      kind: string;
      status: string;
      expiresAt: string | null;
      createdAt: string;
    }[];
  };
};

/** A problem the caller caused (bad target, no key, not connected). */
export class SendMessageError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type SendMessageResult = {
  topic: string;
};

type FetchFn = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Sends the message. The adapter is called with HTTP Basic auth, the device
 * ID as username and its key as password: FluxMQ's HTTP bridge
 * authenticates a username + password pair.
 */
export async function sendDeviceMessage(
  gql: GraphqlFn,
  tenantId: string,
  input: SendMessageInput,
  options: { httpUrl: string; fetch?: FetchFn; nowMs?: number },
): Promise<SendMessageResult> {
  const doFetch = options.fetch ?? fetch;
  const targets = await gql<SendTargets>({
    query: SEND_TARGETS_QUERY,
    variables: {
      tenantId,
      deviceId: input.deviceId,
      channelId: input.channelId,
    },
  });
  const { tenant, device, channel } = targets;
  if (!tenant) throw new SendMessageError("Workspace not found.", 404);
  if (!device || device.kind !== "device" || device.tenantId !== tenantId)
    throw new SendMessageError("The device is not in this workspace.");
  if (
    !channel ||
    channel.kind !== RESOURCE_KIND_CHANNEL ||
    channel.tenantId !== tenantId
  )
    throw new SendMessageError("The channel is not in this workspace.");
  if (device.status !== "active")
    throw new SendMessageError("The device is disabled.");

  const policies = await listDevicePolicies(gql, tenantId, device.id);
  const connected = connectionsFromPolicies(policies).some(
    (c) => c.channelId === channel.id && c.publish,
  );
  if (!connected)
    throw new SendMessageError(
      "The device is not connected to this channel for publishing.",
    );

  const now = options.nowMs ?? Date.now();
  const credential = targets.credentials.items
    .filter(
      (c) =>
        c.kind === "shared_key" &&
        c.status === "active" &&
        (!c.expiresAt || Date.parse(c.expiresAt) > now),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!credential)
    throw new SendMessageError("The device has no active secret.");

  const { revealSharedKey } = await gql<{ revealSharedKey: SharedKey }>({
    query: REVEAL_SHARED_KEY_MUTATION,
    variables: { entityId: device.id, credentialId: credential.id },
  });
  const key = revealSharedKey.key;

  const route = channel.attributes?.route;
  const topic = `m/${tenant.alias || tenant.id}/c/${
    typeof route === "string" && route ? route : channel.id
  }`;
  const url = `${options.httpUrl.replace(/\/+$/, "")}/${topic
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const body = JSON.stringify(buildSenml(input, now));
  const response = await doFetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/senml+json",
      authorization: `Basic ${Buffer.from(`${device.id}:${key}`).toString("base64")}`,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const text = (await response.text().catch(() => "")).trim().slice(0, 200);
    const status = response.status;
    const reason =
      status === 401
        ? "the device secret was rejected"
        : status === 403
          ? "the device may not publish to this channel"
          : text || response.statusText;
    throw new SendMessageError(
      `The HTTP adapter refused the message (${status}): ${reason}.`,
      502,
    );
  }
  return { topic };
}
