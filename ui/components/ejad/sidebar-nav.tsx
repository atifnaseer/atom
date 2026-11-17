"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useTenant } from "@/components/app-shell/tenant-provider";
import { useT } from "@/components/ejad/i18n-provider";
import { useAccess } from "@/components/ejad/use-access";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  entryIsActive,
  isActivePath,
  isNavGroup,
  type NavGroup,
  type NavLink,
  type NavSection,
  sectionIsActive,
  visibleNavSections,
} from "@/lib/ejad/nav";
import { GLOBAL_TENANT } from "@/lib/tenant/context";

const ACTIVE_CLASS =
  "data-active:bg-primary data-active:text-primary-foreground";

export function SidebarNav() {
  const pathname = usePathname();
  const { selection } = useTenant();
  const { state, isMobile } = useSidebar();
  const workspaceSelected = selection.id !== GLOBAL_TENANT;
  // In icon-only mode labels and sub-menus are hidden, so show everything flat.
  const iconMode = state === "collapsed" && !isMobile;
  const { platformAdmin } = useAccess();
  const sections = visibleNavSections(workspaceSelected, undefined, {
    platformAdmin,
  });

  return sections.map((section, index) => (
    <React.Fragment key={section.title}>
      {index > 0 ? <SidebarSeparator /> : null}
      <NavSectionGroup
        section={section}
        pathname={pathname}
        workspaceSelected={workspaceSelected}
        iconMode={iconMode}
      />
    </React.Fragment>
  ));
}

function NavSectionGroup({
  section,
  pathname,
  workspaceSelected,
  iconMode,
}: {
  section: NavSection;
  pathname: string;
  workspaceSelected: boolean;
  iconMode: boolean;
}) {
  const t = useT();
  const title = section.key ? t(section.key) : section.title;
  const active = sectionIsActive(pathname, section);
  const [open, setOpen] = React.useState(active);
  // Expand when the user navigates into the section (e.g. via the command menu).
  React.useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  const expanded = !section.collapsible || open || iconMode;
  const needsWorkspace =
    !workspaceSelected &&
    section.items.some(
      (entry) => !isNavGroup(entry) && entry.requiresWorkspace,
    );
  const contentId = `nav-section-${section.title.toLowerCase()}`;

  return (
    <SidebarGroup>
      {section.collapsible ? (
        <SidebarGroupLabel asChild>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen((value) => !value)}
            className="w-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {title}
            <ChevronRight
              className={`ms-auto transition-transform ${open ? "rotate-90" : "rtl:rotate-180"}`}
            />
          </button>
        </SidebarGroupLabel>
      ) : (
        <SidebarGroupLabel>{title}</SidebarGroupLabel>
      )}
      {needsWorkspace && !iconMode ? (
        <p className="px-2 pb-2 text-xs text-muted-foreground">
          {t("nav.needsWorkspace")}
        </p>
      ) : null}
      {expanded ? (
        <SidebarGroupContent id={contentId}>
          <SidebarMenu className="space-y-2">
            {section.items.flatMap((entry) => {
              if (!isNavGroup(entry)) {
                return [
                  <NavLinkItem
                    key={entry.href}
                    link={entry}
                    pathname={pathname}
                    disabled={!!entry.requiresWorkspace && !workspaceSelected}
                  />,
                ];
              }
              if (iconMode) {
                return entry.children.map((link) => (
                  <NavLinkItem
                    key={link.href}
                    link={link}
                    pathname={pathname}
                  />
                ));
              }
              return [
                <NavGroupItem
                  key={entry.title}
                  group={entry}
                  pathname={pathname}
                />,
              ];
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      ) : null}
    </SidebarGroup>
  );
}

function NavLinkItem({
  link,
  pathname,
  disabled = false,
}: {
  link: NavLink;
  pathname: string;
  disabled?: boolean;
}) {
  const t = useT();
  const title = link.key ? t(link.key) : link.title;
  if (disabled) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          aria-disabled="true"
          tooltip={t("nav.selectWorkspaceFirst", { title })}
          className="cursor-not-allowed aria-disabled:pointer-events-auto hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent"
        >
          <link.icon />
          <span>{title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActivePath(pathname, link.href)}
        tooltip={title}
        className={ACTIVE_CLASS}
      >
        <Link href={link.href}>
          <link.icon />
          <span>{title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavGroupItem({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const active = entryIsActive(pathname, group);
  const [open, setOpen] = React.useState(active);
  React.useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        aria-expanded={open}
        tooltip={group.title}
        onClick={() => setOpen((value) => !value)}
      >
        <group.icon />
        <span>{group.title}</span>
        <ChevronRight
          className={`ms-auto transition-transform ${open ? "rotate-90" : "rtl:rotate-180"}`}
        />
      </SidebarMenuButton>
      {open ? (
        <SidebarMenuSub>
          {group.children.map((link) => (
            <SidebarMenuSubItem key={link.href}>
              <SidebarMenuSubButton
                asChild
                isActive={isActivePath(pathname, link.href)}
                className={ACTIVE_CLASS}
              >
                <Link href={link.href}>
                  <link.icon />
                  <span>{link.title}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  );
}
