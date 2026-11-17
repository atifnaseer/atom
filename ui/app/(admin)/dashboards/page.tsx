import type { Metadata } from "next";
import { DashboardsView } from "@/components/ejad/dashboards/dashboards-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getI18n } from "@/lib/ejad/i18n/server";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("page.dashboards.title") };
}
export const dynamic = "force-dynamic";

export default async function DashboardsPage() {
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) {
    return <NoWorkspace page="dashboards" />;
  }
  // Keyed so switching workspace resets the view's local state.
  return <DashboardsView key={workspaceId} workspaceId={workspaceId} />;
}
