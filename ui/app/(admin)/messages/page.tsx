import type { Metadata } from "next";
import { ComingSoon } from "@/components/ejad/coming-soon";
import { EJAD_PHASES } from "@/lib/ejad/nav";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default function MessagesPage() {
  return (
    <ComingSoon
      title="Messages"
      description="Browse messages published on this workspace's channels."
      phase={EJAD_PHASES.messages}
    />
  );
}
