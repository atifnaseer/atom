import { cookies } from "next/headers";
import { GLOBAL_TENANT, TENANT_COOKIE } from "@/lib/tenant/context";

/**
 * Server-side: the selected workspace (tenant) id from the tenant cookie,
 * or null when the user is in the Global context.
 */
export async function getServerWorkspaceId(): Promise<string | null> {
  const value = (await cookies()).get(TENANT_COOKIE)?.value;
  return value && value !== GLOBAL_TENANT ? value : null;
}
