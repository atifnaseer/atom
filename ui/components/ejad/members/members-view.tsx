"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Trash2, UserCog, UsersRound } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ejad/empty-state";
import { ErrorAlert, toastError } from "@/components/ejad/error-alert";
import { useI18n } from "@/components/ejad/i18n-provider";
import { AddMemberDialog } from "@/components/ejad/members/add-member-dialog";
import { RoleSelect } from "@/components/ejad/members/role-select";
import { PageHeader } from "@/components/ejad/page-header";
import { requestJson } from "@/components/ejad/request-json";
import { TableSkeleton } from "@/components/ejad/skeletons";
import { StatusBadge } from "@/components/ejad/status-badge";
import { ACCESS_QUERY_KEY, useAccess } from "@/components/ejad/use-access";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ABILITY_DENIED, type WorkspaceRoleKey } from "@/lib/ejad/access";
import { type Member, WORKSPACE_ROLES } from "@/lib/ejad/members";

const MEMBERS_QUERY_KEY = "ejad-members";

export function MembersView({ workspaceId }: { workspaceId: string }) {
  const { t, localize } = useI18n();
  const access = useAccess();
  const queryClient = useQueryClient();
  const allowed = access.can("members");
  const [removing, setRemoving] = React.useState<Member | null>(null);

  const { data, error, isPending, refetch } = useQuery({
    queryKey: [MEMBERS_QUERY_KEY, workspaceId],
    enabled: allowed,
    queryFn: ({ signal }) =>
      requestJson<{ members: Member[]; self: string }>("/api/ejad/members", {
        signal,
      }),
  });

  const refresh = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] });
    // A user may have changed their own role.
    queryClient.invalidateQueries({ queryKey: [ACCESS_QUERY_KEY] });
  }, [queryClient]);

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: WorkspaceRoleKey }) =>
      requestJson(`/api/ejad/members/${id}`, {
        method: "PATCH",
        body: { role },
      }),
    onSuccess: () => {
      toast.success(t("members.roleChanged"));
      refresh();
    },
    onError: (err) => toastError(err),
  });

  const remove = useMutation({
    mutationFn: (member: Member) =>
      requestJson(`/api/ejad/members/${member.id}`, { method: "DELETE" }),
    onSuccess: (_, member) => {
      toast.success(t("members.removed", { name: member.name }));
      setRemoving(null);
      refresh();
    },
    onError: (err) => toastError(err),
  });

  const members = data?.members ?? [];

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        icon={UsersRound}
        title={t("page.members.title")}
        description={t("page.members.description")}
        actions={allowed ? <AddMemberDialog onAdded={refresh} /> : null}
      />

      {access.loading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : !allowed ? (
        <Alert>
          <ShieldCheck />
          <AlertTitle>{localize(ABILITY_DENIED.members)}</AlertTitle>
          <AlertDescription>
            {access.role
              ? t("members.yourRole", { role: t(`role.${access.role}`) })
              : t("members.noRole")}
          </AlertDescription>
        </Alert>
      ) : error ? (
        <ErrorAlert
          title={t("members.loadFailed")}
          error={error}
          onRetry={() => refetch()}
        />
      ) : isPending ? (
        <TableSkeleton rows={4} columns={4} />
      ) : members.length === 0 ? (
        <div className="rounded-lg border">
          <EmptyState
            icon={UsersRound}
            title={t("members.emptyTitle")}
            description={t("members.emptyHint")}
            action={<AddMemberDialog onAdded={refresh} />}
          />
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("members.user")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="w-44">{t("members.role")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("common.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <UserCog className="size-4 shrink-0 text-muted-foreground" />
                      <div className="grid min-w-0">
                        <span className="truncate font-medium">
                          {member.name}
                          {member.id === data?.self ? (
                            <Badge
                              variant="secondary"
                              className="ms-2 text-[0.68rem]"
                            >
                              {t("members.you")}
                            </Badge>
                          ) : null}
                        </span>
                        {member.email ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {member.email}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={member.status} />
                  </TableCell>
                  <TableCell>
                    <RoleSelect
                      value={member.role}
                      label={t("members.roleOf", { name: member.name })}
                      className="w-40"
                      disabled={changeRole.isPending}
                      onChange={(role) => {
                        if (role !== member.role)
                          changeRole.mutate({ id: member.id, role });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      aria-label={t("common.removeName", { name: member.name })}
                      onClick={() => setRemoving(member)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("members.roles")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
            {WORKSPACE_ROLES.map((role) => (
              <React.Fragment key={role.key}>
                <dt className="font-medium">{t(`role.${role.key}`)}</dt>
                <dd className="text-muted-foreground">
                  {t(`members.summary.${role.key}`)}
                </dd>
              </React.Fragment>
            ))}
          </dl>
        </CardContent>
      </Card>

      <AlertDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("members.removeTitle", { name: removing?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("members.removeHint")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (removing) remove.mutate(removing);
              }}
            >
              {remove.isPending ? t("common.removing") : t("common.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
