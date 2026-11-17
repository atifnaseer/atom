"use client";

import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { toastError } from "@/components/ejad/error-alert";
import { useI18n } from "@/components/ejad/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CHANNELS_QUERY,
  type Channel,
  channelLabel,
  channelRoute,
} from "@/lib/ejad/channels";
import { DEVICES_QUERY, type Device } from "@/lib/ejad/devices";
import { errorText } from "@/lib/ejad/errors";
import {
  type MemberKind,
  memberGroupIds,
  type ObjectGroup,
  setGroupMemberships,
} from "@/lib/ejad/groups";
import { graphqlClient } from "@/lib/graphql/client";

const PAGE = 50;
const MAX_PER_ADD = 100;

type Candidate = {
  id: string;
  label: string;
  detail: string | null;
  inGroup: boolean;
};

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

async function fetchCandidates(
  kind: MemberKind,
  workspaceId: string,
  groupId: string,
  q: string,
  offset: number,
  signal: AbortSignal,
) {
  const variables = {
    tenantId: workspaceId,
    q: q || undefined,
    limit: PAGE,
    offset,
  };
  if (kind === "device") {
    const { entities } = await graphqlClient<{
      entities: { total: number; items: Device[] };
    }>({ query: DEVICES_QUERY, variables, signal });
    return {
      total: entities.total,
      offset,
      items: entities.items.map<Candidate>((device) => ({
        id: device.id,
        label: device.name,
        detail: device.externalId,
        inGroup: memberGroupIds(device).includes(groupId),
      })),
    };
  }
  const { resources } = await graphqlClient<{
    resources: { total: number; items: Channel[] };
  }>({ query: CHANNELS_QUERY, variables, signal });
  return {
    total: resources.total,
    offset,
    items: resources.items.map<Candidate>((channel) => ({
      id: channel.id,
      label: channelLabel(channel),
      detail: channelRoute(channel),
      inGroup: memberGroupIds(channel).includes(groupId),
    })),
  };
}

/** Picks devices or channels of the workspace and adds them to a group. */
export function GroupAddMembersDialog({
  kind,
  open,
  onOpenChange,
  workspaceId,
  group,
  onAdded,
}: {
  kind: MemberKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  group: ObjectGroup;
  onAdded: () => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = React.useState("");
  const q = useDebounced(search.trim());
  const [selected, setSelected] = React.useState<Map<string, string>>(
    new Map(),
  );

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setSelected(new Map());
    }
  }, [open]);

  const candidates = useInfiniteQuery({
    queryKey: ["ejad-group-candidates", kind, workspaceId, group.id, q],
    enabled: open,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      fetchCandidates(kind, workspaceId, group.id, q, pageParam, signal),
    getNextPageParam: (last) => {
      const next = last.offset + last.items.length;
      return next < last.total ? next : undefined;
    },
  });
  const items = candidates.data?.pages.flatMap((page) => page.items) ?? [];

  function toggle(item: Candidate, checked: boolean) {
    setSelected((current) => {
      const next = new Map(current);
      if (checked) {
        if (next.size >= MAX_PER_ADD) {
          toast.error(t(`gm.max.${kind}`, { count: MAX_PER_ADD }));
          return current;
        }
        next.set(item.id, item.label);
      } else next.delete(item.id);
      return next;
    });
  }

  const add = useMutation({
    mutationFn: () =>
      setGroupMemberships(
        graphqlClient,
        kind,
        [...selected.keys()],
        group.id,
        true,
      ),
    onSuccess: ({ done, failed }) => {
      if (done.length) onAdded();
      if (failed.length === 0) {
        toast.success(
          t(`gm.added.${kind}`, { count: done.length, group: group.name }),
        );
        onOpenChange(false);
        return;
      }
      toast.error(
        t("gm.partial", {
          done: done.length,
          failed: failed.length,
          error: failed[0].error,
        }),
      );
      // Keep only the failures selected so they can be retried.
      setSelected(
        (current) =>
          new Map(
            [...current].filter(([id]) => failed.some((f) => f.id === id)),
          ),
      );
    },
    onError: (error) => toastError(error),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!add.isPending) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(`gm.add.${kind}`)}</DialogTitle>
          <DialogDescription>
            {t(`gm.addHint.${kind}`, { group: group.name })}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid min-w-0 gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (selected.size) add.mutate();
          }}
        >
          <div className="grid min-w-0 gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="ps-8"
                placeholder={t(`gm.searchAll.${kind}`)}
                aria-label={t(`gm.searchAll.${kind}`)}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                disabled={add.isPending}
              />
            </div>
            {selected.size > 0 ? (
              <div className="flex flex-wrap gap-1">
                {[...selected].map(([id, label]) => (
                  <Badge key={id} variant="secondary" className="gap-1 pe-1">
                    <span className="max-w-40 truncate">{label}</span>
                    <button
                      type="button"
                      aria-label={t("common.removeName", { name: label })}
                      className="rounded-sm opacity-70 hover:opacity-100"
                      onClick={() =>
                        setSelected((current) => {
                          const next = new Map(current);
                          next.delete(id);
                          return next;
                        })
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
            <ScrollArea className="h-64 rounded-md border">
              <div className="grid p-1">
                {candidates.isPending ? (
                  <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    {t(`gm.loading.${kind}`)}
                  </p>
                ) : candidates.error ? (
                  <p className="p-3 text-sm text-destructive">
                    {errorText(candidates.error)}
                  </p>
                ) : items.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    {t(`gm.none.${kind}`)}
                  </p>
                ) : (
                  items.map((item) => {
                    const id = `group-add-${kind}-${item.id}`;
                    return (
                      <label
                        key={item.id}
                        htmlFor={id}
                        className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 hover:bg-muted has-[:disabled]:cursor-default has-[:disabled]:opacity-60"
                      >
                        <Checkbox
                          id={id}
                          checked={item.inGroup || selected.has(item.id)}
                          disabled={item.inGroup || add.isPending}
                          onCheckedChange={(checked) =>
                            toggle(item, checked === true)
                          }
                        />
                        <span className="grid min-w-0 flex-1 gap-0.5">
                          <span className="truncate text-sm font-medium">
                            {item.label}
                          </span>
                          {item.detail ? (
                            <code className="truncate font-mono text-xs text-muted-foreground">
                              {item.detail}
                            </code>
                          ) : null}
                        </span>
                        {item.inGroup ? (
                          <Badge variant="outline">{t("gm.inGroup")}</Badge>
                        ) : null}
                      </label>
                    );
                  })
                )}
                {candidates.hasNextPage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="m-1"
                    disabled={candidates.isFetchingNextPage}
                    onClick={() => candidates.fetchNextPage()}
                  >
                    {candidates.isFetchingNextPage
                      ? t("common.loadingEllipsis")
                      : t("common.loadMore")}
                  </Button>
                ) : null}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {t("common.rowsSelected", { count: selected.size })}.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={add.isPending}
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={add.isPending || !selected.size}>
              {add.isPending
                ? t("gm.adding")
                : selected.size
                  ? t(`gm.addN.${kind}`, { count: selected.size })
                  : t(`gm.add.${kind}`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
