import type { Metadata } from "next";
import { ComingSoon } from "@/components/ejad/coming-soon";
import { EJAD_PHASES } from "@/lib/ejad/nav";

export const metadata: Metadata = { title: "Devices" };
export const dynamic = "force-dynamic";

export default function DevicesPage() {
  return (
    <ComingSoon
      title="Devices"
      description="Register devices, manage their secrets, and connect them to channels."
      phase={EJAD_PHASES.devices}
    />
  );
}
