import type { Metadata } from "next";
import { DeviceDetailView } from "@/components/ejad/devices/device-detail-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export const metadata: Metadata = { title: "Device" };
export const dynamic = "force-dynamic";

export default async function DevicePage({
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
        title="Device"
        description="Device details, secrets and activity."
      />
    );
  }
  return <DeviceDetailView deviceId={id} workspaceId={workspaceId} />;
}
