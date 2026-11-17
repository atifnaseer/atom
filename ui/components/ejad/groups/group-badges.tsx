"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { type GroupTree, groupPathLabel } from "@/lib/ejad/groups";

const SHOWN = 2;

/** The "Group" cell: links to each group a device or channel is in. */
export function GroupBadges({
  groupIds,
  tree,
}: {
  groupIds: string[];
  tree: GroupTree;
}) {
  // Ignore ids of groups that are gone or outside this workspace.
  const groups = groupIds
    .map((id) => tree.byId.get(id))
    .filter((group) => group !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (groups.length === 0)
    return <span className="text-muted-foreground">—</span>;
  const rest = groups.slice(SHOWN);
  return (
    <div className="flex flex-wrap gap-1">
      {groups.slice(0, SHOWN).map((group) => (
        <Badge key={group.id} variant="outline" asChild>
          <Link
            href={`/device-groups/${group.id}`}
            title={groupPathLabel(tree.byId, group.id)}
            className="max-w-40 truncate"
          >
            {group.name}
          </Link>
        </Badge>
      ))}
      {rest.length ? (
        <Badge
          variant="secondary"
          title={rest.map((g) => groupPathLabel(tree.byId, g.id)).join("\n")}
        >
          +{rest.length}
        </Badge>
      ) : null}
    </div>
  );
}
