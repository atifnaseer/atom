"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { toastError } from "@/components/ejad/error-alert";
import { useT } from "@/components/ejad/i18n-provider";
import { RequiredFormLabel } from "@/components/forms/required-form-label";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  createDashboard,
  DASHBOARD_NAME_MAX_LENGTH,
  type Dashboard,
  dashboardName,
  duplicateDashboard,
  renameDashboard,
} from "@/lib/ejad/dashboards";
import type { MessageKey } from "@/lib/ejad/i18n/messages";
import { graphqlClient } from "@/lib/graphql/client";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(DASHBOARD_NAME_MAX_LENGTH),
});

type Values = z.infer<typeof schema>;

/** What the dialog does: a new dashboard, a rename, or a copy. */
export type DashboardNameTarget =
  | { mode: "create" }
  | { mode: "rename"; dashboard: Dashboard }
  | { mode: "duplicate"; dashboard: Dashboard; suggestedName: string };

const COPY = {
  create: {
    title: "dashboards.create",
    description: "dashboards.createHint",
    submit: "dashboards.create",
    done: "dashboards.created",
  },
  rename: {
    title: "dashboards.rename",
    description: "dashboards.renameHint",
    submit: "common.save",
    done: "dashboards.renamed",
  },
  duplicate: {
    title: "dashboards.duplicateTitle",
    description: "dashboards.duplicateHint",
    submit: "dashboards.duplicate",
    done: "dashboards.created",
  },
} as const satisfies Record<string, Record<string, MessageKey>>;

export function DashboardNameDialog({
  workspaceId,
  target,
  onOpenChange,
  onSaved,
}: {
  workspaceId: string;
  target: DashboardNameTarget | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (dashboard: Dashboard, mode: DashboardNameTarget["mode"]) => void;
}) {
  const t = useT();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  React.useEffect(() => {
    if (!target) return;
    form.reset({
      name:
        target.mode === "rename"
          ? dashboardName(target.dashboard)
          : target.mode === "duplicate"
            ? target.suggestedName
            : "",
    });
  }, [form, target]);

  const save = useMutation({
    mutationFn: ({ name }: Values) => {
      if (!target) throw new Error("Nothing to save.");
      if (target.mode === "rename")
        return renameDashboard(graphqlClient, target.dashboard.id, name);
      if (target.mode === "duplicate")
        return duplicateDashboard(graphqlClient, target.dashboard, name);
      return createDashboard(graphqlClient, workspaceId, name);
    },
    onSuccess: (dashboard) => {
      if (!target) return;
      toast.success(
        t(COPY[target.mode].done, { name: dashboardName(dashboard) }),
      );
      onSaved(dashboard, target.mode);
      onOpenChange(false);
    },
    onError: (error) => toastError(error),
  });

  const copy = COPY[target?.mode ?? "create"];

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (save.isPending) return;
        if (!open) save.reset();
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(copy.title)}</DialogTitle>
          <DialogDescription>{t(copy.description)}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid min-w-0 gap-4"
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <RequiredFormLabel required>
                    {t("common.name")}
                  </RequiredFormLabel>
                  <FormControl>
                    <Input
                      autoFocus
                      placeholder={t("dashboards.namePlaceholder")}
                      disabled={save.isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? t("common.saving") : t(copy.submit)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
