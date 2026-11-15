import type { Metadata } from "next";
import { ComingSoon } from "@/components/ejad/coming-soon";
import { EJAD_PHASES } from "@/lib/ejad/nav";

export const metadata: Metadata = { title: "Groups" };
export const dynamic = "force-dynamic";

export default function DeviceGroupsPage() {
  return (
    <ComingSoon
      title="Groups"
      description="Organize devices and channels into groups."
      phase={EJAD_PHASES.deviceGroups}
    />
  );
}
