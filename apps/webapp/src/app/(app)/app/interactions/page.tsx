import type { Metadata } from "next";
import { getInteractionsPageTranslations } from "@/lib/i18n/generated/hooks.server";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { InteractionsLoader } from "./InteractionsLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getInteractionsPageTranslations();
  return staticPageTitle(t("PageTitle"));
}

export default function InteractionsPage() {
  return <InteractionsLoader />;
}
