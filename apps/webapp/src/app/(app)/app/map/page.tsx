import { getContactsData } from "../people/getContactsData";
import { MapPageClient } from "./MapPageClient";

export default async function MapPage() {
  const { contacts } = await getContactsData(undefined, undefined, 500, 0);
  return <MapPageClient contacts={contacts} />;
}
