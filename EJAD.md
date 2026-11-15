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
