import type { Metadata } from "next";
import { InteractionsClient } from "./InteractionsClient";
import { getInteractionsData } from "./getInteractionsData";

export const metadata: Metadata = { title: "Interactions" };

export default async function InteractionsPage() {
  const { contacts, activities } = await getInteractionsData();

  return <InteractionsClient initialContacts={contacts} initialActivities={activities} />;
}
