"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
          ? `Group “${group.name}” saved`
          : `Group “${group.name}” created`,
      );
      onSaved(group);
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const title =
    target?.mode === "edit"
      ? "Edit group"
      : target?.parent
        ? "Create subgroup"
        : "Create group";
  const description =
    target?.mode === "edit"
      ? "Change the group’s name and description."
      : target?.parent
        ? `The new group is created inside “${target.parent.name}”.`
        : "Groups organize the workspace’s devices and channels.";

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
                  <RequiredFormLabel required>Name</RequiredFormLabel>
                  <FormControl>
                    <Input
                      autoFocus
                      placeholder="Building A"
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Optional"
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
                {save.isPending
                  ? "Saving…"
                  : target?.mode === "edit"
                    ? "Save"
                    : "Create group"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
