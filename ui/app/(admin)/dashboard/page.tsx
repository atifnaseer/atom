import { Building2, House, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { EmptyState } from "@/components/ejad/empty-state";
import { WorkspaceOverview } from "@/components/ejad/home/workspace-overview";
import { PageHeader } from "@/components/ejad/page-header";
import { RelationshipPanel } from "@/components/relationships/relationship-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getServerSession } from "@/lib/auth/session";
import { BRAND_SHORT } from "@/lib/brand";
import { loadAccess } from "@/lib/ejad/access-server";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

/** Whether the signed-in user may see Atom's platform-wide panels. */
async function isPlatformAdmin() {
  const session = await getServerSession();
  if (!session) return false;
  try {
    return (await loadAccess(session.entityId, null)).platformAdmin;
  } catch {
    return false;
  }
}

export default async function HomePage() {
  const [workspaceId, platformAdmin] = await Promise.all([
    getServerWorkspaceId(),
    isPlatformAdmin(),
  ]);
  return (
    <div className="grid gap-6">
      <PageHeader
        icon={House}
        title="Home"
        description={`What is happening in your ${BRAND_SHORT} workspace: devices, channels and the latest readings.`}
      />
      {workspaceId ? (
        <WorkspaceOverview key={workspaceId} workspaceId={workspaceId} />
      ) : (
        <Card>
          <EmptyState
            icon={Building2}
            title="Pick a workspace"
            description="A workspace holds one project’s devices, channels and people. Choose one in the Workspace switcher in the sidebar, or open the list of workspaces."
            action={
              <Button asChild>
                <Link href="/workspaces">Go to workspaces</Link>
              </Button>
            }
          />
        </Card>
      )}
      {platformAdmin ? (
        <section aria-label="Platform" className="grid gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Shield className="size-5 text-primary" />
            Platform
          </h2>
          <DashboardOverview />
          <RelationshipPanel />
        </section>
      ) : null}
    </div>
  );
}
