import type { Metadata } from "next";
import { ChannelsView } from "@/components/ejad/channels/channels-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export const metadata: Metadata = { title: "Channels" };
export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) {
    return (
      <NoWorkspace
        title="Channels"
        description="Create channels that devices publish to and subscribe from."
      />
    );
  }
  // Keyed so switching workspace resets the view's local state.
  return <ChannelsView key={workspaceId} workspaceId={workspaceId} />;
}
