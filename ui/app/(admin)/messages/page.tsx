import type { Metadata } from "next";
import { MessagesView } from "@/components/ejad/messages/messages-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { messagingEndpoints } from "@/lib/ejad/messaging-config";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) {
    return (
      <NoWorkspace
        title="Messages"
        description="Browse messages published on this workspace's channels."
      />
    );
  }
  // Keyed so switching workspace resets the view's local state.
  return (
    <MessagesView
      key={workspaceId}
      workspaceId={workspaceId}
      endpoints={messagingEndpoints()}
    />
  );
}
