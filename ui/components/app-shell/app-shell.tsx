"use client";

import Link from "next/link";
import type * as React from "react";
import { SessionRefresh } from "@/components/app-shell/session-refresh";
import { TenantProvider } from "@/components/app-shell/tenant-provider";
import { TenantSwitcher } from "@/components/app-shell/tenant-switcher";
import { UserNav } from "@/components/app-shell/user-nav";
import { BrandLogo } from "@/components/brand-logo";
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
  return (
    <TenantProvider>
      <SessionRefresh expiresAt={sessionExpiresAt} />
      <SidebarProvider>
        <AppSidebar entityName={entityName} entityKind={entityKind} />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 px-3">
            <SidebarTrigger />
          </header>
          <main>
            <div className="mx-auto flex w-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
              {children}
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
}: {
  entityName: string;
  entityKind?: string;
}) {
  return (
    <Sidebar collapsible="icon">
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
