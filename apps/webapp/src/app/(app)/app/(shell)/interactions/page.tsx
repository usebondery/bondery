import type { Metadata } from "next";
import { getInteractionsPageTranslations } from "@/lib/i18n/generated/hooks.server";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { parseInteractionsListParams } from "@/lib/query/interactionsListParams";
import { InteractionsLoader } from "./InteractionsLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getInteractionsPageTranslations();
  return staticPageTitle(t("PageTitle"));
}

export default async function InteractionsPage({
  searchParams,
}: {
  searchParams: Promise<{ end_date?: string; search?: string; start_date?: string }>;
}) {
  const params = await searchParams;
  const filter = parseInteractionsListParams({
    end_date: params.end_date,
    search: params.search,
    start_date: params.start_date,
  });

  return <InteractionsLoader filter={filter} />;
}
