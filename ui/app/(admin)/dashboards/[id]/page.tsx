import type { Metadata } from "next";
import { DashboardView } from "@/components/ejad/dashboards/dashboard-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getI18n } from "@/lib/ejad/i18n/server";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("page.dashboard.title") };
}
export const dynamic = "force-dynamic";

export default async function EjadDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, workspaceId] = await Promise.all([
    params,
    getServerWorkspaceId(),
  ]);
  if (!workspaceId) {
    return <NoWorkspace page="dashboard" />;
  }
  return <DashboardView key={id} dashboardId={id} workspaceId={workspaceId} />;
}
