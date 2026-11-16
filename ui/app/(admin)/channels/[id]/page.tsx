import type { Metadata } from "next";
import { ChannelDetailView } from "@/components/ejad/channels/channel-detail-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export const metadata: Metadata = { title: "Channel" };
export const dynamic = "force-dynamic";

export default async function ChannelPage({
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
        title="Channel"
        description="Channel details, connections and messages."
      />
    );
  }
  return <ChannelDetailView channelId={id} workspaceId={workspaceId} />;
}
