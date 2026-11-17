"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Plus, TriangleAlert } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { toastError } from "@/components/ejad/error-alert";
import { RequiredFormLabel } from "@/components/forms/required-form-label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { requestError } from "@/lib/ejad/errors";
import {
  ROUTE_MAX_LENGTH,
  routeFromName,
  validateRoute,
  type Workspace,
} from "@/lib/ejad/workspaces";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  route: z.string().superRefine((route, ctx) => {
    const message = validateRoute(route);
    if (message) ctx.addIssue({ code: "custom", message });
  }),
});

type Values = z.infer<typeof schema>;

const EMPTY: Values = { name: "", route: "" };

async function postWorkspace(values: Values) {
  const response = await fetch("/api/ejad/workspaces", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(values),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
    workspace?: Workspace;
    seedError?: string | null;
  };
  if (!response.ok || !payload.workspace) {
    throw requestError(response, payload);
  }
  return { workspace: payload.workspace, seedError: payload.seedError };
}

export function WorkspaceCreateDialog({
  onCreated,
}: {
  onCreated: (workspace: Workspace) => void;
}) {
  const [open, setOpen] = React.useState(false);
  // Suggest a route from the name until the user types one themselves.
  const [routeEdited, setRouteEdited] = React.useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const create = useMutation({
    mutationFn: postWorkspace,
    onSuccess: ({ workspace, seedError }) => {
      toast.success(`Workspace “${workspace.name}” created`);
      if (seedError) {
        toast.warning(`Default device types were not added: ${seedError}`);
      }
      setOpen(false);
      onCreated(workspace);
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "CONFLICT") {
        form.setError("route", {
          message: "This route is already used by another workspace.",
        });
        return;
      }
      toastError(error);
    },
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset(EMPTY);
      setRouteEdited(false);
      create.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Create workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            A workspace holds your devices, channels and dashboards. You become
            its administrator.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid grid-cols-1 gap-4"
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
                      placeholder="Riyadh water network"
                      onChange={(event) => {
                        field.onChange(event);
                        if (!routeEdited) {
                          form.setValue(
                            "route",
                            routeFromName(event.target.value),
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
                      maxLength={ROUTE_MAX_LENGTH}
                      placeholder="riyadh-water"
                      autoCapitalize="none"
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(event) => {
                        setRouteEdited(true);
                        field.onChange(event);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Lowercase letters, digits and hyphens. Devices use it in
                    message topics, for example{" "}
                    <code className="font-mono">
                      m/{field.value || "route"}/c/…
                    </code>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Alert>
              <TriangleAlert />
              <AlertDescription>
                {" "}
                The route cannot be changed after the workspace is created.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create workspace"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
