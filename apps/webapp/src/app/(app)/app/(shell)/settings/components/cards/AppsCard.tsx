"use client";

import { CardSection } from "@mantine/core";
import { IconApps } from "@tabler/icons-react";
import { useEffect } from "react";
import { CONFIRM_ACTION_PARAM } from "@/lib/auth/reconfirm";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useSettingsQuery } from "@/lib/query/hooks/useSettings";
import { openMcpModal } from "../modals/openMcpModal";
import { ProviderIntegrations } from "./ProviderIntegrations";
import { SettingsSection } from "./SettingsSection";

const AI_ASSISTANTS_HASH = "#ai-assistants";

/** Survives a Strict Mode remount so the hash opens one modal. A real leave clears it. */
let openedMcpHashKey: string | undefined;
let openedMcpHashResetTimer: number | undefined;

function mcpHashLocationKey(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

interface AppsCardProps {
  apiBaseUrl: string;
  /**
   * True when this page load is a revoke step-up return.
   * ReconfirmResume removes `action` before this card can read it.
   */
  suppressMcpHashOpen: boolean;
}

export function AppsCard({ apiBaseUrl, suppressMcpHashOpen }: AppsCardProps) {
  const t = useSettingsPageTranslations("Apps");
  const { data: settingsResult } = useSettingsQuery();

  const settings = settingsResult?.data;

  useEffect(() => {
    if (openedMcpHashResetTimer !== undefined) {
      window.clearTimeout(openedMcpHashResetTimer);
      openedMcpHashResetTimer = undefined;
    }
    return () => {
      openedMcpHashResetTimer = window.setTimeout(() => {
        openedMcpHashKey = undefined;
        openedMcpHashResetTimer = undefined;
      }, 0);
    };
  }, []);

  useEffect(() => {
    if (!settings) {
      return;
    }
    if (window.location.hash !== AI_ASSISTANTS_HASH) {
      return;
    }

    const locationKey = mcpHashLocationKey();
    if (openedMcpHashKey === locationKey) {
      return;
    }

    const action = new URLSearchParams(window.location.search).get(CONFIRM_ACTION_PARAM);
    openedMcpHashKey = locationKey;
    if (suppressMcpHashOpen || action === "revoke_mcp_consent") {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("apps")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    openMcpModal({ apiBaseUrl });
  }, [apiBaseUrl, settings, suppressMcpHashOpen]);

  if (!settings) {
    return null;
  }

  const providers = Array.isArray(settings.providers) ? (settings.providers as string[]) : [];
  const userIdentities = Array.isArray(settings.identities)
    ? (settings.identities as Array<{
        id: string;
        identity_id: string;
        provider: string;
        user_id: string;
      }>)
    : [];

  return (
    <SettingsSection icon={<IconApps size={20} stroke={1.5} />} id="apps" title={t("Title")}>
      <CardSection inheritPadding py="md">
        <ProviderIntegrations
          apiBaseUrl={apiBaseUrl}
          description={t("Description")}
          hideTitle
          providers={providers}
          showMcpProvider
          showOAuthProviders={false}
          userIdentities={userIdentities}
        />
      </CardSection>
    </SettingsSection>
  );
}
