import type { Metadata } from "next";
import { UsersView } from "@/components/ejad/users/users-view";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default function UsersPage() {
  return <UsersView />;
}
