"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import * as React from "react";
import { I18nProvider } from "@/components/ejad/i18n-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { direction, type Locale } from "@/lib/ejad/i18n/core";

export function Providers({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 20_000,
          },
        },
      }),
  );

  return (
    <I18nProvider locale={locale}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider delayDuration={150}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
          <Toaster
            richColors
            dir={direction(locale)}
            position={locale === "ar" ? "bottom-left" : "bottom-right"}
          />
        </TooltipProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
