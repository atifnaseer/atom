"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ejad/empty-state";
import { useT } from "@/components/ejad/i18n-provider";
import { PageHeader } from "@/components/ejad/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type WorkspacePage =
  | "devices"
  | "device"
  | "channels"
  | "channel"
  | "groups"
  | "group"
  | "messages"
  | "dashboards"
  | "dashboard"
  | "members";

/** Shown on workspace pages when no workspace is selected. */
export function NoWorkspace({ page }: { page: WorkspacePage }) {
  const t = useT();
  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title={t(`page.${page}.title`)}
        description={t(`page.${page}.description`)}
      />
      <Card>
        <EmptyState
          icon={Building2}
          title={t("noWorkspace.title")}
          description={t("noWorkspace.description")}
          action={
            <Button asChild>
              <Link href="/workspaces">{t("noWorkspace.action")}</Link>
            </Button>
          }
        />
      </Card>
    </div>
  );
}
