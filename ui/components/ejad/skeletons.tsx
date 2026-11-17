"use client";

import { useT } from "@/components/ejad/i18n-provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder for a page's title block. */
export function HeaderSkeleton({ actions = false }: { actions?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid grid-cols-1 gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {actions ? <Skeleton className="h-9 w-32" /> : null}
    </div>
  );
}

/** Placeholder rows for a table that is loading. */
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="grid gap-3 rounded-md border p-4">
      {Array.from({ length: rows }, (_, row) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <div key={row} className="flex items-center gap-4">
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
              key={col}
              className={col === 0 ? "h-4 flex-[2]" : "h-4 flex-1"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Placeholder grid of cards (workspaces, dashboards, stats). */
export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cards }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <Card key={i}>
          <CardHeader className="grid grid-cols-1 gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Whole-page placeholder for a list page (loading.tsx). */
export function ListPageSkeleton() {
  const t = useT();
  return (
    <section
      className="grid grid-cols-1 gap-6"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      <HeaderSkeleton actions />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
      </div>
      <TableSkeleton rows={8} columns={5} />
    </section>
  );
}

/** Whole-page placeholder for a detail page (loading.tsx). */
export function DetailPageSkeleton() {
  const t = useT();
  return (
    <section
      className="grid grid-cols-1 gap-6"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      <Skeleton className="h-4 w-32" />
      <HeaderSkeleton actions />
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <Card>
        <CardContent className="grid gap-3 pt-6">
          {Array.from({ length: 5 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            <div key={i} className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

/** Whole-page placeholder for a card-grid page (loading.tsx). */
export function CardPageSkeleton() {
  const t = useT();
  return (
    <section
      className="grid grid-cols-1 gap-6"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      <HeaderSkeleton actions />
      <CardGridSkeleton />
    </section>
  );
}
