import type { Metadata } from "next";
import { DashboardView } from "@/components/ejad/dashboards/dashboard-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export const metadata: Metadata = { title: "Dashboard" };
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
    return (
      <NoWorkspace
        title="Dashboard"
        description="Live charts and values from your channels."
      />
    );
  }
  return <DashboardView key={id} dashboardId={id} workspaceId={workspaceId} />;
}
