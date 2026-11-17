"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { SessionRefresh } from "@/components/app-shell/session-refresh";
import { TenantProvider } from "@/components/app-shell/tenant-provider";
import { TenantSwitcher } from "@/components/app-shell/tenant-switcher";
import { UserNav } from "@/components/app-shell/user-nav";
import { BrandLogo } from "@/components/brand-logo";
import { EnglishOnly, useI18n } from "@/components/ejad/i18n-provider";
import { SidebarNav } from "@/components/ejad/sidebar-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { BRAND_NAME } from "@/lib/brand";
import { isEjadPath } from "@/lib/ejad/nav";

export function AppShell({
  children,
  entityName,
  entityKind,
  sessionExpiresAt,
}: {
  children: React.ReactNode;
  entityName: string;
  entityKind?: string;
  sessionExpiresAt: string;
}) {
  const { locale } = useI18n();
  const pathname = usePathname();
  // Atom's Administration pages are English only.
  const content =
    locale === "en" || isEjadPath(pathname) ? (
      children
    ) : (
      <EnglishOnly>{children}</EnglishOnly>
    );
  return (
    <TenantProvider>
      <SessionRefresh expiresAt={sessionExpiresAt} />
      <SidebarProvider>
        <AppSidebar
          entityName={entityName}
          entityKind={entityKind}
          side={locale === "ar" ? "right" : "left"}
        />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 px-3">
            <SidebarTrigger />
          </header>
          <main>
            <div className="mx-auto flex w-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
              {content}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TenantProvider>
  );
}

function AppSidebar({
  entityName,
  entityKind,
  side,
}: {
  entityName: string;
  entityKind?: string;
  side: "left" | "right";
}) {
  return (
    <Sidebar collapsible="icon" side={side}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip={BRAND_NAME}
              className="hover:bg-transparent active:bg-transparent"
            >
              <Link href="/dashboard" aria-label={BRAND_NAME}>
                <span className="group-data-[collapsible=icon]:hidden">
                  <BrandLogo className="h-8" />
                </span>
                <span className="hidden shrink-0 group-data-[collapsible=icon]:block">
                  <BrandLogo variant="icon" />
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarSeparator className="mb-2" />

        <SidebarGroup>
          <SidebarGroupContent>
            <TenantSwitcher />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mb-2" />

        <SidebarNav />
      </SidebarContent>

      <SidebarFooter>
        <UserNav entityName={entityName} entityKind={entityKind} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
