"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Building2,
  CalendarDays,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useTenant } from "@/components/app-shell/tenant-provider";
import { StatusBadge } from "@/components/crud/status-badge";
import { WorkspaceCreateDialog } from "@/components/ejad/workspaces/workspace-create-dialog";
import { WorkspaceDeleteDialog } from "@/components/ejad/workspaces/workspace-delete-dialog";
import { WorkspaceEditDialog } from "@/components/ejad/workspaces/workspace-edit-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { WORKSPACES_QUERY, type Workspace } from "@/lib/ejad/workspaces";
import { graphqlClient } from "@/lib/graphql/client";
import { GLOBAL_TENANT } from "@/lib/tenant/context";

const QUERY_KEY = ["ejad-workspaces"];
const HOME = "/dashboard";

export function WorkspacesView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selection, setTenant } = useTenant();
  const [editing, setEditing] = React.useState<Workspace | null>(null);
  const [deleting, setDeleting] = React.useState<Workspace | null>(null);

  const { data, error, isPending } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ signal }) =>
      graphqlClient<{ tenants: { total: number; items: Workspace[] } }>({
        query: WORKSPACES_QUERY,
        signal,
      }),
  });
  const workspaces = data?.tenants.items ?? [];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["tenant-switcher"] });
  }

  // Same mechanism as the sidebar tenant switcher: set the atom_tenant
  // cookie via the tenant context, then go Home.
  function open(workspace: Workspace) {
    setTenant({ id: workspace.id, name: workspace.name });
    router.push(HOME);
  }

  return (
    <div className="grid gap-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Pick a workspace to work in, or create a new one.
          </p>
        </div>
        <WorkspaceCreateDialog onCreated={refresh} />
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load workspaces</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : isPending ? (
        <CardGrid>
          {["a", "b", "c"].map((key) => (
            <Skeleton key={key} className="h-36 rounded-xl" />
          ))}
        </CardGrid>
      ) : workspaces.length === 0 ? (
        <EmptyState />
      ) : (
        <CardGrid>
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              current={selection.id === workspace.id}
              onOpen={() => open(workspace)}
              onEdit={() => setEditing(workspace)}
              onDelete={() => setDeleting(workspace)}
            />
          ))}
        </CardGrid>
      )}

      <WorkspaceEditDialog
        workspace={editing}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        onSaved={(updated) => {
          setEditing(null);
          if (selection.id === updated.id) {
            setTenant({ id: updated.id, name: updated.name });
          }
          refresh();
        }}
      />
      <WorkspaceDeleteDialog
        workspace={deleting}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        onDeleted={(removed) => {
          setDeleting(null);
          if (selection.id === removed.id) {
            setTenant({ id: GLOBAL_TENANT, name: "Global" });
          }
          refresh();
        }}
      />
    </div>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center gap-2 rounded-xl border border-dashed p-10 text-center">
      <Building2 className="size-8 text-muted-foreground" />
      <p className="font-medium">No workspaces yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Create your first workspace to start adding devices and channels.
      </p>
    </div>
  );
}

function WorkspaceCard({
  workspace,
  current,
  onOpen,
  onEdit,
  onDelete,
}: {
  workspace: Workspace;
  current: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className={`relative gap-0 p-0 transition-colors hover:border-primary/50 hover:bg-muted/40 ${
        current ? "border-primary/60" : ""
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="grid gap-3 rounded-xl p-5 pr-12 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Open workspace ${workspace.name}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-semibold">{workspace.name}</span>
          {current ? (
            <Badge variant="secondary" className="shrink-0 text-[0.68rem]">
              Current
            </Badge>
          ) : null}
        </div>
        <code className="truncate font-mono text-sm text-muted-foreground">
          {workspace.alias ?? "—"}
        </code>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <StatusBadge value={workspace.status.toLowerCase()} />
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {format(new Date(workspace.createdAt), "d MMM yyyy")}
          </span>
        </div>
      </button>
      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`Actions for ${workspace.name}`}
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
