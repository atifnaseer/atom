import type { Metadata } from "next";
import { GroupsView } from "@/components/ejad/groups/groups-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export const metadata: Metadata = { title: "Groups" };
export const dynamic = "force-dynamic";

export default async function DeviceGroupsPage() {
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) {
    return (
      <NoWorkspace
        title="Groups"
        description="Organize devices and channels into groups."
      />
    );
  }
  // Keyed so switching workspace resets the view's local state.
  return <GroupsView key={workspaceId} workspaceId={workspaceId} />;
}
