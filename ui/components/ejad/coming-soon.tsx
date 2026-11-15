import { Construction, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerWorkspaceId } from "@/lib/ejad/workspace";

/** Placeholder for an Ejad page that is not built yet. */
export async function ComingSoon({
  title,
  description,
  phase,
  requiresWorkspace = true,
}: {
  title: string;
  description: string;
  phase: number;
  requiresWorkspace?: boolean;
}) {
  const workspaceId = requiresWorkspace ? await getServerWorkspaceId() : null;

  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </section>
      {requiresWorkspace && !workspaceId ? (
        <Alert>
          <Info />
          <AlertTitle>No workspace selected</AlertTitle>
          <AlertDescription>
            Pick a workspace in the Workspace switcher in the sidebar to use
            this page.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Construction className="size-5" />
            Coming in phase {phase}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This page is part of the Ejad IoT Platform roadmap and is not
          available yet.
        </CardContent>
      </Card>
    </div>
  );
}
