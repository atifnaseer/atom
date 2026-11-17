"use client";

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
  return (
    <Select
      value={value ?? undefined}
      onValueChange={(next) => onChange(next as WorkspaceRoleKey)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className} aria-label={label}>
        <SelectValue placeholder="No role" />
      </SelectTrigger>
      <SelectContent>
        {WORKSPACE_ROLES.map((role) => (
          <SelectItem key={role.key} value={role.key}>
            {role.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
