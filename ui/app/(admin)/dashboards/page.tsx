import type { Metadata } from "next";
import { ComingSoon } from "@/components/ejad/coming-soon";
import { EJAD_PHASES } from "@/lib/ejad/nav";

export const metadata: Metadata = { title: "Dashboards" };
export const dynamic = "force-dynamic";

export default function DashboardsPage() {
  return (
    <ComingSoon
      title="Dashboards"
      description="Build dashboards that visualize device data."
      phase={EJAD_PHASES.dashboards}
    />
  );
}
