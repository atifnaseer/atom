"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/components/ejad/error-alert";
import { useAccess } from "@/components/ejad/use-access";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { errorText, requestError } from "@/lib/ejad/errors";
import type { StoreState } from "@/lib/ejad/store-messages";

export const STORE_STATE_QUERY_KEY = "ejad-channel-store";

export async function storeRequest(
  channelId: string,
  init?: RequestInit,
): Promise<StoreState> {
  const response = await fetch(
    `/api/ejad/channels/${encodeURIComponent(channelId)}/store`,
    { cache: "no-store", ...init },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw requestError(response, payload);
  return payload as StoreState;
}

/**
 * "Store messages": on = the channel is flagged (attributes.store_messages)
 * and the ejad-store service saves its messages; off = the flag is removed.
 */
export function StoreMessagesSwitch({ channelId }: { channelId: string }) {
  const queryClient = useQueryClient();
  const canChange = useAccess().can("manage");
  const queryKey = [STORE_STATE_QUERY_KEY, channelId];
  const { data, error, isPending } = useQuery({
    queryKey,
    queryFn: ({ signal }) => storeRequest(channelId, { signal }),
  });
  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      storeRequest(channelId, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: (state) => {
      queryClient.setQueryData(queryKey, state);
      toast.success(
        state.enabled
          ? "Messages on this channel are now stored."
          : "Messages on this channel are no longer stored.",
      );
    },
    onError: (err) => toastError(err),
  });

  const checked = mutation.isPending
    ? Boolean(mutation.variables)
    : Boolean(data?.enabled);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Database className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="grid grid-cols-1 gap-1">
            <Label htmlFor={`store-${channelId}`} className="font-medium">
              Store messages
            </Label>
            <p className="text-sm text-muted-foreground">
              {error
                ? `Could not load the setting. ${errorText(error)}`
                : canChange
                  ? "Save messages published to this channel so they appear below."
                  : "Whether messages published to this channel are saved. Only workspace Admins and Operators can change this."}
            </p>
          </div>
        </div>
        {isPending ? (
          <Skeleton className="h-[18.4px] w-8 rounded-full" />
        ) : (
          <Switch
            id={`store-${channelId}`}
            checked={checked}
            disabled={!canChange || Boolean(error) || mutation.isPending}
            onCheckedChange={(value) => mutation.mutate(value)}
          />
        )}
      </CardContent>
    </Card>
  );
}
