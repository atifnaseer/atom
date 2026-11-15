import type { Metadata } from "next";
import { ComingSoon } from "@/components/ejad/coming-soon";
import { EJAD_PHASES } from "@/lib/ejad/nav";

export const metadata: Metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default function MembersPage() {
  return (
    <ComingSoon
      title="Members"
      description="Manage who has access to this workspace and what they can do."
      phase={EJAD_PHASES.members}
    />
  );
}
