import type { Metadata } from "next";
import { InteractionsClient } from "./InteractionsClient";
import { getInteractionsData } from "./getInteractionsData";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InteractionsPage");
  return { title: t("PageTitle") };
}

export default async function InteractionsPage() {
  const { contacts, activities } = await getInteractionsData();

  return <InteractionsClient initialContacts={contacts} initialActivities={activities} />;
}
