import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { HomeLoader } from "./HomeLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("HomePage");
  return { title: t("Title") };
}

export default function HomePage() {
  return <HomeLoader />;
}
