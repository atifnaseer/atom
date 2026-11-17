import type { Metadata } from "next";
import { ChannelDetailView } from "@/components/ejad/channels/channel-detail-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getI18n } from "@/lib/ejad/i18n/server";
import { messagingEndpoints } from "@/lib/ejad/messaging-config";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("page.channel.title") };
}
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
    return <NoWorkspace page="channel" />;
  }
  return (
    <ChannelDetailView
      channelId={id}
      workspaceId={workspaceId}
      endpoints={messagingEndpoints()}
    />
  );
}
