import type { Metadata } from "next";
import { UsersView } from "@/components/ejad/users/users-view";
import { getI18n } from "@/lib/ejad/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("page.users.title") };
}
export const dynamic = "force-dynamic";

export default function UsersPage() {
  return <UsersView />;
}
