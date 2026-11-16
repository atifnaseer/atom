"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import type { Tag } from "emblor";
import { Plus } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  type PostChannelError,
  postChannel,
} from "@/components/ejad/channels/post-channel";
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
import {
  CHANNEL_ROUTE_MAX_LENGTH,
  type Channel,
  channelRouteFromName,
  channelTopic,
  validateChannelRoute,
} from "@/lib/ejad/channels";
import { parseMetadata } from "@/lib/ejad/workspaces";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  route: z
    .string()
    .trim()
    .superRefine((route, ctx) => {
      const message = validateChannelRoute(route);
      if (message) ctx.addIssue({ code: "custom", message });
    }),
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

const EMPTY: Values = { name: "", route: "", tags: [], metadata: "{}" };

export function ChannelCreateDialog({
  workspaceRoute,
  onCreated,
}: {
  /** The workspace route (tenant alias), to preview the MQTT topic. */
  workspaceRoute: string | null;
  onCreated: (channel: Channel) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [tagItems, setTagItems] = React.useState<Tag[]>([]);
  // Suggest a route from the name until the user edits the route.
  const [routeTouched, setRouteTouched] = React.useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });
  const route = form.watch("route");

  React.useEffect(() => {
    form.setValue(
      "tags",
      tagItems.map((tag) => tag.text),
      { shouldValidate: form.formState.isSubmitted },
    );
  }, [form, tagItems]);

  const create = useMutation({
    mutationFn: (values: Values) =>
      postChannel({
        name: values.name,
        route: values.route,
        tags: values.tags,
        metadata: parseMetadata(values.metadata),
      }),
    onSuccess: (channel) => {
      toast.success(`Channel “${channel.name}” created`);
      onOpenChange(false);
      onCreated(channel);
    },
    onError: (error: PostChannelError) => {
      if (error.field) {
        form.setError(error.field, { message: error.message });
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
      setRouteTouched(false);
      create.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Create channel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create channel</DialogTitle>
          <DialogDescription>
            Devices publish and subscribe to a channel by its route.
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
                      placeholder="Floor 1 temperature"
                      onChange={(event) => {
                        field.onChange(event);
                        if (!routeTouched) {
                          form.setValue(
                            "route",
                            channelRouteFromName(event.target.value),
                            { shouldValidate: form.formState.isSubmitted },
                          );
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="route"
              render={({ field }) => (
                <FormItem>
                  <RequiredFormLabel required>Route</RequiredFormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="font-mono"
                      placeholder="floor-1-temperature"
                      maxLength={CHANNEL_ROUTE_MAX_LENGTH}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(event) => {
                        setRouteTouched(true);
                        field.onChange(event);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Cannot be changed later. Letters, digits, “-” and “_”,
                    starting with a letter.
                    {workspaceRoute && route ? (
                      <>
                        {" "}
                        Topic:{" "}
                        <code className="font-mono break-all">
                          {channelTopic(workspaceRoute, route)}
                        </code>
                      </>
                    ) : null}
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
                {create.isPending ? "Creating…" : "Create channel"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
