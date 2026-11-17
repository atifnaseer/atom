# Ejad IoT Platform UI

This repo is a fork of absmach/atom. The `ui/` folder is being turned into
"Ejad IoT Platform", a full IoT UI for Magistrala, replacing the official
Magistrala UI (http://localhost:3000, closed source, use it only as reference).

Running stack (Docker, from ~/dev/magistrala):
- Atom GraphQL: http://localhost:8080/graphql (also http://localhost/graphql)
- Message reader: http://localhost:9011  GET /{workspaceId}/channels/{channelId}/messages
- HTTP publish: http://localhost/http/m/{workspace}/c/{channel}, header "Authorization: Client <device key>"
- MQTT: localhost:1883, topic m/{workspace}/c/{channel}
- Dev server: cd ui && pnpm dev -p 3001, login admin / 12345678

Build phases (use these numbers in placeholders):
- Phase 0: navigation and workspace context
- Phase 1: workspaces            -> /workspaces
- Phase 2: devices and secrets   -> /devices
- Phase 3: channels              -> /channels
- Phase 4: connections           (tabs on device and channel pages)
- Phase 5: messages              -> /messages
- Phase 6: groups                -> /device-groups
- Phase 7: dashboards            -> /dashboards
- Phase 8: members, roles, users -> /members, /users
- Phase 9: polish and release

Route rules:
- Existing Atom admin pages keep their routes (/tenants, /entities, /groups,
  /resources, /roles, /dashboard, ...). They move under "Administration" in the
  sidebar; do not rename or remove them.
- New Ejad pages must not reuse an existing Atom route. Ejad groups live at
  /device-groups because /groups is Atom's own page.

Rules:
- Create objects exactly the way Magistrala does (see pkg/atom in
  github.com/absmach/magistrala), so they work with messaging and appear in
  the Magistrala UI:
  - workspace = tenant (route = alias), device = entity kind "device",
    channel = resource kind "channel", device secret = shared key credential,
    connection = permission block (object resource:channel, action publish or
    subscribe) + direct policy for the device.
  - set attributes.source = "magistrala" on everything created.
- Put new code in its own folders: ui/lib/ejad/*, ui/components/ejad/*,
  ui/app/(admin)/<feature>/*. Edit existing Atom files only when needed.
- Server-side GraphQL: graphqlServer() from ui/lib/graphql/server.ts.
  Browser GraphQL: graphqlClient() from ui/lib/graphql/client.ts.
  Never call Atom or Magistrala services from the browser directly; add a
  Next.js route handler that uses the login cookie (see app/api/graphql).
- The current workspace is the tenant id in the "atom_tenant" cookie
  (lib/tenant/context.ts).
- Use the existing shadcn/ui components in ui/components/ui.
- Brand name comes from ui/lib/brand.ts.
- After each change: pnpm lint, pnpm test, pnpm build must pass.
- Verify every feature against the live stack, not with mocks only.
- Access (Phase 8): workspace roles are Atom roles workspace-admin,
  workspace-operator and workspace-viewer (lib/ejad/members.ts), each one
  tenant-scoped permission block; Atom's tenant-admin counts as Admin.
  Every /api/ejad route starts with requireWorkspaceAbility(...) or
  requirePlatformAdmin() from lib/ejad/access-server.ts; the browser hides
  buttons with useAccess() / <IfAllowed> (Atom's authzCheck on the
  workspace). Device keys go only through /api/ejad/devices/[id]/keys.
- UI conventions (Phase 9): every Ejad page starts with <PageHeader> (icon,
  title, one-line description, primary action on the right); an empty list
  shows <EmptyState> (what the thing is + the primary action, or who to ask);
  loading shows skeletons (DataTable `loading`, components/ejad/skeletons.tsx,
  and a loading.tsx per route); every delete/remove asks first
  (<ConfirmDialog> or a dedicated *-delete-dialog).
- Errors: never show error.message. Use <ErrorAlert>/<LoadProblem> inline
  and toastError() for actions; they go through friendlyError() in
  lib/ejad/errors.ts, which maps Atom's GraphQL error codes to plain
  language. /api/ejad fetchers throw requestError(response, payload) so the
  code survives to the browser.
- No sample/fake data anywhere: on a failed load show the error and no rows.
- Arabic/English (Phase 9b): the language is the `ejad_locale` cookie (no
  URL prefix). The root layout sets `<html lang dir>`; client code uses
  `useI18n()` / `useT()` (components/ejad/i18n-provider.tsx), server code
  `getI18n()` (lib/ejad/i18n/server.ts). Every string lives in
  lib/ejad/i18n/messages.ts with `en` and `ar` side by side; never write
  user-facing English in a component. Plurals use the `count` var
  (Intl.PluralRules). Numbers and dates go through `format.number` /
  `format.date` / `format.relative` (ar-SA digits, Gregorian calendar).
  Fixed English sentences from lib/ejad validators and /api/ejad routes are
  translated by exact match (`localize`), so add an entry with the same
  English text. Use logical classes (ms/me/ps/pe/start/end/text-start/end,
  border-s/e) and `rtl:rotate-180` on direction arrows; code, IDs, topics
  and JSON stay `dir="ltr"`. Atom Administration pages stay English and LTR
  (`<EnglishOnly>` in the app shell).
