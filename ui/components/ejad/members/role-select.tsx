"use client";

import { useT } from "@/components/ejad/i18n-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkspaceRoleKey } from "@/lib/ejad/access";
import { WORKSPACE_ROLES } from "@/lib/ejad/members";

export function RoleSelect({
  value,
  onChange,
  disabled,
  id,
  className,
  label,
}: {
  value: WorkspaceRoleKey | null;
  onChange: (role: WorkspaceRoleKey) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  label?: string;
}) {
  const t = useT();
  return (
    <Select
      value={value ?? undefined}
      onValueChange={(next) => onChange(next as WorkspaceRoleKey)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className} aria-label={label}>
        <SelectValue placeholder={t("role.none")} />
      </SelectTrigger>
      <SelectContent>
        {WORKSPACE_ROLES.map((role) => (
          <SelectItem key={role.key} value={role.key}>
            {t(`role.${role.key}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
