"use client";

import {
  ExternalLink,
  FolderInput,
  FolderPlus,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { GroupDeleteDialog } from "@/components/ejad/groups/group-delete-dialog";
import {
  GroupFormDialog,
  type GroupFormTarget,
} from "@/components/ejad/groups/group-form-dialog";
import { GroupMoveDialog } from "@/components/ejad/groups/group-move-dialog";
import { useRefreshGroups } from "@/components/ejad/groups/use-object-groups";
import { useT } from "@/components/ejad/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GroupTree, ObjectGroup } from "@/lib/ejad/groups";

export type GroupActions = {
  create: (parent: ObjectGroup | null) => void;
  edit: (group: ObjectGroup) => void;
  move: (group: ObjectGroup) => void;
  remove: (group: ObjectGroup) => void;
  dialogs: React.ReactNode;
};

/** State and dialogs for creating, editing, moving and deleting groups. */
export function useGroupActions({
  workspaceId,
  tree,
  onCreated,
  onDeleted,
}: {
  workspaceId: string;
  tree: GroupTree;
  onCreated?: (group: ObjectGroup) => void;
  onDeleted?: (group: ObjectGroup) => void;
}): GroupActions {
  const refresh = useRefreshGroups();
  const [form, setForm] = React.useState<GroupFormTarget | null>(null);
  const [moving, setMoving] = React.useState<ObjectGroup | null>(null);
  const [deleting, setDeleting] = React.useState<ObjectGroup | null>(null);

  const childCount = deleting
    ? [...tree.byId.values()].filter((g) => g.parentId === deleting.id).length
    : 0;

  const dialogs = (
    <>
      <GroupFormDialog
        workspaceId={workspaceId}
        target={form}
        onOpenChange={(open) => {
          if (!open) setForm(null);
        }}
        onSaved={(group) => {
          const created = form?.mode === "create";
          refresh();
          if (created) onCreated?.(group);
        }}
      />
      <GroupMoveDialog
        group={moving}
        tree={tree}
        onOpenChange={(open) => {
          if (!open) setMoving(null);
        }}
        onMoved={refresh}
      />
      <GroupDeleteDialog
        workspaceId={workspaceId}
        group={deleting}
        childCount={childCount}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onDeleted={(group) => {
          setDeleting(null);
          refresh();
          onDeleted?.(group);
        }}
      />
    </>
  );

  return {
    create: (parent) => setForm({ mode: "create", parent }),
    edit: (group) => setForm({ mode: "edit", group }),
    move: setMoving,
    remove: setDeleting,
    dialogs,
  };
}

/** The "⋮" menu for one group. */
export function GroupActionsMenu({
  group,
  actions,
  showOpen = true,
}: {
  group: ObjectGroup;
  actions: GroupActions;
  showOpen?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const managed = Boolean(group.managedBy);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={t("common.actionsFor", { name: group.name })}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showOpen ? (
          <DropdownMenuItem
            onSelect={() => router.push(`/device-groups/${group.id}`)}
          >
            <ExternalLink />
            {t("common.open")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => actions.create(group)}>
          <FolderPlus />
          {t("groups.addSubgroup")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={managed}
          onSelect={() => actions.edit(group)}
        >
          <Pencil />
          {t("common.rename")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={managed}
          onSelect={() => actions.move(group)}
        >
          <FolderInput />
          {t("groups.move")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={managed}
          onSelect={() => actions.remove(group)}
        >
          <Trash2 />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
