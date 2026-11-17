"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { useT } from "@/components/ejad/i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { pageLocale, type Translate } from "@/lib/ejad/i18n/core";
import { LANDING_PATH } from "@/lib/ejad/routes";

function loginSchema(t: Translate) {
  return z.object({
    identifier: z.string().min(1, t("auth.identifierRequired")),
    password: z.string().min(1, t("auth.passwordRequired")),
  });
}

type LoginValues = z.infer<ReturnType<typeof loginSchema>>;

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const t = useT();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema(t)),
    defaultValues: { identifier: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: values.identifier,
        secret: values.password,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      form.setError("root", {
        // Atom's own wording in English; a plain sentence in Arabic.
        message:
          pageLocale() === "en" && typeof payload.message === "string"
            ? payload.message
            : response.status === 401
              ? t("auth.badCredentials")
              : t("auth.unable"),
      });
      return;
    }

    router.replace(search.get("next") ?? LANDING_PATH);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form
        className="space-y-4 md:space-y-8"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {form.formState.errors.root ? (
          <Alert variant="destructive">
            <AlertTitle>{t("auth.failed")}</AlertTitle>
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        ) : null}
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.identifier")}</FormLabel>
              <FormControl>
                <Input autoComplete="username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.password")}</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          className="w-full"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : null}
          {t("auth.signIn")}
        </Button>
      </form>
    </Form>
  );
}
