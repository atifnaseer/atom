import type { Metadata } from "next";
import { DevicesView } from "@/components/ejad/devices/devices-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getI18n } from "@/lib/ejad/i18n/server";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("page.devices.title") };
}
export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) {
    return <NoWorkspace page="devices" />;
  }
  // Keyed so switching workspace resets the view's local state.
  return <DevicesView key={workspaceId} workspaceId={workspaceId} />;
}
