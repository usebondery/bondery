import type { Metadata } from "next";
import { getGraphPageTranslations } from "@/lib/i18n/generated/hooks.server";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { GraphClient } from "./GraphClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getGraphPageTranslations();
  return staticPageTitle(t("Title"));
}

export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;
  const focusId = typeof focus === "string" && focus.length > 0 ? focus : null;
  return <GraphClient focus={focusId} />;
}
