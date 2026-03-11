import type { Metadata } from "next";
import { getContactsData } from "../people/getContactsData";
import { MapPageClient } from "./MapPageClient";

export const metadata: Metadata = { title: "Map" };

export default async function MapPage() {
  const { contacts } = await getContactsData(undefined, undefined, 500, 0);
  return <MapPageClient contacts={contacts} />;
}
