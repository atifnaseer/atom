import type { Metadata } from "next";
import { MembersView } from "@/components/ejad/members/members-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export const metadata: Metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) {
    return (
      <NoWorkspace
        title="Members"
        description="Manage who has access to this workspace and what they can do."
      />
    );
  }
  // Keyed so switching workspace resets the view's local state.
  return <MembersView key={workspaceId} workspaceId={workspaceId} />;
}
