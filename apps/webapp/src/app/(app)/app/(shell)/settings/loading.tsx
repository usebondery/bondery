import { ErrorPageHeader } from "@/components/shell/ErrorPageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { getSettingsPageTranslations } from "@/lib/i18n/generated/hooks.server";
import { SettingsCardsSkeleton } from "./components/chrome/SettingsSkeletons";

export default async function SettingsLoading() {
  const t = await getSettingsPageTranslations();
  return (
    <PageWrapper>
      <ErrorPageHeader iconType="settings" title={t("Title")} />
      <SettingsCardsSkeleton />
    </PageWrapper>
  );
}
