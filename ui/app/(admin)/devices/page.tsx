import type { Metadata } from "next";
import { DevicesView } from "@/components/ejad/devices/devices-view";
import { NoWorkspace } from "@/components/ejad/no-workspace";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export const metadata: Metadata = { title: "Devices" };
export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const workspaceId = await getServerWorkspaceId();
  if (!workspaceId) {
    return (
      <NoWorkspace
        title="Devices"
        description="Register devices, manage their secrets, and connect them to channels."
      />
    );
  }
  // Keyed so switching workspace resets the view's local state.
  return <DevicesView key={workspaceId} workspaceId={workspaceId} />;
}
