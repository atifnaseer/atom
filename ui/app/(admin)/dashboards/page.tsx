import type { Metadata } from "next";
import { DashboardsView } from "@/components/ejad/dashboards/dashboards-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export const metadata: Metadata = { title: "Dashboards" };
export const dynamic = "force-dynamic";

export default async function DashboardsPage() {
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) {
    return (
      <NoWorkspace
        title="Dashboards"
        description="Build dashboards that visualize device data."
      />
    );
  }
  // Keyed so switching workspace resets the view's local state.
  return <DashboardsView key={workspaceId} workspaceId={workspaceId} />;
}
