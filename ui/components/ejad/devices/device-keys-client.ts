// Browser side of /api/ejad/devices/[id]/keys. Device keys never go
// through the generic GraphQL proxy: the route checks the caller's
// workspace role first.

import type { Credential, KeyAction, SharedKey } from "@/lib/ejad/devices";
import { requestError } from "@/lib/ejad/errors";

async function call<T>(deviceId: string, init?: RequestInit): Promise<T> {
  const response = await fetch(
    `/api/ejad/devices/${encodeURIComponent(deviceId)}/keys`,
    { cache: "no-store", ...init },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw requestError(response, payload);
  return payload as T;
}

export async function listDeviceKeys(deviceId: string, signal?: AbortSignal) {
  const { credentials } = await call<{ credentials: Credential[] }>(deviceId, {
    signal,
  });
  return credentials;
}

export function deviceKeyAction<T = { sharedKey: SharedKey }>(
  deviceId: string,
  action: KeyAction,
  credentialId?: string,
) {
  return call<T>(deviceId, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, credentialId }),
  });
}
