import type { Metadata } from "next";
import { GroupsView } from "@/components/ejad/groups/groups-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getI18n } from "@/lib/ejad/i18n/server";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("page.groups.title") };
}
export const dynamic = "force-dynamic";

export default async function DeviceGroupsPage() {
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) {
    return <NoWorkspace page="groups" />;
  }
  // Keyed so switching workspace resets the view's local state.
  return <GroupsView key={workspaceId} workspaceId={workspaceId} />;
}
