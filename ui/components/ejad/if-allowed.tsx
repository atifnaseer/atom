"use client";

import type * as React from "react";
import { useAccess } from "@/components/ejad/use-access";
import type { Ability } from "@/lib/ejad/access";

/**
 * Renders its children only when the signed-in user has `ability` in the
 * selected workspace (Atom's PDP, via /api/ejad/access). Hiding is a
 * convenience; the server routes and Atom enforce the same rules.
 */
export function IfAllowed({
  ability,
  children,
  fallback = null,
}: {
  ability: Ability;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can } = useAccess();
  return can(ability) ? children : fallback;
}
