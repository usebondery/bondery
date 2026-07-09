import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { KeepInTouchLoader } from "./KeepInTouchLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("KeepInTouch");
  return staticPageTitle(t("Title"));
}

function defaultEndDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export default async function KeepInTouchPage({
  searchParams,
}: {
  searchParams: Promise<{ endDate?: string }>;
}) {
  const { endDate: endDateParam } = await searchParams;
  const endDate = endDateParam ?? defaultEndDate();

  return <KeepInTouchLoader endDate={endDate} key={endDate} />;
}
