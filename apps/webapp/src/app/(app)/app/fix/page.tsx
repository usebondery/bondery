import type { Metadata } from "next";
import { FixContactsLoader } from "./FixContactsLoader";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("FixContactsPage");
  return { title: t("Title") };
}

export default function FixPage() {
  return <FixContactsLoader />;
}
