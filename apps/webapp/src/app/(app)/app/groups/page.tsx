import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { GroupsLoader } from "./GroupsLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("GroupsPage");
  return staticPageTitle(t("Title"));
}

export default function GroupsPage() {
  return <GroupsLoader />;
}
