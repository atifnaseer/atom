"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Plus, TriangleAlert } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { toastError } from "@/components/ejad/error-alert";
import { useI18n } from "@/components/ejad/i18n-provider";
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
  const { t } = useI18n();
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
      toast.success(t("workspaces.created", { name: workspace.name }));
      if (seedError) {
        toast.warning(t("workspaces.seedFailed", { error: seedError }));
      }
      setOpen(false);
      onCreated(workspace);
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "CONFLICT") {
        form.setError("route", {
          message: t("workspaces.routeTaken"),
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
          {t("workspaces.create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("workspaces.create")}</DialogTitle>
          <DialogDescription>{t("workspaces.createHint")}</DialogDescription>
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
                  <RequiredFormLabel required>
                    {t("common.name")}
                  </RequiredFormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoFocus
                      placeholder={t("workspaces.namePlaceholder")}
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
                  <RequiredFormLabel required>
                    {t("workspaces.route")}
                  </RequiredFormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      dir="ltr"
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
                    {t("workspaces.routeHint")}{" "}
                    <code className="font-mono" dir="ltr">
                      m/{field.value || "route"}/c/…
                    </code>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Alert>
              <TriangleAlert />
              <AlertDescription>{t("workspaces.routeFixed")}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending
                  ? t("common.creating")
                  : t("workspaces.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
