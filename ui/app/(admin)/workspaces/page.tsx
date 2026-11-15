import type { Metadata } from "next";
import { WorkspacesView } from "@/components/ejad/workspaces/workspaces-view";

export const metadata: Metadata = { title: "Workspaces" };

export default function WorkspacesPage() {
  return <WorkspacesView />;
}
