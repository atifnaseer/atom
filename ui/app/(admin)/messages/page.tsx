import type { Metadata } from "next";
import { MessagesView } from "@/components/ejad/messages/messages-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getI18n } from "@/lib/ejad/i18n/server";
import { messagingEndpoints } from "@/lib/ejad/messaging-config";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("page.messages.title") };
}
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) {
    return <NoWorkspace page="messages" />;
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
