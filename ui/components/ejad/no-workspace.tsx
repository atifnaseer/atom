import { Info } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Shown on workspace pages when no workspace is selected. */
export function NoWorkspace({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </section>
      <Alert>
        <Info />
        <AlertTitle>No workspace selected</AlertTitle>
        <AlertDescription>
          <p>
            Pick a workspace in the Workspace switcher in the sidebar, or open
            one from{" "}
            <Link href="/workspaces" className="underline">
              Workspaces
            </Link>
            .
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
