"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { StoreState } from "@/lib/ejad/store-rule";

export const STORE_STATE_QUERY_KEY = "ejad-channel-store";

async function storeRequest(
  channelId: string,
  init?: RequestInit,
): Promise<StoreState> {
  const response = await fetch(
    `/api/ejad/channels/${encodeURIComponent(channelId)}/store`,
    { cache: "no-store", ...init },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      payload?.message ?? `The request failed (${response.status}).`,
    );
  return payload as StoreState;
}

/**
 * "Store messages": on = a rules-engine rule passes the channel's messages
 * to the SenML message store; off = no such rule.
 */
export function StoreMessagesSwitch({ channelId }: { channelId: string }) {
  const queryClient = useQueryClient();
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
    onError: (err) => toast.error(err.message),
  });

  const checked = mutation.isPending
    ? Boolean(mutation.variables)
    : Boolean(data?.enabled);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Database className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="grid gap-1">
            <Label htmlFor={`store-${channelId}`} className="font-medium">
              Store messages
            </Label>
            <p className="text-sm text-muted-foreground">
              {error
                ? `Could not check the rules engine: ${error.message}`
                : "Save messages published to this channel so they appear below. Uses a rules-engine rule with SenML storage."}
            </p>
          </div>
        </div>
        {isPending ? (
          <Skeleton className="h-[18.4px] w-8 rounded-full" />
        ) : (
          <Switch
            id={`store-${channelId}`}
            checked={checked}
            disabled={Boolean(error) || mutation.isPending}
            onCheckedChange={(value) => mutation.mutate(value)}
          />
        )}
      </CardContent>
    </Card>
  );
}
