import { describe, expect, it } from "vitest";
import {
  isNavGroup,
  NAV_SECTIONS,
  type NavEntry,
  sectionIsActive,
  visibleNavSections,
} from "@/lib/ejad/nav";

function hrefs(entries: NavEntry[]) {
  return entries.flatMap((e) =>
    isNavGroup(e) ? e.children.map((c) => c.href) : [e.href],
  );
}

describe("visibleNavSections", () => {
  it("orders sections Overview, Workspace, Administration", () => {
    expect(visibleNavSections(false).map((s) => s.title)).toEqual([
      "Overview",
      "Workspace",
      "Administration",
    ]);
  });

  it("keeps every existing Atom admin route under Administration", () => {
    const admin = visibleNavSections(false).find(
      (s) => s.title === "Administration",
    );
    expect(hrefs(admin?.items ?? [])).toEqual([
      "/tenants",
      "/entities",
      "/profiles",
      "/groups",
      "/resources",
      "/roles",
      "/permission-blocks",
      "/actions",
      "/policies",
      "/authz",
      "/audit",
      "/operations/health",
      "/operations/signing-keys",
      "/pki/authorities",
      "/pki/certificates",
      "/pki/actions",
      "/endpoints",
      "/playground",
    ]);
  });

  it("marks every Workspace item as requiring a workspace", () => {
    const workspace = NAV_SECTIONS.find((s) => s.title === "Workspace");
    const items = workspace?.items ?? [];
    expect(hrefs(items)).toEqual([
      "/devices",
      "/channels",
      "/device-groups",
      "/messages",
      "/dashboards",
      "/members",
    ]);
    expect(items.every((e) => !isNavGroup(e) && e.requiresWorkspace)).toBe(
      true,
    );
  });

  it("hides Tenants once a workspace is selected", () => {
    const all = visibleNavSections(true).flatMap((s) => hrefs(s.items));
    expect(all).not.toContain("/tenants");
    expect(all).toContain("/devices");
  });
});

describe("Overview section", () => {
  it("links Home, Workspaces and Users", () => {
    expect(hrefs(NAV_SECTIONS[0].items)).toEqual([
      "/dashboard",
      "/workspaces",
      "/users",
    ]);
  });

  it("shows Users to platform admins only", () => {
    const overview = (platformAdmin: boolean) =>
      hrefs(
        visibleNavSections(false, undefined, { platformAdmin })[0]?.items ?? [],
      );
    expect(overview(false)).toEqual(["/dashboard", "/workspaces"]);
    expect(overview(true)).toContain("/users");
  });
});

describe("sectionIsActive", () => {
  const admin = NAV_SECTIONS[2];
  it("matches nested group children and sub-paths", () => {
    expect(sectionIsActive("/pki/certificates/abc", admin)).toBe(true);
    expect(sectionIsActive("/groups", admin)).toBe(true);
  });
  it("does not confuse /device-groups with /groups", () => {
    expect(sectionIsActive("/device-groups", admin)).toBe(false);
  });
});
