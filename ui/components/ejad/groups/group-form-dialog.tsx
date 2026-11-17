"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { toastError } from "@/components/ejad/error-alert";
import { useI18n } from "@/components/ejad/i18n-provider";
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
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createGroup,
  type ObjectGroup,
  updateGroupDetails,
} from "@/lib/ejad/groups";
import { graphqlClient } from "@/lib/graphql/client";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(255),
  description: z.string().trim().max(1024),
});

type Values = z.infer<typeof schema>;

/** What the dialog is doing: a new group (optionally a child) or a rename. */
export type GroupFormTarget =
  | { mode: "create"; parent: ObjectGroup | null }
  | { mode: "edit"; group: ObjectGroup };

export function GroupFormDialog({
  workspaceId,
  target,
  onOpenChange,
  onSaved,
}: {
  workspaceId: string;
  target: GroupFormTarget | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (group: ObjectGroup) => void;
}) {
  const { t } = useI18n();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  React.useEffect(() => {
    if (!target) return;
    form.reset(
      target.mode === "edit"
        ? {
            name: target.group.name,
            description: target.group.description ?? "",
          }
        : { name: "", description: "" },
    );
  }, [form, target]);

  const save = useMutation({
    mutationFn: (values: Values) => {
      if (!target) throw new Error("Nothing to save.");
      return target.mode === "edit"
        ? updateGroupDetails(graphqlClient, target.group.id, values)
        : createGroup(
            graphqlClient,
            workspaceId,
            values,
            target.parent?.id ?? null,
          );
    },
    onSuccess: (group) => {
      toast.success(
        target?.mode === "edit"
          ? t("groups.saved", { name: group.name })
          : t("groups.created", { name: group.name }),
      );
      onSaved(group);
      onOpenChange(false);
    },
    onError: (error) => toastError(error),
  });

  const title =
    target?.mode === "edit"
      ? t("groups.edit")
      : target?.parent
        ? t("groups.createSubgroup")
        : t("groups.create");
  const description =
    target?.mode === "edit"
      ? t("groups.editHint")
      : target?.parent
        ? t("groups.createInside", { name: target.parent.name })
        : t("groups.createHint");

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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
                      placeholder={t("groups.namePlaceholder")}
                      disabled={save.isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={t("common.optional")}
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
                {save.isPending
                  ? t("common.saving")
                  : target?.mode === "edit"
                    ? t("common.save")
                    : t("groups.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
