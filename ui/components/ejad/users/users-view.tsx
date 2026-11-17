"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ErrorAlert, toastError } from "@/components/ejad/error-alert";
import { useI18n } from "@/components/ejad/i18n-provider";
import { PageHeader } from "@/components/ejad/page-header";
import { requestJson } from "@/components/ejad/request-json";
import { TableSkeleton } from "@/components/ejad/skeletons";
import { StatusBadge } from "@/components/ejad/status-badge";
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
  const { t, format, localize } = useI18n();
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
        t(
          action === "delete"
            ? "users.deleted"
            : action === "disable"
              ? "users.disabled"
              : "users.enabled",
          { name: user.name },
        ),
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
        title={t("page.users.title")}
        description={t("page.users.description")}
        actions={
          access.platformAdmin ? (
            <Button onClick={() => setCreating(true)}>
              <UserPlus />
              {t("users.create")}
            </Button>
          ) : null
        }
      />

      {access.loading ? (
        <TableSkeleton rows={4} columns={3} />
      ) : !access.platformAdmin ? (
        <Alert>
          <ShieldCheck />
          <AlertTitle>{localize(PLATFORM_ADMIN_DENIED)}</AlertTitle>
          <AlertDescription>{t("users.askAdmin")}</AlertDescription>
        </Alert>
      ) : error ? (
        <ErrorAlert
          title={t("users.loadFailed")}
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
                <TableHead>{t("members.user")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.created")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("common.actions")}</span>
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
                                className="ms-2 text-[0.68rem]"
                              >
                                {t("members.you")}
                              </Badge>
                            ) : user.system ? (
                              <Badge
                                variant="outline"
                                className="ms-2 text-[0.68rem]"
                              >
                                {t("users.builtIn")}
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
                      {format.date(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={t("common.actionsFor", {
                              name: user.name,
                            })}
                          >
                            <MoreVertical />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setResetting(user)}>
                            <KeyRound />
                            {t("users.resetPassword")}
                          </DropdownMenuItem>
                          {active ? (
                            <DropdownMenuItem
                              disabled={locked}
                              onSelect={() =>
                                setConfirm({ user, action: "disable" })
                              }
                            >
                              <CircleOff />
                              {t("common.disable")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() =>
                                act.mutate({ user, action: "enable" })
                              }
                            >
                              <CirclePlay />
                              {t("common.enable")}
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
                            {t("common.delete")}
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
              {t(
                confirm?.action === "delete"
                  ? "users.deleteTitle"
                  : "users.disableTitle",
                { name: confirm?.user.name ?? "" },
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "delete"
                ? t("users.deleteHint")
                : t("users.disableHint")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={act.isPending}>
              {t("common.cancel")}
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
                ? t("common.working")
                : confirm?.action === "delete"
                  ? t("common.delete")
                  : t("common.disable")}
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
  const { t, localize } = useI18n();
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
      toast.success(t("users.created", { name: user.name }));
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
          <DialogTitle>{t("users.create")}</DialogTitle>
          <DialogDescription>{t("users.createHint")}</DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="user-name">{t("users.username")}</Label>
            <Input
              id="user-name"
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="user-email">{t("users.emailOptional")}</Label>
            <Input
              id="user-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="user-password">{t("auth.password")}</Label>
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
              {passwordError
                ? localize(passwordError)
                : t("users.minLength", { count: MIN_PASSWORD_LENGTH })}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={create.isPending}
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
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
              {create.isPending ? t("common.creating") : t("users.create")}
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
  const { t, localize } = useI18n();
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
      toast.success(t("users.passwordReset", { name: user?.name ?? "" }));
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
          <DialogTitle>
            {t("users.resetTitle", { name: user?.name ?? "" })}
          </DialogTitle>
          <DialogDescription>{t("users.resetHint")}</DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            reset.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="reset-password">{t("users.newPassword")}</Label>
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
              {passwordError
                ? localize(passwordError)
                : t("users.minLength", { count: MIN_PASSWORD_LENGTH })}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={reset.isPending}
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!password || Boolean(passwordError) || reset.isPending}
            >
              {reset.isPending ? t("common.saving") : t("users.resetPassword")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
