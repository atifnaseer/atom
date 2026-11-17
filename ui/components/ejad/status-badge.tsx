"use client";

import { StatusBadge as BaseStatusBadge } from "@/components/crud/status-badge";
import { useI18n } from "@/components/ejad/i18n-provider";
import { messages } from "@/lib/ejad/i18n/messages";

/** Atom's status badge with the status word translated. */
export function StatusBadge({ value }: { value: unknown }) {
  const { t } = useI18n();
  const text = String(value ?? "").toLowerCase();
  const key = `status.${text}`;
  return (
    <BaseStatusBadge
      value={value}
      label={key in messages ? t(key as keyof typeof messages) : undefined}
    />
  );
}
