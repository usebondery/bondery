"use client";

import { Stack } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ErrorPageHeader } from "@/components/shell/ErrorPageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { syncSubscription } from "@/lib/api/domains/subscription";
import { CONFIRM_ACTION_PARAM, stripReconfirmSearchParam } from "@/lib/auth/reconfirm";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useWebappRuntimeConfig } from "@/lib/platform/runtimeConfig.client";
import { useSettingsQuery } from "@/lib/query/hooks/useSettings";
import { invalidateSubscription } from "@/lib/query/invalidation";
import { isPageLoadFailure } from "@/lib/query/pageLoadFailure";
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

type McpHashGate = {
  locationKey: string;
  suppress: boolean;
};

let mcpHashGate: McpHashGate | undefined;
let mcpHashGateResetTimer: number | undefined;

/**
 * ReconfirmResume strips `action` in an effect. Keep the first read for that
 * location so a revoke return does not also open the MCP modal.
 */
function readSuppressMcpHashOpen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const locationKey = stripReconfirmSearchParam(window.location.href);
  if (mcpHashGate?.locationKey !== locationKey) {
    const action = new URLSearchParams(window.location.search).get(CONFIRM_ACTION_PARAM);
    mcpHashGate = {
      locationKey,
      suppress: action === "revoke_mcp_consent",
    };
  }

  return mcpHashGate.suppress;
}

export function SettingsClient() {
  const t = useSettingsPageTranslations();
  const { apiBaseUrl } = useWebappRuntimeConfig();
  const suppressMcpHashOpen = readSuppressMcpHashOpen();
  const queryClient = useQueryClient();
  const { data, error, isError } = useSettingsQuery();

  useEffect(() => {
    if (mcpHashGateResetTimer !== undefined) {
      window.clearTimeout(mcpHashGateResetTimer);
      mcpHashGateResetTimer = undefined;
    }
    return () => {
      mcpHashGateResetTimer = window.setTimeout(() => {
        mcpHashGate = undefined;
        mcpHashGateResetTimer = undefined;
      }, 0);
    };
  }, []);

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
          <AppsCard apiBaseUrl={apiBaseUrl} suppressMcpHashOpen={suppressMcpHashOpen} />
          <ProfileCard />
          <ApiKeysSection apiBaseUrl={apiBaseUrl} />
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
