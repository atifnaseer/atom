"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Eye, KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/crud/status-badge";
import {
  SharedKeyDialog,
  type ShownKey,
} from "@/components/ejad/devices/shared-key-dialog";
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
import {
  CREDENTIALS_QUERY,
  type Credential,
  createSharedKey,
  REVEAL_SHARED_KEY_MUTATION,
  REVOKE_CREDENTIAL_MUTATION,
  rotateSharedKey,
  type SharedKey,
} from "@/lib/ejad/devices";
import { graphqlClient } from "@/lib/graphql/client";

const KIND_LABELS: Record<string, string> = {
  shared_key: "Secret (shared key)",
  password: "Password",
  access_token: "Access token",
  certificate: "Certificate",
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
  const queryClient = useQueryClient();
  const queryKey = ["ejad-device-credentials", deviceId];
  const [shown, setShown] = React.useState<ShownKey | null>(null);
  const [confirm, setConfirm] = React.useState<Confirm | null>(null);

  const { data, error, isPending } = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      graphqlClient<{ credentials: { items: Credential[] } }>({
        query: CREDENTIALS_QUERY,
        variables: { entityId: deviceId },
        signal,
      }),
  });
  // Active first, newest first within each group.
  const credentials = [...(data?.credentials.items ?? [])].sort(
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
      description: `New secret for “${deviceName}”. The device authenticates with it, for example with the HTTP header “Authorization: Client <secret>”.`,
      key: sharedKey.key,
      once: true,
    });
  }

  const create = useMutation({
    mutationFn: () => createSharedKey(graphqlClient, deviceId),
    onSuccess: (sharedKey) => {
      refresh();
      showNewKey(sharedKey, "Secret created");
    },
    onError: (err) => toast.error(err.message),
  });

  const reveal = useMutation({
    mutationFn: async (credential: Credential) => {
      const result = await graphqlClient<{ revealSharedKey: SharedKey }>({
        query: REVEAL_SHARED_KEY_MUTATION,
        variables: { entityId: deviceId, credentialId: credential.id },
      });
      return result.revealSharedKey;
    },
    onSuccess: (sharedKey) => {
      queryClient.invalidateQueries({ queryKey: ["object-audit"] });
      setShown({
        title: "Device secret",
        description: `Secret ${shortId(sharedKey.credentialId)} of “${deviceName}”. Revealing a secret is recorded in the audit log.`,
        key: sharedKey.key,
        once: false,
      });
    },
    onError: (err) => toast.error(err.message),
  });

  const act = useMutation({
    mutationFn: async ({ action, credential }: Confirm) => {
      if (action === "rotate") {
        return rotateSharedKey(graphqlClient, deviceId, credential.id);
      }
      await graphqlClient({
        query: REVOKE_CREDENTIAL_MUTATION,
        variables: { entityId: deviceId, credentialId: credential.id },
      });
      return null;
    },
    onSuccess: (result) => {
      setConfirm(null);
      refresh();
      if (!result) {
        toast.success("Secret revoked");
        return;
      }
      if (result.revokeError) {
        toast.warning(
          `A new secret was created, but the old one was not revoked: ${result.revokeError}`,
        );
      }
      showNewKey(result.sharedKey, "Secret rotated");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {activeKeys === 0
            ? "This device has no active secret and cannot authenticate."
            : `${activeKeys} active secret${activeKeys === 1 ? "" : "s"}.`}
        </p>
        <Button
          size="sm"
          onClick={() => create.mutate()}
          disabled={readOnly || create.isPending}
        >
          <Plus />
          {create.isPending ? "Creating…" : "Create secret"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error.message}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credential</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : credentials.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No credentials.
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
                        {KIND_LABELS[credential.kind] ?? credential.kind}
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={credential.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format(
                          new Date(credential.createdAt),
                          "d MMM yyyy, HH:mm",
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {credential.expiresAt
                          ? format(new Date(credential.expiresAt), "d MMM yyyy")
                          : "Never"}
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
                              Reveal
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
                              Rotate
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
                              Revoke
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
                ? "Rotate this secret?"
                : "Revoke this secret?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "rotate"
                ? "A new secret is created and the current one is revoked. The device must be updated with the new secret to keep connecting."
                : "The device can no longer authenticate with this secret. This cannot be undone."}
              {confirm?.action === "revoke" && activeKeys === 1
                ? " It is the device's only active secret."
                : ""}
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
                : confirm?.action === "rotate"
                  ? "Rotate secret"
                  : "Revoke secret"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SharedKeyDialog shown={shown} onClose={() => setShown(null)} />
    </div>
  );
}
