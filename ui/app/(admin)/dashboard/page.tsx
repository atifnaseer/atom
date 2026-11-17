import { Building2, House, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { EmptyState } from "@/components/ejad/empty-state";
import { WorkspaceOverview } from "@/components/ejad/home/workspace-overview";
import { EnglishOnly } from "@/components/ejad/i18n-provider";
import { PageHeader } from "@/components/ejad/page-header";
import { RelationshipPanel } from "@/components/relationships/relationship-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getServerSession } from "@/lib/auth/session";
import { loadAccess } from "@/lib/ejad/access-server";
import { getI18n } from "@/lib/ejad/i18n/server";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("page.home.title") };
}
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
  const { t } = await getI18n();
  return (
    <div className="grid gap-6">
      <PageHeader
        icon={House}
        title={t("page.home.title")}
        description={t("page.home.description")}
      />
      {workspaceId ? (
        <WorkspaceOverview key={workspaceId} workspaceId={workspaceId} />
      ) : (
        <Card>
          <EmptyState
            icon={Building2}
            title={t("home.pickWorkspace")}
            description={t("home.pickWorkspaceHint")}
            action={
              <Button asChild>
                <Link href="/workspaces">{t("noWorkspace.action")}</Link>
              </Button>
            }
          />
        </Card>
      )}
      {platformAdmin ? (
        <section aria-label={t("home.platform")} className="grid gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Shield className="size-5 text-primary" />
            {t("home.platform")}
          </h2>
          {/* Atom's own panels are English only. */}
          <EnglishOnly>
            <DashboardOverview />
            <RelationshipPanel />
          </EnglishOnly>
        </section>
      ) : null}
    </div>
  );
}
