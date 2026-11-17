"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import {
  deviceKeyAction,
  listDeviceKeys,
} from "@/components/ejad/devices/device-keys-client";
import {
  SharedKeyDialog,
  type ShownKey,
} from "@/components/ejad/devices/shared-key-dialog";
import { ErrorAlert, toastError } from "@/components/ejad/error-alert";
import { useI18n } from "@/components/ejad/i18n-provider";
import { StatusBadge } from "@/components/ejad/status-badge";
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
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Credential, SharedKey } from "@/lib/ejad/devices";
import type { MessageKey } from "@/lib/ejad/i18n/messages";

const KIND_KEYS: Record<string, MessageKey> = {
  shared_key: "credentials.kind.sharedKey",
  password: "auth.password",
  access_token: "credentials.kind.accessToken",
  certificate: "credentials.kind.certificate",
};

type Confirm = { action: "rotate" | "revoke"; credential: Credential };

function shortId(id: string) {
  return id.slice(0, 8);
}

export function DeviceCredentials({
  deviceId,
  deviceName,
  readOnly,
}: {
  deviceId: string;
  deviceName: string;
  readOnly: boolean;
}) {
  const { t, format } = useI18n();
  const queryClient = useQueryClient();
  const queryKey = ["ejad-device-credentials", deviceId];
  const [shown, setShown] = React.useState<ShownKey | null>(null);
  const [confirm, setConfirm] = React.useState<Confirm | null>(null);

  const { data, error, isPending } = useQuery({
    queryKey,
    queryFn: ({ signal }) => listDeviceKeys(deviceId, signal),
  });
  // Active first, newest first within each group.
  const credentials = [...(data ?? [])].sort(
    (a, b) =>
      Number(b.status === "active") - Number(a.status === "active") ||
      b.createdAt.localeCompare(a.createdAt),
  );
  const activeKeys = credentials.filter(
    (c) => c.kind === "shared_key" && c.status === "active",
  ).length;

  function refresh() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["object-audit"] });
  }

  function showNewKey(sharedKey: SharedKey, title: string) {
    setShown({
      title,
      description: t("credentials.newHint", { name: deviceName }),
      key: sharedKey.key,
      once: true,
    });
  }

  const create = useMutation({
    mutationFn: async () =>
      (await deviceKeyAction(deviceId, "create")).sharedKey,
    onSuccess: (sharedKey) => {
      refresh();
      showNewKey(sharedKey, t("credentials.created"));
    },
    onError: (err) => toastError(err),
  });

  const reveal = useMutation({
    mutationFn: async (credential: Credential) =>
      (await deviceKeyAction(deviceId, "reveal", credential.id)).sharedKey,
    onSuccess: (sharedKey) => {
      queryClient.invalidateQueries({ queryKey: ["object-audit"] });
      setShown({
        title: t("credentials.revealTitle"),
        description: t("credentials.revealHint", {
          id: shortId(sharedKey.credentialId),
          name: deviceName,
        }),
        key: sharedKey.key,
        once: false,
      });
    },
    onError: (err) => toastError(err),
  });

  const act = useMutation({
    mutationFn: async ({ action, credential }: Confirm) => {
      if (action === "rotate") {
        return deviceKeyAction<{
          sharedKey: SharedKey;
          revokeError: string | null;
        }>(deviceId, "rotate", credential.id);
      }
      await deviceKeyAction(deviceId, "revoke", credential.id);
      return null;
    },
    onSuccess: (result) => {
      setConfirm(null);
      refresh();
      if (!result) {
        toast.success(t("credentials.revoked"));
        return;
      }
      if (result.revokeError) {
        toast.warning(
          t("credentials.revokeFailed", { error: result.revokeError }),
        );
      }
      showNewKey(result.sharedKey, t("credentials.rotated"));
    },
    onError: (err) => toastError(err),
  });

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {activeKeys === 0
            ? t("credentials.none")
            : t("credentials.active", { count: activeKeys })}
        </p>
        <Button
          size="sm"
          onClick={() => create.mutate()}
          disabled={readOnly || create.isPending}
        >
          <Plus />
          {create.isPending ? t("common.creating") : t("credentials.create")}
        </Button>
      </div>

      {error ? (
        <ErrorAlert title={t("credentials.loadFailed")} error={error} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("credentials.credential")}</TableHead>
                <TableHead>{t("common.type")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.created")}</TableHead>
                <TableHead>{t("credentials.expires")}</TableHead>
                <TableHead className="text-end">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground"
                  >
                    {t("common.loadingEllipsis")}
                  </TableCell>
                </TableRow>
              ) : credentials.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground"
                  >
                    {t("credentials.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                credentials.map((credential) => {
                  const isKey = credential.kind === "shared_key";
                  const active = credential.status === "active";
                  const locked = readOnly || Boolean(credential.managedBy);
                  return (
                    <TableRow key={credential.id}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <KeyRound className="size-4 text-muted-foreground" />
                          <code
                            className="font-mono text-xs"
                            title={credential.id}
                          >
                            {shortId(credential.id)}
                          </code>
                        </span>
                      </TableCell>
                      <TableCell>
                        {KIND_KEYS[credential.kind]
                          ? t(KIND_KEYS[credential.kind])
                          : credential.kind}
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={credential.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format.date(credential.createdAt, "dateTime")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {credential.expiresAt
                          ? format.date(credential.expiresAt)
                          : t("common.never")}
                      </TableCell>
                      <TableCell>
                        {isKey && active ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={reveal.isPending}
                              onClick={() => reveal.mutate(credential)}
                            >
                              <Eye />
                              {t("credentials.reveal")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={locked}
                              onClick={() =>
                                setConfirm({ action: "rotate", credential })
                              }
                            >
                              <RefreshCw />
                              {t("credentials.rotate")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={locked}
                              onClick={() =>
                                setConfirm({ action: "revoke", credential })
                              }
                            >
                              <Trash2 />
                              {t("credentials.revoke")}
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !act.isPending) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "rotate"
                ? t("credentials.rotateTitle")
                : t("credentials.revokeTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "rotate"
                ? t("credentials.rotateHint")
                : t("credentials.revokeHint")}
              {confirm?.action === "revoke" && activeKeys === 1
                ? ` ${t("credentials.onlyActive")}`
                : ""}
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
                : confirm?.action === "rotate"
                  ? t("credentials.rotateAction")
                  : t("credentials.revokeAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SharedKeyDialog shown={shown} onClose={() => setShown(null)} />
    </div>
  );
}
