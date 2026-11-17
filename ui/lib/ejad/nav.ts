import {
  Activity,
  Boxes,
  Braces,
  Building2,
  Code2,
  Cpu,
  FileKey,
  Fingerprint,
  FolderTree,
  Home,
  KeyRound,
  Landmark,
  Layers,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Radio,
  ScrollText,
  Server,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import type * as React from "react";

export type NavLink = {
  title: string;
  href: string;
  icon: React.ElementType;
  /** Page only works with a workspace (tenant) selected. */
  requiresWorkspace?: boolean;
  /** Hidden while a workspace is selected (global-only admin pages). */
  globalOnly?: boolean;
  /** Shown only to platform admins. */
  platformAdminOnly?: boolean;
};

export type NavGroup = {
  title: string;
  icon: React.ElementType;
  children: NavLink[];
};

export type NavEntry = NavLink | NavGroup;

export type NavSection = {
  title: string;
  /** Section can be collapsed by the user. */
  collapsible?: boolean;
  items: NavEntry[];
};

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

/** Phase in which each Ejad page is delivered (see EJAD.md). */
export const EJAD_PHASES = {
  workspaces: 1,
  devices: 2,
  channels: 3,
  connections: 4,
  messages: 5,
  deviceGroups: 6,
  dashboards: 7,
  members: 8,
  users: 8,
} as const;

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",

    items: [
      { title: "Home", href: "/dashboard", icon: Home },
      { title: "Workspaces", href: "/workspaces", icon: Layers },
      {
        title: "Users",
        href: "/users",
        icon: UserRound,
        platformAdminOnly: true,
      },
    ],
  },
  {
    title: "Workspace",

    items: [
      {
        title: "Devices",
        href: "/devices",
        icon: Cpu,
        requiresWorkspace: true,
      },
      {
        title: "Channels",
        href: "/channels",
        icon: Radio,
        requiresWorkspace: true,
      },
      {
        title: "Groups",
        href: "/device-groups",
        icon: FolderTree,
        requiresWorkspace: true,
      },
      {
        title: "Messages",
        href: "/messages",
        icon: MessageSquare,
        requiresWorkspace: true,
      },
      {
        title: "Dashboards",
        href: "/dashboards",
        icon: LayoutDashboard,
        requiresWorkspace: true,
      },
      {
        title: "Members",
        href: "/members",
        icon: UserCog,
        requiresWorkspace: true,
      },
    ],
  },
  {
    title: "Administration",

    collapsible: true,
    items: [
      { title: "Tenants", href: "/tenants", icon: Building2, globalOnly: true },
      { title: "Entities", href: "/entities", icon: Fingerprint },
      { title: "Profiles", href: "/profiles", icon: Braces },
      { title: "Groups", href: "/groups", icon: Users },
      { title: "Resources", href: "/resources", icon: Server },
      { title: "Roles", href: "/roles", icon: ShieldCheck },
      { title: "Permission Blocks", href: "/permission-blocks", icon: Boxes },
      { title: "Actions", href: "/actions", icon: KeyRound },
      { title: "Policies", href: "/policies", icon: ShieldCheck },
      { title: "Authorization", href: "/authz", icon: Activity },
      { title: "Audit", href: "/audit", icon: ScrollText },
      {
        title: "Operations",
        icon: Activity,
        children: [
          {
            title: "System Health",
            href: "/operations/health",
            icon: Activity,
          },
          {
            title: "Signing Keys",
            href: "/operations/signing-keys",
            icon: KeyRound,
          },
        ],
      },
      {
        title: "PKI",
        icon: Landmark,
        children: [
          { title: "Authorities", href: "/pki/authorities", icon: Landmark },
          { title: "Certificates", href: "/pki/certificates", icon: FileKey },
          { title: "PKI Actions", href: "/pki/actions", icon: Wrench },
        ],
      },
      {
        title: "Developer",
        icon: Code2,
        children: [
          { title: "Endpoints", href: "/endpoints", icon: Link2 },
          { title: "Playground", href: "/playground", icon: Code2 },
        ],
      },
    ],
  },
];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function entryLinks(entry: NavEntry): NavLink[] {
  return isNavGroup(entry) ? entry.children : [entry];
}

export function entryIsActive(pathname: string, entry: NavEntry) {
  return entryLinks(entry).some((link) => isActivePath(pathname, link.href));
}

export function sectionIsActive(pathname: string, section: NavSection) {
  return section.items.some((entry) => entryIsActive(pathname, entry));
}

/** Sections as shown for the current workspace selection and user. */
export function visibleNavSections(
  workspaceSelected: boolean,
  sections: NavSection[] = NAV_SECTIONS,
  { platformAdmin = false }: { platformAdmin?: boolean } = {},
): NavSection[] {
  const keep = (link: NavLink) =>
    !(workspaceSelected && link.globalOnly) &&
    !(link.platformAdminOnly && !platformAdmin);
  return sections
    .map((section) => ({
      ...section,
      items: section.items.flatMap<NavEntry>((entry) => {
        if (!isNavGroup(entry)) return keep(entry) ? [entry] : [];
        const children = entry.children.filter(keep);
        return children.length > 0 ? [{ ...entry, children }] : [];
      }),
    }))
    .filter((section) => section.items.length > 0);
}
