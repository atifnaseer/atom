import type { Metadata } from "next";
import { MembersView } from "@/components/ejad/members/members-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getI18n } from "@/lib/ejad/i18n/server";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("page.members.title") };
}
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) {
    return <NoWorkspace page="members" />;
  }
  // Keyed so switching workspace resets the view's local state.
  return <MembersView key={workspaceId} workspaceId={workspaceId} />;
}
