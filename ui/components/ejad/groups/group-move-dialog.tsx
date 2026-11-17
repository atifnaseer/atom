"use client";

import { useMutation } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { toastError } from "@/components/ejad/error-alert";
import { indentLabel } from "@/components/ejad/groups/use-object-groups";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  descendantIds,
  type GroupTree,
  groupOptions,
  moveGroup,
  type ObjectGroup,
} from "@/lib/ejad/groups";
import { graphqlClient } from "@/lib/graphql/client";

const TOP_LEVEL = "__top__";

/** Moves a group under another parent, or to the top level. */
export function GroupMoveDialog({
  group,
  tree,
  onOpenChange,
  onMoved,
}: {
  group: ObjectGroup | null;
  tree: GroupTree;
  onOpenChange: (open: boolean) => void;
  onMoved: () => void;
}) {
  const [parent, setParent] = React.useState(TOP_LEVEL);

  React.useEffect(() => {
    if (group) setParent(group.parentId ?? TOP_LEVEL);
  }, [group]);

  // A group cannot go under itself or anything below it.
  const options = React.useMemo(() => {
    if (!group) return [];
    const blocked = descendantIds(tree.byId.values(), group.id);
    blocked.add(group.id);
    return groupOptions(tree, blocked);
  }, [group, tree]);

  const current = group?.parentId ?? TOP_LEVEL;
  const move = useMutation({
    mutationFn: () => {
      if (!group) throw new Error("No group selected.");
      return moveGroup(
        graphqlClient,
        group,
        parent === TOP_LEVEL ? null : parent,
      );
    },
    onSuccess: () => {
      const target =
        parent === TOP_LEVEL
          ? "the top level"
          : `“${tree.byId.get(parent)?.name}”`;
      toast.success(`Moved “${group?.name}” to ${target}`);
      onMoved();
      onOpenChange(false);
    },
    onError: (error) => toastError(error),
  });

  return (
    <Dialog
      open={group !== null}
      onOpenChange={(open) => {
        if (!move.isPending) onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move group</DialogTitle>
          <DialogDescription>
            Choose the new parent of “{group?.name}”. Its subgroups, devices and
            channels move with it.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (parent !== current) move.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="group-move-parent">Parent</Label>
            <Select
              value={parent}
              onValueChange={setParent}
              disabled={move.isPending}
            >
              <SelectTrigger id="group-move-parent" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TOP_LEVEL}>Top level (no parent)</SelectItem>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {indentLabel(option.label, option.depth)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={move.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={move.isPending || parent === current}
            >
              {move.isPending ? "Moving…" : "Move"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
