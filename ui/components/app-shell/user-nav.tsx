"use client";

import {
  Check,
  Languages,
  Laptop,
  LogOut,
  Moon,
  Sun,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { useI18n } from "@/components/ejad/i18n-provider";
import { useSwitchLocale } from "@/components/ejad/language-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

function initials(name: string): string {
  const parts = name.split(/[-_\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function UserNav({
  entityName,
  entityKind,
}: {
  entityName: string;
  entityKind?: string;
}) {
  const { isMobile } = useSidebar();
  const { setTheme } = useTheme();
  const router = useRouter();
  const { t, locale, localize } = useI18n();
  const { switchTo } = useSwitchLocale();
  const LOCALES = ["en", "ar"] as const;

  const abbr = initials(entityName);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const avatarBlock = (
    <Avatar className="size-8 rounded-lg">
      <AvatarImage src={undefined} alt={entityName} />
      <AvatarFallback className="rounded-lg">{abbr}</AvatarFallback>
    </Avatar>
  );

  const nameBlock = (
    <div className="grid flex-1 text-start text-sm leading-tight">
      <span className="truncate font-semibold">{entityName}</span>
      {entityKind ? (
        <span className="truncate text-xs text-muted-foreground capitalize">
          {localize(entityKind)}
        </span>
      ) : null}
    </div>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={entityName}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {avatarBlock}
              {nameBlock}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-lg"
            side={isMobile ? "bottom" : locale === "ar" ? "left" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                {avatarBlock}
                {nameBlock}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User />
                  {t("shell.profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Sun className="dark:hidden" />
                  <Moon className="hidden dark:block" />
                  {t("shell.theme")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun />
                    {t("shell.themeLight")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon />
                    {t("shell.themeDark")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Laptop />
                    {t("shell.themeSystem")}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Languages />
                  {t("language.label")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {LOCALES.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      lang={option}
                      onClick={() => switchTo(option)}
                    >
                      <span className="flex-1">{t(`language.${option}`)}</span>
                      {option === locale ? <Check /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut />
              {t("shell.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
