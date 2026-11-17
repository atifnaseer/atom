import type { Metadata } from "next";
import { GroupDetailView } from "@/components/ejad/groups/group-detail-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getI18n } from "@/lib/ejad/i18n/server";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("page.group.title") };
}
export const dynamic = "force-dynamic";

export default async function DeviceGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, workspaceId] = await Promise.all([
    params,
    getServerWorkspaceId(),
  ]);
  if (!workspaceId) {
    return <NoWorkspace page="group" />;
  }
  return <GroupDetailView key={id} groupId={id} workspaceId={workspaceId} />;
}
