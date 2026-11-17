"use client";

import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Folder,
  FolderOpen,
  FolderTree,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { EmptyState } from "@/components/ejad/empty-state";
import { ErrorAlert } from "@/components/ejad/error-alert";
import {
  GroupActionsMenu,
  useGroupActions,
} from "@/components/ejad/groups/group-actions";
import { useObjectGroups } from "@/components/ejad/groups/use-object-groups";
import { useI18n } from "@/components/ejad/i18n-provider";
import { IfAllowed } from "@/components/ejad/if-allowed";
import { PageHeader } from "@/components/ejad/page-header";
import { useAccess } from "@/components/ejad/use-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  flattenGroupTree,
  type GroupNode,
  groupSearchVisibleIds,
} from "@/lib/ejad/groups";
import { cn } from "@/lib/utils";

export function GroupsView({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n();
  const { tree, groups, error, isPending, refetch } =
    useObjectGroups(workspaceId);
  const canManage = useAccess().can("manage");
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const actions = useGroupActions({
    workspaceId,
    tree,
    // Show a new subgroup right away.
    onCreated: (group) => {
      if (group.parentId) {
        const parentId = group.parentId;
        setCollapsed((current) => {
          const next = new Set(current);
          next.delete(parentId);
          return next;
        });
      }
    },
  });

  const visible = groupSearchVisibleIds(tree, search);
  // While searching, every matching branch is open.
  const rows = flattenGroupTree(
    tree.roots,
    visible ? new Set() : collapsed,
  ).filter((node) => !visible || visible.has(node.group.id));

  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const withChildren = groups.filter((group) =>
    groups.some((child) => child.parentId === group.id),
  );
  const allCollapsed =
    withChildren.length > 0 &&
    withChildren.every((group) => collapsed.has(group.id));

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        icon={FolderTree}
        title={t("page.groups.title")}
        description={t("page.groups.description")}
        actions={
          <IfAllowed ability="manage">
            <Button onClick={() => actions.create(null)}>
              <Plus />
              {t("groups.create")}
            </Button>
          </IfAllowed>
        }
      />

      {error ? (
        <ErrorAlert
          title={t("groups.loadFailed")}
          error={error}
          onRetry={() => refetch()}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-8"
            placeholder={t("groups.search")}
            aria-label={t("groups.search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {withChildren.length > 0 && !visible ? (
            <Button
              variant="outline"
              onClick={() =>
                setCollapsed(
                  allCollapsed
                    ? new Set()
                    : new Set(withChildren.map((group) => group.id)),
                )
              }
            >
              {allCollapsed ? <ChevronsUpDown /> : <ChevronsDownUp />}
              {allCollapsed ? t("groups.expandAll") : t("groups.collapseAll")}
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="py-0">
        <CardContent className="p-1">
          {isPending ? (
            <div className="grid gap-2 p-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="ms-6 h-8 w-56" />
              <Skeleton className="h-8 w-60" />
            </div>
          ) : rows.length === 0 && visible ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {t("groups.noMatches")}
            </p>
          ) : rows.length === 0 ? (
            error ? null : (
              <EmptyState
                icon={FolderTree}
                title={t("groups.emptyTitle")}
                description={
                  canManage
                    ? t("groups.emptyHint")
                    : t("groups.emptyHintReadOnly")
                }
                action={
                  canManage ? (
                    <Button onClick={() => actions.create(null)}>
                      <Plus />
                      {t("groups.create")}
                    </Button>
                  ) : null
                }
              />
            )
          ) : (
            <ul aria-label={t("nav.groups")} className="grid">
              {rows.map((node) => (
                <GroupRow
                  key={node.group.id}
                  node={node}
                  expanded={Boolean(visible) || !collapsed.has(node.group.id)}
                  onToggle={() => toggle(node.group.id)}
                  actions={actions}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {actions.dialogs}
    </div>
  );
}

function GroupRow({
  node,
  expanded,
  onToggle,
  actions,
}: {
  node: GroupNode;
  expanded: boolean;
  onToggle: () => void;
  actions: ReturnType<typeof useGroupActions>;
}) {
  const { t } = useI18n();
  const { group, depth, children } = node;
  const hasChildren = children.length > 0;
  const Icon = hasChildren && expanded ? FolderOpen : Folder;
  return (
    <li
      className="flex min-w-0 items-center gap-1 rounded-md py-1 pe-1 hover:bg-muted/60"
      style={{ paddingInlineStart: `${depth * 1.5 + 0.25}rem` }}
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn("size-7 shrink-0", !hasChildren && "invisible")}
        aria-label={
          expanded
            ? t("groups.collapse", { name: group.name })
            : t("groups.expand", { name: group.name })
        }
        aria-expanded={hasChildren ? expanded : undefined}
        onClick={onToggle}
        tabIndex={hasChildren ? 0 : -1}
      >
        {expanded ? (
          <ChevronDown />
        ) : (
          <ChevronRight className="rtl:rotate-180" />
        )}
      </Button>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 px-1">
        <Link
          href={`/device-groups/${group.id}`}
          className="truncate font-medium hover:underline"
        >
          {group.name}
        </Link>
        {group.description ? (
          <span className="truncate text-sm text-muted-foreground">
            {group.description}
          </span>
        ) : null}
      </div>
      {hasChildren ? (
        <span className="shrink-0 px-2 text-xs text-muted-foreground">
          {t("groups.subgroups", { count: children.length })}
        </span>
      ) : null}
      <IfAllowed ability="manage">
        <GroupActionsMenu group={group} actions={actions} />
      </IfAllowed>
    </li>
  );
}
