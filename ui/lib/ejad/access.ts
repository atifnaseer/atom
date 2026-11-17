// Ejad access: what the signed-in user may do in the selected workspace.
//
// Answers come from Atom's own PDP (the `authzCheck` the Authorization page
// uses), asked about the user themselves, so the UI never second-guesses
// Atom's grants. Server routes call the same check (lib/ejad/access-server)
// before doing anything; the browser only uses it to hide buttons.

/** One thing a workspace user may be allowed to do. */
export type Ability =
  /** See devices, channels, groups, messages and dashboards. */
  | "view"
  /** Create, change and delete devices, channels, groups and dashboards;
   *  the Store messages switch; device keys. */
  | "manage"
  /** Connect and disconnect devices and channels. */
  | "connect"
  /** Members and their roles. */
  | "members";

export const ABILITIES: Ability[] = ["view", "manage", "connect", "members"];

/**
 * The Atom actions behind each ability, checked on the workspace (tenant)
 * object. They mirror the gates Atom puts on the matching mutations:
 * reads need `read`; resource update/delete and device keys need `manage`;
 * connecting is Operator work: `manage` here, and the connections route
 * makes the Atom change (which needs `policy.manage`) as the Ejad service
 * account; adding members needs `policy.manage` and roles `role.manage`,
 * which only Admins hold.
 */
export const ABILITY_ACTIONS: Record<Ability, string[]> = {
  view: ["read"],
  manage: ["manage"],
  connect: ["manage"],
  members: ["role.manage", "policy.manage"],
};

/** Atom actions to check on the workspace, without duplicates. */
export const WORKSPACE_CHECK_ACTIONS = [
  ...new Set(Object.values(ABILITY_ACTIONS).flat()),
];

export type WorkspaceRoleKey = "admin" | "operator" | "viewer";

export type WorkspaceAccess = {
  /** The entity the answers are about (the signed-in user). */
  entityId: string;
  /** Holds platform-wide `manage` (Atom's atom-admin). */
  platformAdmin: boolean;
  workspaceId: string | null;
  can: Record<Ability, boolean>;
  /** The Ejad role the abilities amount to, or null for none of them. */
  role: WorkspaceRoleKey | null;
};

export const NO_ACCESS: Record<Ability, boolean> = {
  view: false,
  manage: false,
  connect: false,
  members: false,
};

/** Abilities from the allowed Atom actions on the workspace. */
export function abilitiesFromActions(
  allowed: ReadonlySet<string>,
): Record<Ability, boolean> {
  const can = { ...NO_ACCESS };
  for (const ability of ABILITIES) {
    can[ability] = ABILITY_ACTIONS[ability].every((action) =>
      allowed.has(action),
    );
  }
  return can;
}

/** The Ejad role a set of abilities amounts to. */
export function roleFromAbilities(
  can: Record<Ability, boolean>,
): WorkspaceRoleKey | null {
  if (can.members && can.manage && can.view) return "admin";
  if (can.manage && can.view) return "operator";
  if (can.view) return "viewer";
  return null;
}

// --- authzCheck ------------------------------------------------------------

/** GraphQL alias for one action ("policy.manage" → "a_policy_manage"). */
export function checkAlias(action: string) {
  return `a_${action.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

/**
 * One authzCheck mutation answering every workspace action, plus whether
 * the user is a platform admin (platform-wide `manage` is the only grant
 * that reaches a global human entity such as the user themselves).
 */
export function accessCheckMutation(withWorkspace: boolean) {
  const workspaceChecks = withWorkspace
    ? WORKSPACE_CHECK_ACTIONS.map(
        (action) =>
          `${checkAlias(action)}: authzCheck(input: { subjectId: $subjectId, action: ${JSON.stringify(action)}, objectKind: "tenant", objectId: $workspaceId }) { allowed }`,
      ).join("\n    ")
    : "";
  const params = withWorkspace
    ? "$subjectId: ID!, $workspaceId: ID!"
    : "$subjectId: ID!";
  return `
  mutation EjadAccess(${params}) {
    platform: authzCheck(input: { subjectId: $subjectId, action: "manage", objectKind: "entity", objectId: $subjectId }) { allowed }
    ${workspaceChecks}
  }
`;
}

export type AccessCheckResult = Record<string, { allowed: boolean } | null>;

/** Reads the authzCheck answers into a WorkspaceAccess. */
export function accessFromCheck(
  entityId: string,
  workspaceId: string | null,
  result: AccessCheckResult,
): WorkspaceAccess {
  const allowed = new Set(
    workspaceId
      ? WORKSPACE_CHECK_ACTIONS.filter(
          (action) => result[checkAlias(action)]?.allowed === true,
        )
      : [],
  );
  const can = abilitiesFromActions(allowed);
  return {
    entityId,
    platformAdmin: result.platform?.allowed === true,
    workspaceId,
    can,
    role: roleFromAbilities(can),
  };
}

// --- Messages shown when an ability is missing ----------------------------

export const ABILITY_DENIED: Record<Ability, string> = {
  view: "You don't have access to this workspace.",
  manage: "Your role in this workspace can't make changes here.",
  connect: "Your role in this workspace can't connect devices and channels.",
  members: "Only workspace admins can manage members.",
};

export const PLATFORM_ADMIN_DENIED = "Only platform admins can manage users.";

// --- Roles across many workspaces (workspace cards) ------------------------

/** Actions that tell Viewer, Operator and Admin apart. */
const ROLE_CHECK_ACTIONS = ["read", "manage", "role.manage", "policy.manage"];

export const MAX_ROLE_CHECKS = 100;

/** One authzCheck mutation for the user's role in each workspace. */
export function workspaceRolesMutation(workspaceIds: string[]) {
  const checks = workspaceIds.flatMap((_, w) =>
    ROLE_CHECK_ACTIONS.map(
      (action) =>
        `w${w}_${checkAlias(action)}: authzCheck(input: { subjectId: $subjectId, action: ${JSON.stringify(action)}, objectKind: "tenant", objectId: $w${w} }) { allowed }`,
    ),
  );
  const params = workspaceIds.map((_, w) => `$w${w}: ID!`).join(", ");
  return `
  mutation EjadWorkspaceRoles($subjectId: ID!, ${params}) {
    ${checks.join("\n    ")}
  }
`;
}

export function workspaceRolesVariables(
  entityId: string,
  workspaceIds: string[],
) {
  return Object.fromEntries([
    ["subjectId", entityId],
    ...workspaceIds.map((id, w) => [`w${w}`, id]),
  ]);
}

/** The user's Ejad role in each workspace, by id. */
export function rolesFromCheck(
  workspaceIds: string[],
  result: AccessCheckResult,
): Record<string, WorkspaceRoleKey | null> {
  return Object.fromEntries(
    workspaceIds.map((id, w) => {
      const allowed = new Set(
        ROLE_CHECK_ACTIONS.filter(
          (action) => result[`w${w}_${checkAlias(action)}`]?.allowed === true,
        ),
      );
      return [id, roleFromAbilities(abilitiesFromActions(allowed))];
    }),
  );
}
