import type { LucideIcon } from "lucide-react";
import type * as React from "react";

/** The title block every Ejad page starts with. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  children,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary page actions, shown on the right. */
  actions?: React.ReactNode;
  /** Extra lines under the description (badges, identifiers). */
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid min-w-0 gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {Icon ? <Icon className="size-6 shrink-0 text-primary" /> : null}
          <span className="min-w-0 break-words">{title}</span>
        </h1>
        {description ? (
          <p className="max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </section>
  );
}
