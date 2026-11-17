"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useI18n } from "@/components/ejad/i18n-provider";
import { Button } from "@/components/ui/button";
import { setLocale } from "@/lib/ejad/i18n/actions";
import type { Locale } from "@/lib/ejad/i18n/core";

/** Saves the language in the ejad_locale cookie and re-renders the page. */
export function useSwitchLocale() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const switchTo = React.useCallback(
    (locale: Locale) =>
      startTransition(async () => {
        await setLocale(locale);
        router.refresh();
      }),
    [router],
  );
  return { switchTo, pending };
}

/** One button that switches to the other language (login page). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const { switchTo, pending } = useSwitchLocale();
  const other: Locale = locale === "ar" ? "en" : "ar";
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      disabled={pending}
      onClick={() => switchTo(other)}
      aria-label={t("language.switchTo")}
    >
      <Languages />
      <span lang={other}>{t(`language.${other}`)}</span>
    </Button>
  );
}
