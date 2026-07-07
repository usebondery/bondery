import type { Metadata } from "next";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Onboarding");
  return { title: t("MetadataTitle") };
}

/**
 * Onboarding layout — the Modal overlay handles positioning.
 * Inherits auth and locale context from the parent app layout.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
