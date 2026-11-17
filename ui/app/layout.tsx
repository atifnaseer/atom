import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { BRAND_TITLE } from "@/lib/brand";
import { direction } from "@/lib/ejad/i18n/core";
import { getLocale } from "@/lib/ejad/i18n/server";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: `%s | ${BRAND_TITLE}`, default: BRAND_TITLE },
  description: "Connect, monitor and control your IoT devices.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      dir={direction(locale)}
      suppressHydrationWarning
      className={cn("h-full", "antialiased", "font-sans")}
    >
      <body className="flex min-h-full flex-col">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
