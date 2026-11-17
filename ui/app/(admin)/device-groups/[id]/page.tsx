import type { Metadata } from "next";
import { GroupDetailView } from "@/components/ejad/groups/group-detail-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export const metadata: Metadata = { title: "Group" };
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
    return (
      <NoWorkspace
        title="Group"
        description="A group’s devices, channels and subgroups."
      />
    );
  }
  return <GroupDetailView key={id} groupId={id} workspaceId={workspaceId} />;
}
