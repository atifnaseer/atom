"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  ChevronRight,
  Folder,
  FolderInput,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoadProblem } from "@/components/ejad/error-alert";
import { useGroupActions } from "@/components/ejad/groups/group-actions";
import { GroupMembers } from "@/components/ejad/groups/group-members";
import { useObjectGroups } from "@/components/ejad/groups/use-object-groups";
import { IfAllowed } from "@/components/ejad/if-allowed";
import { HeaderSkeleton } from "@/components/ejad/skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GROUP_QUERY, groupPath, type ObjectGroup } from "@/lib/ejad/groups";
import { graphqlClient, graphqlErrorCode } from "@/lib/graphql/client";

const TABS = ["devices", "channels", "subgroups"] as const;
type TabValue = (typeof TABS)[number];

export function GroupDetailView({
  groupId,
  workspaceId,
}: {
  groupId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: TabValue = TABS.includes(tabParam as TabValue)
    ? (tabParam as TabValue)
    : "devices";

  const { tree } = useObjectGroups(workspaceId);
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["ejad-group", groupId],
    queryFn: ({ signal }) =>
      graphqlClient<{ group: ObjectGroup & { groupType: string } }>({
        query: GROUP_QUERY,
        variables: { id: groupId },
        signal,
      }),
    retry: (count, err) => graphqlErrorCode(err) !== "NOT_FOUND" && count < 2,
  });
  const group = data?.group;

  const actions = useGroupActions({
    workspaceId,
    tree,
    onCreated: (created) => router.push(`/device-groups/${created.id}`),
    onDeleted: (deleted) =>
      router.push(
        deleted.parentId && tree.byId.has(deleted.parentId)
          ? `/device-groups/${deleted.parentId}`
          : "/device-groups",
      ),
  });

  function setTab(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "devices") params.delete("tab");
    else params.set("tab", value);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const backLink = (
    <Button asChild variant="ghost" size="sm" className="w-fit px-2">
      <Link href="/device-groups">
        <ArrowLeft />
        Groups
      </Link>
    </Button>
  );

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-6">
        {backLink}
        <HeaderSkeleton actions />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const notHere =
    group && (group.groupType !== "object" || group.tenantId !== workspaceId);
  if (error || !group || notHere) {
    return (
      <div className="grid grid-cols-1 gap-6">
        {backLink}
        <LoadProblem
          what="group"
          error={error}
          notFound={Boolean(notHere)}
          back={{ href: "/device-groups", label: "Back to groups" }}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Ancestors come from the workspace group list; the group itself from the
  // fresh single-group query.
  const ancestors = groupPath(tree.byId, group.id).slice(0, -1);
  const children = [...tree.byId.values()]
    .filter((child) => child.parentId === group.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const managed = Boolean(group.managedBy);

  return (
    <div className="grid grid-cols-1 gap-6">
      {backLink}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          {ancestors.length ? (
            <nav
              aria-label="Parent groups"
              className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
            >
              {ancestors.map((ancestor) => (
                <span key={ancestor.id} className="flex items-center gap-1">
                  <Link
                    href={`/device-groups/${ancestor.id}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {ancestor.name}
                  </Link>
                  <ChevronRight className="size-3.5" />
                </span>
              ))}
            </nav>
          ) : null}
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Folder className="size-6 shrink-0 text-primary" />
            <span className="truncate">{group.name}</span>
          </h1>
          {group.description ? (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            <code className="font-mono">{group.id}</code> · created{" "}
            {format(new Date(group.createdAt), "d MMM yyyy, HH:mm")}
          </p>
        </div>
        <IfAllowed ability="manage">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => actions.create(group)}>
              <FolderPlus />
              Add subgroup
            </Button>
            <Button
              variant="outline"
              disabled={managed}
              onClick={() => actions.edit(group)}
            >
              <Pencil />
              Rename
            </Button>
            <Button
              variant="outline"
              disabled={managed}
              onClick={() => actions.move(group)}
            >
              <FolderInput />
              Move
            </Button>
            <Button
              variant="destructive"
              disabled={managed}
              onClick={() => actions.remove(group)}
            >
              <Trash2 />
              Delete
            </Button>
          </div>
        </IfAllowed>
      </section>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="subgroups">
            Subgroups{children.length ? ` (${children.length})` : ""}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="devices" className="mt-4">
          <GroupMembers kind="device" workspaceId={workspaceId} group={group} />
        </TabsContent>
        <TabsContent value="channels" className="mt-4">
          <GroupMembers
            kind="channel"
            workspaceId={workspaceId}
            group={group}
          />
        </TabsContent>
        <TabsContent value="subgroups" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Subgroups</CardTitle>
              <IfAllowed ability="manage">
                <Button size="sm" onClick={() => actions.create(group)}>
                  <FolderPlus />
                  Add subgroup
                </Button>
              </IfAllowed>
            </CardHeader>
            <CardContent>
              {children.length ? (
                <ul className="grid grid-cols-1 gap-1">
                  {children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/device-groups/${child.id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                      >
                        <Folder className="size-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{child.name}</span>
                        {child.description ? (
                          <span className="truncate text-sm text-muted-foreground">
                            {child.description}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No subgroups. Devices and channels of subgroups are not listed
                  here; open a subgroup to see its members.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {actions.dialogs}
    </div>
  );
}
