import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { InteractionsLoader } from "./InteractionsLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InteractionsPage");
  return staticPageTitle(t("PageTitle"));
}

export default function InteractionsPage() {
  return <InteractionsLoader />;
}
