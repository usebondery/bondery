"use client";

import { Stack } from "@mantine/core";
import { ErrorPageHeader } from "@/components/shell/ErrorPageHeader";
import { HashScrollOnMount } from "@/components/shell/HashScrollOnMount";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useWebappRuntimeConfig } from "@/lib/platform/runtimeConfig.client";
import { ApiKeysSection } from "./components/cards/ApiKeysSection";
import { DataManagementCard } from "./components/cards/DataManagementCard";
import { PreferencesCard } from "./components/cards/PreferencesCard";
import { ProfileCard } from "./components/cards/ProfileCard";
import { SubscriptionCard } from "./components/cards/SubscriptionCard";
import { SupportCard } from "./components/cards/SupportCard";
import { TagsSection } from "./components/cards/TagsSection";

export function SettingsClient() {
  const t = useSettingsPageTranslations();
  const { apiBaseUrl } = useWebappRuntimeConfig();

  return (
    <PageWrapper>
      <HashScrollOnMount />
      <ErrorPageHeader iconType="settings" title={t("Title")} />
      <Stack gap="xl">
        <SupportCard />
        <ProfileCard />
        <ApiKeysSection apiBaseUrl={apiBaseUrl} />
        <SubscriptionCard />
        <PreferencesCard />
        <TagsSection />
        <DataManagementCard />
      </Stack>
    </PageWrapper>
  );
}
