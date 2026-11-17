import type { Metadata } from "next";
import { WorkspacesView } from "@/components/ejad/workspaces/workspaces-view";
import { getI18n } from "@/lib/ejad/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("page.workspaces.title") };
}

export default function WorkspacesPage() {
  return <WorkspacesView />;
}
