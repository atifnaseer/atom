"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Check, ChevronsUpDown, Globe2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useTenant } from "@/components/app-shell/tenant-provider";
import { useI18n } from "@/components/ejad/i18n-provider";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { graphqlClient } from "@/lib/graphql/client";
import {
  GLOBAL_TENANT,
  type TenantSelection,
  tenantLabel,
} from "@/lib/tenant/context";

const GLOBAL_OPTION: TenantSelection = { id: GLOBAL_TENANT, name: "Global" };

const TENANTS_QUERY = `
  query TenantSwitcher {
    tenants(limit: 100, offset: 0) {
      items { id name alias }
    }
  }
`;

type TenantsData = {
  tenants: { items: { id: string; name: string; alias: string | null }[] };
};

export function TenantSwitcher() {
  const { isMobile } = useSidebar();
  const { selection, setTenant } = useTenant();
  const router = useRouter();
  const { t, locale } = useI18n();

  const { data } = useQuery({
    queryKey: ["tenant-switcher"],
    queryFn: ({ signal }) =>
      graphqlClient<TenantsData>({ query: TENANTS_QUERY, signal }),
    staleTime: 60_000,
  });

  const tenantOptions = React.useMemo<TenantSelection[]>(
    () => (data?.tenants.items ?? []).map((t) => ({ id: t.id, name: t.name })),
    [data?.tenants.items],
  );
  const options = React.useMemo(
    () => [GLOBAL_OPTION, ...tenantOptions],
    [tenantOptions],
  );

  // Resolve the display name for the ID seeded from the cookie once tenants load.
  React.useEffect(() => {
    if (!data || selection.id === GLOBAL_TENANT) return;
    const match = options.find((o) => o.id === selection.id);
    if (match && match.name !== selection.name) setTenant(match);
  }, [data, selection.id, selection.name, options, setTenant]);

  const Icon = selection.id === GLOBAL_TENANT ? Globe2 : Building2;
  const label =
    selection.id === GLOBAL_TENANT ? t("shell.global") : tenantLabel(selection);
  const badgeLabel =
    selection.id === GLOBAL_TENANT
      ? t("shell.badgePlatform")
      : t("shell.badgeWorkspace");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip={t("shell.workspaceTooltip", { name: label })}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Icon className="shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              <Badge
                variant="secondary"
                className="text-[0.68rem] group-data-[collapsible=icon]:hidden"
              >
                {badgeLabel}
              </Badge>
              <ChevronsUpDown className="ms-auto shrink-0 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            side={isMobile ? "bottom" : locale === "ar" ? "left" : "right"}
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel>{t("shell.workspace")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {options.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onClick={() => {
                  setTenant(option);
                  router.push("/dashboard");
                }}
              >
                <span className="flex-1">
                  {option.id === GLOBAL_TENANT
                    ? t("shell.global")
                    : option.name}
                </span>
                {selection.id === option.id ? (
                  <Check className="size-4" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
