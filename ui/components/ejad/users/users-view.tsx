"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CircleOff,
  CirclePlay,
  KeyRound,
  MoreVertical,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/crud/status-badge";
import { ErrorAlert, toastError } from "@/components/ejad/error-alert";
import { PageHeader } from "@/components/ejad/page-header";
import { requestJson } from "@/components/ejad/request-json";
import { TableSkeleton } from "@/components/ejad/skeletons";
import { useAccess } from "@/components/ejad/use-access";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PLATFORM_ADMIN_DENIED } from "@/lib/ejad/access";
import {
  MIN_PASSWORD_LENGTH,
  type PlatformUser,
  validatePassword,
} from "@/lib/ejad/users";

const USERS_QUERY_KEY = "ejad-users";

type Confirm = { user: PlatformUser; action: "disable" | "delete" };

export function UsersView() {
  const access = useAccess();
  const queryClient = useQueryClient();
  const [creating, setCreating] = React.useState(false);
  const [resetting, setResetting] = React.useState<PlatformUser | null>(null);
  const [confirm, setConfirm] = React.useState<Confirm | null>(null);

  const { data, error, isPending, refetch } = useQuery({
    queryKey: [USERS_QUERY_KEY],
    enabled: access.platformAdmin,
    queryFn: ({ signal }) =>
      requestJson<{ users: PlatformUser[]; self: string }>("/api/ejad/users", {
        signal,
      }),
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });

  const act = useMutation({
    mutationFn: async ({
      user,
      action,
    }: {
      user: PlatformUser;
      action: "enable" | "disable" | "delete";
    }) =>
      action === "delete"
        ? requestJson(`/api/ejad/users/${user.id}`, { method: "DELETE" })
        : requestJson(`/api/ejad/users/${user.id}`, {
            method: "PATCH",
            body: { action },
          }),
    onSuccess: (_, { user, action }) => {
      toast.success(
        action === "delete"
          ? `Deleted “${user.name}”`
          : action === "disable"
            ? `Disabled “${user.name}”`
            : `Enabled “${user.name}”`,
      );
      setConfirm(null);
      refresh();
    },
    onError: (err) => toastError(err),
  });

  const users = data?.users ?? [];

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        icon={UserRound}
        title="Users"
        description="Accounts that can sign in. Add them to workspaces on each workspace’s Members page."
        actions={
          access.platformAdmin ? (
            <Button onClick={() => setCreating(true)}>
              <UserPlus />
              Create user
            </Button>
          ) : null
        }
      />

      {access.loading ? (
        <TableSkeleton rows={4} columns={3} />
      ) : !access.platformAdmin ? (
        <Alert>
          <ShieldCheck />
          <AlertTitle>{PLATFORM_ADMIN_DENIED}</AlertTitle>
          <AlertDescription>
            Ask a platform admin to create or change user accounts.
          </AlertDescription>
        </Alert>
      ) : error ? (
        <ErrorAlert
          title="Could not load users"
          error={error}
          onRetry={() => refetch()}
        />
      ) : isPending ? (
        <TableSkeleton rows={4} columns={3} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const self = user.id === data?.self;
                const locked = self || user.system;
                const active = user.status === "active";
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <UserRound className="size-4 shrink-0 text-muted-foreground" />
                        <div className="grid min-w-0">
                          <span className="truncate font-medium">
                            {user.name}
                            {self ? (
                              <Badge
                                variant="secondary"
                                className="ml-2 text-[0.68rem]"
                              >
                                You
                              </Badge>
                            ) : user.system ? (
                              <Badge
                                variant="outline"
                                className="ml-2 text-[0.68rem]"
                              >
                                Built-in
                              </Badge>
                            ) : null}
                          </span>
                          {user.email ? (
                            <span className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={user.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(new Date(user.createdAt), "d MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Actions for ${user.name}`}
                          >
                            <MoreVertical />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setResetting(user)}>
                            <KeyRound />
                            Reset password
                          </DropdownMenuItem>
                          {active ? (
                            <DropdownMenuItem
                              disabled={locked}
                              onSelect={() =>
                                setConfirm({ user, action: "disable" })
                              }
                            >
                              <CircleOff />
                              Disable
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() =>
                                act.mutate({ user, action: "enable" })
                              }
                            >
                              <CirclePlay />
                              Enable
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={locked}
                            onSelect={() =>
                              setConfirm({ user, action: "delete" })
                            }
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateUserDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={refresh}
      />
      <ResetPasswordDialog
        user={resetting}
        onOpenChange={(open) => {
          if (!open) setResetting(null);
        }}
      />
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !act.isPending) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "delete" ? "Delete" : "Disable"} “
              {confirm?.user.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "delete"
                ? "The account is deleted, its passwords and sessions are revoked, and it loses access to every workspace."
                : "The user can no longer sign in until the account is enabled again. Their workspace memberships are kept."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={act.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={act.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (confirm) act.mutate(confirm);
              }}
            >
              {act.isPending
                ? "Working…"
                : confirm?.action === "delete"
                  ? "Delete"
                  : "Disable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPassword("");
    }
  }, [open]);

  const create = useMutation({
    mutationFn: () =>
      requestJson<{ user: PlatformUser }>("/api/ejad/users", {
        method: "POST",
        body: { name, email: email || null, password },
      }),
    onSuccess: ({ user }) => {
      toast.success(`User “${user.name}” created`);
      onOpenChange(false);
      onCreated();
    },
    onError: (err) => toastError(err),
  });
  const passwordError = password ? validatePassword(password) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!create.isPending) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            The user signs in with the username (or email) and this password,
            and can create workspaces of their own.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="user-name">Username</Label>
            <Input
              id="user-name"
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="user-email">Email (optional)</Label>
            <Input
              id="user-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="user-password">Password</Label>
            <PasswordInput
              id="user-password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <p
              className={`text-xs ${passwordError ? "text-destructive" : "text-muted-foreground"}`}
            >
              {passwordError ?? `At least ${MIN_PASSWORD_LENGTH} characters.`}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={create.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !name.trim() ||
                !password ||
                Boolean(passwordError) ||
                create.isPending
              }
            >
              {create.isPending ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  user,
  onOpenChange,
}: {
  user: PlatformUser | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [password, setPassword] = React.useState("");
  React.useEffect(() => {
    if (user) setPassword("");
  }, [user]);

  const reset = useMutation({
    mutationFn: () =>
      requestJson(`/api/ejad/users/${user?.id}`, {
        method: "PATCH",
        body: { action: "reset-password", password },
      }),
    onSuccess: () => {
      toast.success(`Password of “${user?.name}” reset`);
      onOpenChange(false);
    },
    onError: (err) => toastError(err),
  });
  const passwordError = password ? validatePassword(password) : null;

  return (
    <Dialog
      open={user !== null}
      onOpenChange={(next) => {
        if (!reset.isPending) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password of “{user?.name}”</DialogTitle>
          <DialogDescription>
            The new password replaces every existing one. Share it with the user
            over a safe channel.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            reset.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="reset-password">New password</Label>
            <PasswordInput
              id="reset-password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <p
              className={`text-xs ${passwordError ? "text-destructive" : "text-muted-foreground"}`}
            >
              {passwordError ?? `At least ${MIN_PASSWORD_LENGTH} characters.`}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={reset.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!password || Boolean(passwordError) || reset.isPending}
            >
              {reset.isPending ? "Saving…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
