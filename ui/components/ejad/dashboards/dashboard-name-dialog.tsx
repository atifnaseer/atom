"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { toastError } from "@/components/ejad/error-alert";
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
    title: "Create dashboard",
    description: "Start with an empty dashboard and add widgets to it.",
    submit: "Create dashboard",
    done: "created",
  },
  rename: {
    title: "Rename dashboard",
    description: "Change the dashboard’s name.",
    submit: "Save",
    done: "renamed",
  },
  duplicate: {
    title: "Duplicate dashboard",
    description: "The copy gets the same widgets.",
    submit: "Duplicate",
    done: "created",
  },
} as const;

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
        `Dashboard “${dashboardName(dashboard)}” ${COPY[target.mode].done}`,
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
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
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
                  <RequiredFormLabel required>Name</RequiredFormLabel>
                  <FormControl>
                    <Input
                      autoFocus
                      placeholder="Cold room"
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
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : copy.submit}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
