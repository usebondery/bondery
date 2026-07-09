"use client";

import { Stack } from "@mantine/core";
import { ErrorPageHeader } from "@/app/(app)/app/components/ErrorPageHeader";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { API_URL } from "@/lib/platform/config";
import { HashScrollOnMount } from "../components/HashScrollOnMount";
import { PageWrapper } from "../components/PageWrapper";
import { ApiKeysSection } from "./components/ApiKeysSection";
import { DataManagementCard } from "./components/DataManagementCard";
import { PreferencesCard } from "./components/PreferencesCard";
import { ProfileCard } from "./components/ProfileCard";
import { SubscriptionCard } from "./components/SubscriptionCard";
import { SupportCard } from "./components/SupportCard";
import { TagsSection } from "./components/TagsSection";

export function SettingsClient() {
  const t = useWebTranslations("SettingsPage");

  return (
    <PageWrapper>
      <HashScrollOnMount />
      <ErrorPageHeader iconType="settings" title={t("Title")} />
      <Stack gap="xl">
        <SupportCard />
        <ProfileCard />
        <ApiKeysSection apiBaseUrl={API_URL} />
        <SubscriptionCard />
        <PreferencesCard />
        <TagsSection />
        <DataManagementCard />
      </Stack>
    </PageWrapper>
  );
}
