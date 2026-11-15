import type { Metadata } from "next";
import { ComingSoon } from "@/components/ejad/coming-soon";
import { EJAD_PHASES } from "@/lib/ejad/nav";

export const metadata: Metadata = { title: "Channels" };
export const dynamic = "force-dynamic";

export default function ChannelsPage() {
  return (
    <ComingSoon
      title="Channels"
      description="Create channels that devices publish to and subscribe from."
      phase={EJAD_PHASES.channels}
    />
  );
}
