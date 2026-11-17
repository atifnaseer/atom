import type { CreateDeviceResult } from "@/lib/ejad/devices";
import { requestError } from "@/lib/ejad/errors";

export type PostDeviceBody = {
  name: string;
  externalId?: string;
  secret?: string;
  tags: string[];
  metadata: Record<string, unknown>;
};

/** Creates a device (and its shared key) through the Ejad route handler. */
export async function postDevice(
  body: PostDeviceBody,
): Promise<CreateDeviceResult> {
  const response = await fetch("/api/ejad/devices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Partial<
    CreateDeviceResult & { message: string; code: string }
  >;
  if (!response.ok || !payload.device) {
    throw requestError(response, payload);
  }
  return {
    device: payload.device,
    sharedKey: payload.sharedKey ?? null,
    keyError: payload.keyError ?? null,
  };
}
