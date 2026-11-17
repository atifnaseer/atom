"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import type { Tag } from "emblor";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { toastError } from "@/components/ejad/error-alert";
import { RequiredFormLabel } from "@/components/forms/required-form-label";
import { TagsFormInput } from "@/components/tags-form-input";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { JsonEditor } from "@/components/ui/json-editor";
import { Label } from "@/components/ui/label";
import {
  parseMetadata,
  UPDATE_WORKSPACE_MUTATION,
  updateWorkspaceInput,
  type Workspace,
  workspaceMetadata,
} from "@/lib/ejad/workspaces";
import { graphqlClient } from "@/lib/graphql/client";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  tags: z
    .array(z.string().trim().min(1))
    .refine(
      (tags) => new Set(tags).size === tags.length,
      "Tags must be unique.",
    ),
  metadata: z.string().superRefine((text, ctx) => {
    try {
      parseMetadata(text);
    } catch (error) {
      ctx.addIssue({ code: "custom", message: (error as Error).message });
    }
  }),
});

type Values = z.infer<typeof schema>;

export function WorkspaceEditDialog({
  workspace,
  onOpenChange,
  onSaved,
}: {
  /** The workspace being edited; null keeps the dialog closed. */
  workspace: Workspace | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (workspace: Workspace) => void;
}) {
  return (
    <Dialog open={workspace !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit workspace</DialogTitle>
          <DialogDescription>
            Change the name, tags and metadata of this workspace.
          </DialogDescription>
        </DialogHeader>
        {workspace ? (
          <EditForm
            key={workspace.id}
            workspace={workspace}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  workspace,
  onCancel,
  onSaved,
}: {
  workspace: Workspace;
  onCancel: () => void;
  onSaved: (workspace: Workspace) => void;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: workspace.name,
      tags: workspace.tags ?? [],
      metadata: JSON.stringify(workspaceMetadata(workspace), null, 2),
    },
  });
  const [tagItems, setTagItems] = React.useState<Tag[]>(() =>
    (workspace.tags ?? []).map((tag) => ({ id: tag, text: tag })),
  );

  React.useEffect(() => {
    form.setValue(
      "tags",
      tagItems.map((tag) => tag.text),
      { shouldValidate: form.formState.isSubmitted },
    );
  }, [form, tagItems]);

  const update = useMutation({
    mutationFn: async (values: Values) => {
      const data = await graphqlClient<{ updateTenant: Workspace }>({
        query: UPDATE_WORKSPACE_MUTATION,
        variables: {
          id: workspace.id,
          input: updateWorkspaceInput(workspace, {
            name: values.name,
            tags: values.tags,
            metadata: parseMetadata(values.metadata),
          }),
        },
      });
      return data.updateTenant;
    },
    onSuccess: (updated) => {
      toast.success(`Workspace “${updated.name}” updated`);
      onSaved(updated);
    },
    onError: (error) => toastError(error),
  });

  return (
    <Form {...form}>
      <form
        className="grid min-w-0 gap-4"
        onSubmit={form.handleSubmit((values) => update.mutate(values))}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <RequiredFormLabel required>Name</RequiredFormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-2">
          <Label htmlFor="workspace-route">Route</Label>
          <Input
            id="workspace-route"
            className="font-mono"
            value={workspace.alias ?? ""}
            readOnly
            disabled
          />
          <p className="text-muted-foreground text-sm">
            The route cannot be changed.
          </p>
        </div>
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <TagsFormInput
              field={field}
              label="Tags"
              newTags={tagItems}
              placeholder="Type a tag and press Enter"
              setTags={setTagItems}
            />
          )}
        />
        <FormField
          control={form.control}
          name="metadata"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Metadata</FormLabel>
              <FormControl>
                <JsonEditor
                  className="[&_.cm-editor]:min-h-32"
                  onChange={field.onChange}
                  value={field.value}
                />
              </FormControl>
              <FormDescription>A JSON object.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
