import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { GroupsLoader } from "./GroupsLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("GroupsPage");
  return { title: t("Title") };
}

export default function GroupsPage() {
  return <GroupsLoader />;
}
