"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  LayoutDashboard,
  Maximize,
  Minimize,
  Pencil,
  Plus,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import {
  DashboardActionsMenu,
  useDashboardActions,
} from "@/components/ejad/dashboards/dashboard-actions";
import {
  DASHBOARD_QUERY_KEY,
  DASHBOARDS_QUERY_KEY,
  useDashboard,
  useDashboards,
  useWorkspaceChannels,
} from "@/components/ejad/dashboards/use-dashboards";
import {
  WIDGET_SPAN,
  WidgetCard,
} from "@/components/ejad/dashboards/widget-card";
import { WidgetFormDialog } from "@/components/ejad/dashboards/widget-form-dialog";
import { LoadProblem, toastError } from "@/components/ejad/error-alert";
import { IfAllowed } from "@/components/ejad/if-allowed";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type Dashboard,
  dashboardName,
  moveWidget,
  parseLayout,
  replaceWidget,
  saveDashboardLayout,
  type Widget,
} from "@/lib/ejad/dashboards";
import { graphqlClient } from "@/lib/graphql/client";
import { cn } from "@/lib/utils";

/** Full screen through the Fullscreen API, or a fixed overlay without it. */
function useFullscreen(ref: React.RefObject<HTMLElement | null>) {
  const [native, setNative] = React.useState(false);
  const [overlay, setOverlay] = React.useState(false);

  React.useEffect(() => {
    const sync = () =>
      setNative(
        document.fullscreenElement !== null &&
          document.fullscreenElement === ref.current,
      );
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [ref]);

  React.useEffect(() => {
    if (!overlay) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOverlay(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay]);

  const enter = async () => {
    const element = ref.current;
    if (element?.requestFullscreen) {
      try {
        await element.requestFullscreen();
        return;
      } catch {
        // Not allowed here (e.g. inside an iframe): fall back to an overlay.
      }
    }
    setOverlay(true);
  };
  const exit = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    setOverlay(false);
  };
  return { active: native || overlay, overlay, enter, exit };
}

export function DashboardView({
  workspaceId,
  dashboardId,
}: {
  workspaceId: string;
  dashboardId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    data: dashboard,
    error,
    isPending,
  } = useDashboard(workspaceId, dashboardId);
  const { data: all } = useDashboards(workspaceId);
  const { data: channels } = useWorkspaceChannels(workspaceId);

  const [draft, setDraft] = React.useState<Widget[] | null>(null);
  const [formTarget, setFormTarget] = React.useState<Widget | "new" | null>(
    null,
  );
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [overIndex, setOverIndex] = React.useState<number | null>(null);
  const screenRef = React.useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(screenRef);

  const saved = React.useMemo(
    () => (dashboard ? parseLayout(dashboard.attributes) : []),
    [dashboard],
  );
  const editing = draft !== null;
  const layout = draft ?? saved;
  const dirty =
    draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);

  // Warn before leaving the page with unsaved changes.
  React.useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setCached = (next: Dashboard) => {
    queryClient.setQueryData([DASHBOARD_QUERY_KEY, next.id], next);
    queryClient.invalidateQueries({ queryKey: [DASHBOARDS_QUERY_KEY] });
  };

  const save = useMutation({
    mutationFn: (widgets: Widget[]) =>
      saveDashboardLayout(graphqlClient, dashboardId, widgets),
    onSuccess: (next) => {
      setCached(next);
      setDraft(null);
      toast.success("Dashboard saved");
    },
    onError: (err) => toastError(err),
  });

  const actions = useDashboardActions({
    workspaceId,
    existingNames: (all?.items ?? []).map(dashboardName),
    onSaved: (next, mode) => {
      if (mode === "rename") setCached(next);
      else {
        queryClient.invalidateQueries({ queryKey: [DASHBOARDS_QUERY_KEY] });
        router.push(`/dashboards/${next.id}`);
      }
    },
    onDeleted: () => {
      queryClient.invalidateQueries({ queryKey: [DASHBOARDS_QUERY_KEY] });
      router.push("/dashboards");
    },
  });

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid auto-rows-[17rem] gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="xl:col-span-2" />
          <Skeleton />
          <Skeleton />
        </div>
      </div>
    );
  }
  if (error || !dashboard) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <BackLink />
        <LoadProblem
          what="dashboard"
          error={error}
          notFound={!error}
          back={{ href: "/dashboards", label: "Back to dashboards" }}
        />
      </div>
    );
  }

  const change = (next: Widget[]) => setDraft(next);
  const startEditing = () => setDraft(saved);
  const addWidget = () => {
    if (!editing) startEditing();
    setFormTarget("new");
  };

  const onDrop = (to: number) => {
    if (dragIndex !== null) change(moveWidget(layout, dragIndex, to));
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <BackLink />
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {dashboardName(dashboard)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {editing
              ? "Drag widgets to reorder them, pick a size, then save."
              : "Updates every few seconds from stored messages."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <IfAllowed ability="manage">
                <Button variant="outline" onClick={addWidget}>
                  <Plus />
                  Add widget
                </Button>
              </IfAllowed>
              <Button
                variant="outline"
                disabled={save.isPending}
                onClick={() => setDraft(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={!dirty || save.isPending}
                onClick={() => save.mutate(layout)}
              >
                <Save />
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => void fullscreen.enter()}
                disabled={layout.length === 0}
              >
                <Maximize />
                Full screen
              </Button>
              <IfAllowed ability="manage">
                <Button onClick={startEditing}>
                  <Pencil />
                  Edit
                </Button>
                <DashboardActionsMenu dashboard={dashboard} actions={actions} />
              </IfAllowed>
            </>
          )}
        </div>
      </section>

      <div
        ref={screenRef}
        className={cn(
          fullscreen.active && "overflow-auto bg-background p-4 sm:p-6",
          fullscreen.overlay && "fixed inset-0 z-50",
        )}
      >
        {fullscreen.active ? (
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="truncate text-xl font-semibold tracking-tight">
              {dashboardName(dashboard)}
            </h2>
            <Button variant="outline" onClick={fullscreen.exit}>
              <Minimize />
              Exit full screen
            </Button>
          </div>
        ) : null}

        {layout.length === 0 ? (
          <Card>
            <CardContent className="grid justify-items-center gap-3 py-8 text-center">
              <LayoutDashboard className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                This dashboard has no widgets yet.
              </p>
              <IfAllowed ability="manage">
                <Button variant="outline" onClick={addWidget}>
                  <Plus />
                  Add widget
                </Button>
              </IfAllowed>
            </CardContent>
          </Card>
        ) : (
          <ul
            aria-label="Widgets"
            className="grid auto-rows-[17rem] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            {layout.map((widget, index) => (
              <li
                key={widget.id}
                className={WIDGET_SPAN[widget.size]}
                draggable={editing}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", widget.id);
                  setDragIndex(index);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragOver={(event) => {
                  if (dragIndex === null) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (overIndex !== index) setOverIndex(index);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  onDrop(index);
                }}
              >
                <WidgetCard
                  widget={widget}
                  workspaceId={workspaceId}
                  channels={channels}
                  dragging={dragIndex === index}
                  dropTarget={
                    overIndex === index &&
                    dragIndex !== null &&
                    dragIndex !== index
                  }
                  editing={
                    editing
                      ? {
                          index,
                          count: layout.length,
                          onEdit: () => setFormTarget(widget),
                          onRemove: () =>
                            change(layout.filter((w) => w.id !== widget.id)),
                          onMove: (to) => change(moveWidget(layout, index, to)),
                          onResize: (size) =>
                            change(replaceWidget(layout, { ...widget, size })),
                        }
                      : null
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <WidgetFormDialog
        target={formTarget}
        channels={channels}
        onOpenChange={(open) => {
          if (!open) setFormTarget(null);
        }}
        onSave={(widget) => change(replaceWidget(draft ?? saved, widget))}
      />
      {actions.dialogs}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboards"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Dashboards
    </Link>
  );
}
