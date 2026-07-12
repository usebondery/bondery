import type { Metadata } from "next";
import { getGroupsPageTranslations } from "@/lib/i18n/generated/hooks.server";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { GroupsLoader } from "./GroupsLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getGroupsPageTranslations();
  return staticPageTitle(t("Title"));
}

export default function GroupsPage() {
  return <GroupsLoader />;
}
