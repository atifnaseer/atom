import { Building2 } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ejad/empty-state";
import { PageHeader } from "@/components/ejad/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Shown on workspace pages when no workspace is selected. */
export function NoWorkspace({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState
          icon={Building2}
          title="Pick a workspace first"
          description="This page shows one workspace at a time. Choose a workspace in the Workspace switcher in the sidebar, or open the list of workspaces."
          action={
            <Button asChild>
              <Link href="/workspaces">Go to workspaces</Link>
            </Button>
          }
        />
      </Card>
    </div>
  );
}
