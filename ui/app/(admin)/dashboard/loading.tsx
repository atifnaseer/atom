"use client";

import { useT } from "@/components/ejad/i18n-provider";
import { HeaderSkeleton } from "@/components/ejad/skeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STATS = ["devices", "channels", "messages"];

export default function Loading() {
  const t = useT();
  return (
    <section
      className="grid gap-6"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      <HeaderSkeleton />
      <div className="grid gap-3 sm:grid-cols-3">
        {STATS.map((id) => (
          <Skeleton key={id} className="h-28" />
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    </section>
  );
}
