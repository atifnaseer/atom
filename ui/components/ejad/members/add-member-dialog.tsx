"use client";

import { useMutation } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { toastError } from "@/components/ejad/error-alert";
import { RoleSelect } from "@/components/ejad/members/role-select";
import { requestJson } from "@/components/ejad/request-json";
import { AsyncCombobox, type ComboPage } from "@/components/ui/async-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { WorkspaceRoleKey } from "@/lib/ejad/access";
import type { MemberCandidate } from "@/lib/ejad/members";

async function searchUsers(
  search: string,
  signal?: AbortSignal,
): Promise<ComboPage> {
  const q = search.trim();
  if (q.length < 3) return { items: [], nextOffset: null };
  const { users } = await requestJson<{ users: MemberCandidate[] }>(
    `/api/ejad/members/candidates?q=${encodeURIComponent(q)}`,
    { signal },
  );
  return {
    items: users.map((user) => ({
      value: user.id,
      label: user.name,
      detail: user.email ?? undefined,
    })),
    nextOffset: null,
  };
}

/** Adds an existing user to the workspace with a role. */
export function AddMemberDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [entityId, setEntityId] = React.useState("");
  const [role, setRole] = React.useState<WorkspaceRoleKey>("viewer");

  const add = useMutation({
    mutationFn: () =>
      requestJson("/api/ejad/members", {
        method: "POST",
        body: { entityId, role },
      }),
    onSuccess: () => {
      toast.success("Member added");
      setOpen(false);
      onAdded();
    },
    onError: (error) => toastError(error),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (add.isPending) return;
        setOpen(next);
        if (next) {
          setEntityId("");
          setRole("viewer");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          Add member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            Give an existing user access to this workspace. Platform admins
            create users on the Users page.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (entityId) add.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="member-user">User</Label>
            <AsyncCombobox
              id="member-user"
              value={entityId}
              onChange={setEntityId}
              fetchPage={({ search, signal }) => searchUsers(search, signal)}
              queryKey={["ejad-member-candidates"]}
              placeholder="Pick a user"
              searchPlaceholder="Type 3+ letters of a name or email…"
              emptyText="Type at least 3 letters to find users."
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="member-role">Role</Label>
            <RoleSelect
              id="member-role"
              value={role}
              onChange={setRole}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={add.isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!entityId || add.isPending}>
              {add.isPending ? "Adding…" : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
