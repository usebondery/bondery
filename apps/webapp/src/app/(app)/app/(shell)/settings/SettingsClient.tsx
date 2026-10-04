"use client";

import { Stack } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ErrorPageHeader } from "@/components/shell/ErrorPageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { syncSubscription } from "@/lib/api/domains/subscription";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useWebappRuntimeConfig } from "@/lib/platform/runtimeConfig.client";
import { useSettingsQuery } from "@/lib/query/hooks/useSettings";
import { invalidateSubscription } from "@/lib/query/invalidation";
import { isPageLoadFailure } from "@/lib/query/pageLoadFailure";
import { AiAssistantsSection } from "./components/cards/AiAssistantsSection";
import { ApiKeysSection } from "./components/cards/ApiKeysSection";
import { AppsCard } from "./components/cards/AppsCard";
import { DataManagementCard } from "./components/cards/DataManagementCard";
import { PreferencesCard } from "./components/cards/PreferencesCard";
import { ProfileCard } from "./components/cards/ProfileCard";
import { SubscriptionCard } from "./components/cards/SubscriptionCard";
import { SupportCard } from "./components/cards/SupportCard";
import { TagsSection } from "./components/cards/TagsSection";
import { SettingsCardsSkeleton } from "./components/chrome/SettingsSkeletons";
import { ReconfirmResume } from "./ReconfirmResume";

export function SettingsClient() {
  const t = useSettingsPageTranslations();
  const { apiBaseUrl } = useWebappRuntimeConfig();
  const queryClient = useQueryClient();
  const { data, error, isError } = useSettingsQuery();

  useEffect(() => {
    let cancelled = false;
    void syncSubscription()
      .then(async () => {
        if (!cancelled) {
          await invalidateSubscription(queryClient);
        }
      })
      .catch(() => {
        // Settings already rendered from the DB mirror.
      });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  if (isError && !data && isPageLoadFailure(error)) {
    throw error;
  }

  return (
    <PageWrapper>
      <ReconfirmResume />
      <ErrorPageHeader iconType="settings" title={t("Title")} />
      {data ? (
        <Stack gap="xl">
          <SupportCard />
          <AppsCard />
          <ProfileCard />
          <ApiKeysSection apiBaseUrl={apiBaseUrl} />
          <AiAssistantsSection apiBaseUrl={apiBaseUrl} />
          <SubscriptionCard />
          <PreferencesCard />
          <TagsSection />
          <DataManagementCard />
        </Stack>
      ) : (
        <SettingsCardsSkeleton />
      )}
    </PageWrapper>
  );
}
