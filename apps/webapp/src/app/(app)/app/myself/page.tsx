import { formatContactName } from "@bondery/helpers/contact";
import type { Metadata } from "next";
import { cache } from "react";
import { getMePersonServer } from "@/lib/api/domains/server/mePerson";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { entityPageTitle } from "@/lib/metadata/pageTitles";
import { MyselfLoader } from "./MyselfLoader";

const getMeForPage = cache(() => getMePersonServer("large"));

export async function generateMetadata(): Promise<Metadata> {
  try {
    const me = await getMeForPage();
    if (!me) {
      throw new Error("Me person not found");
    }
    return entityPageTitle(formatContactName(me));
  } catch {
    const t = await getTranslations("SingleContactPage");
    return entityPageTitle(t("MyselfPageTitle"));
  }
}

export default async function MyselfPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tab } = await searchParams;
  return <MyselfLoader initialTab={typeof tab === "string" ? tab : undefined} />;
}
