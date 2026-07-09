import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { MapClient } from "./MapClient";
import type { MapView } from "./utils/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MapPage");
  return staticPageTitle(t("Title"));
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const resolvedView: MapView = view === "addresses" ? "addresses" : "locations";
  return <MapClient view={resolvedView} />;
}
