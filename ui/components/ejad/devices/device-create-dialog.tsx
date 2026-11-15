"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import type { Tag } from "emblor";
import { Plus } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { postDevice } from "@/components/ejad/devices/post-device";
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
  DialogTrigger,
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
import type { CreateDeviceResult } from "@/lib/ejad/devices";
import { parseMetadata } from "@/lib/ejad/workspaces";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  externalId: z.string().trim().max(255, "At most 255 characters."),
  tags: z.array(z.string().trim().min(1)),
  metadata: z.string().superRefine((text, ctx) => {
    try {
      parseMetadata(text);
    } catch (error) {
      ctx.addIssue({ code: "custom", message: (error as Error).message });
    }
  }),
});

type Values = z.infer<typeof schema>;

const EMPTY: Values = { name: "", externalId: "", tags: [], metadata: "{}" };

export function DeviceCreateDialog({
  onCreated,
}: {
  onCreated: (result: CreateDeviceResult) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [tagItems, setTagItems] = React.useState<Tag[]>([]);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  React.useEffect(() => {
    form.setValue(
      "tags",
      tagItems.map((tag) => tag.text),
      { shouldValidate: form.formState.isSubmitted },
    );
  }, [form, tagItems]);

  const create = useMutation({
    mutationFn: (values: Values) =>
      postDevice({
        name: values.name,
        externalId: values.externalId || undefined,
        tags: values.tags,
        metadata: parseMetadata(values.metadata),
      }),
    onSuccess: (result) => {
      toast.success(`Device “${result.device.name}” created`);
      if (result.keyError) {
        toast.warning(
          `The device was created but its secret was not: ${result.keyError}. Add one from the Credentials tab.`,
        );
      }
      onOpenChange(false);
      onCreated(result);
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "CONFLICT") {
        form.setError("externalId", {
          message: "Another device in this workspace already uses this ID.",
        });
        return;
      }
      toast.error(error.message);
    },
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset(EMPTY);
      setTagItems([]);
      create.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Create device
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create device</DialogTitle>
          <DialogDescription>
            A secret is generated for the device. You will see it once, right
            after the device is created.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid min-w-0 gap-4"
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <RequiredFormLabel required>Name</RequiredFormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoFocus
                      placeholder="temperature-sensor-01"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="externalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External ID</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="font-mono"
                      placeholder="Serial number or MAC address"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional. Must be unique in this workspace.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      className="[&_.cm-editor]:min-h-24"
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create device"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
