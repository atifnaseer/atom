import type { Channel, ChannelValues } from "@/lib/ejad/channels";

export type PostChannelError = Error & {
  code?: string;
  field?: "name" | "route";
};

/** Creates a channel through the Ejad route handler. */
export async function postChannel(body: ChannelValues): Promise<Channel> {
  const response = await fetch("/api/ejad/channels", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    channel?: Channel;
    message?: string;
    code?: string;
    field?: "name" | "route";
  };
  if (!response.ok || !payload.channel) {
    const error = new Error(
      payload.message ?? `Request failed with status ${response.status}`,
    ) as PostChannelError;
    error.code = payload.code;
    error.field = payload.field;
    throw error;
  }
  return payload.channel;
}
