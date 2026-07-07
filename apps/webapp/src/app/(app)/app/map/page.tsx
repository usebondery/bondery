import type { Metadata } from "next";
import { MapPageClient } from "./MapPageClient";
import type { MapView } from "./types";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MapPage");
  return { title: t("Title") };
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const resolvedView: MapView = view === "addresses" ? "addresses" : "locations";
  return <MapPageClient view={resolvedView} />;
}
