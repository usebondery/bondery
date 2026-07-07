import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("UnavailablePage");
  return { title: t("MetadataTitle") };
}

export default function UnavailableLayout({ children }: { children: React.ReactNode }) {
  return children;
}
