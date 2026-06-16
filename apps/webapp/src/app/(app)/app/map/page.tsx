import type { Metadata } from "next";
import { MapPageClient } from "./MapPageClient";
import type { MapView } from "./types";

export const metadata: Metadata = { title: "Map" };

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const resolvedView: MapView = view === "addresses" ? "addresses" : "locations";
  return <MapPageClient view={resolvedView} />;
}
