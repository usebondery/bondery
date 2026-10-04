"use client";

import { getAuthUserFacingError } from "@bondery/helpers/api";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import type { ApiKeyListItem, McpConsentListItem } from "@bondery/schemas";
import type { TranslateFn } from "@bondery/translations";
import { notifications } from "@mantine/notifications";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { openApiKeyModal } from "@/app/(app)/app/(shell)/settings/components/modals/openApiKeyModal";
import {
  openDeleteAccountConfirm,
  openRevokeApiKeyConfirm,
  openRevokeMcpConsentConfirm,
  openUnlinkProviderConfirm,
  runLinkSocialProvider,
} from "@/app/(app)/app/(shell)/settings/settingsAuthActions";
import { createWebappAuthClient } from "@/lib/auth/client";
import {
  baIdentityMatchesBff,
  buildReconfirmCallbackUrl,
  CONFIRM_ACTION_PARAM,
  CONFIRM_TARGET_PARAM,
  getBetterAuthSessionIdentity,
  isBetterAuthSessionFresh,
  isSessionStaleError,
  parseConfirmTarget,
  parseReconfirmPurpose,
  type ReconfirmPurpose,
  stripReconfirmSearchParam,
} from "@/lib/auth/reconfirm";
import { runAddPasskeyCeremony } from "@/lib/auth/runAddPasskeyCeremony";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { getWebappRuntimeConfigSync } from "@/lib/platform/runtimeConfig.client";
import { useDeleteApiKeyMutation } from "@/lib/query/hooks/useApiKeys";
import { useRevokeMcpConsentMutation } from "@/lib/query/hooks/useMcpConsents";
import { useDeleteAccountMutation, useSettingsQuery } from "@/lib/query/hooks/useSettings";
import { invalidateSettings } from "@/lib/query/invalidation";
import { settingsKeys } from "@/lib/query/keys";

function stripReconfirmFromLocation(): void {
  const next = stripReconfirmSearchParam(window.location.href);
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) {
    return;
  }
  window.history.replaceState(null, "", next);
}

export function ReconfirmResume() {
  const purposeRef = useRef<ReconfirmPurpose | null | undefined>(undefined);
  const targetRef = useRef<string | null>(null);
  const openedRef = useRef(false);
  const tProfile = useSettingsPageTranslations("Profile");
  const tData = useSettingsPageTranslations("DataManagement");
  const tIntegration = useSettingsPageTranslations("Integration");
  const tApiKeys = useSettingsPageTranslations("ApiKeys");
  const tAiAssistants = useSettingsPageTranslations("AiAssistants");
  const tCommon = useCommonTranslations();
  const queryClient = useQueryClient();
  const { data: settingsResult } = useSettingsQuery();
  const deleteAccountMutation = useDeleteAccountMutation();
  const deleteApiKeyMutation = useDeleteApiKeyMutation();
  const revokeMcpConsentMutation = useRevokeMcpConsentMutation();

  useEffect(() => {
    if (purposeRef.current !== undefined) {
      return;
    }
    const params = new URL(window.location.href).searchParams;
    purposeRef.current = parseReconfirmPurpose(params.get(CONFIRM_ACTION_PARAM));
    targetRef.current = parseConfirmTarget(params.get(CONFIRM_TARGET_PARAM));
    stripReconfirmFromLocation();
  }, []);

  useEffect(() => {
    const purpose = purposeRef.current;
    if (!purpose || openedRef.current || !settingsResult?.data) {
      return;
    }
    openedRef.current = true;

    const settings = settingsResult.data;
    const identities = Array.isArray(settings.identities)
      ? (settings.identities as Array<{
          id: string;
          identity_id: string;
          provider: string;
          user_id: string;
        }>)
      : [];
    const providers = Array.isArray(settings.providers) ? (settings.providers as string[]) : [];
    const email = typeof settings.email === "string" ? settings.email : "";
    const bffUserId = identities[0]?.user_id ?? null;
    const confirmUrl = buildReconfirmCallbackUrl(
      window.location.origin,
      purpose,
      targetRef.current,
    );

    void (async () => {
      const ba = await getBetterAuthSessionIdentity();
      const match = baIdentityMatchesBff({
        baEmail: ba?.email ?? null,
        baUserId: ba?.id ?? null,
        bffEmail: email,
        bffUserId,
      });
      const fresh = await isBetterAuthSessionFresh();
      if (!match || !fresh) {
        window.location.assign(confirmUrl);
        return;
      }

      try {
        await runResumedAction({
          deleteAccount: (token) => deleteAccountMutation.mutateAsync(token),
          identities,
          providers,
          purpose,
          queryClient,
          revokeApiKey: (id, token) => deleteApiKeyMutation.mutateAsync({ id, stepUpToken: token }),
          revokeMcpConsent: (id, token) =>
            revokeMcpConsentMutation.mutateAsync({ id, stepUpToken: token }),
          tAiAssistants,
          tApiKeys,
          targetId: targetRef.current,
          tCommon,
          tData,
          tIntegration,
          tProfile,
        });
      } catch (error) {
        if (isSessionStaleError(error)) {
          window.location.assign(confirmUrl);
        }
      }
    })();
  }, [
    deleteAccountMutation,
    deleteApiKeyMutation,
    queryClient,
    revokeMcpConsentMutation,
    settingsResult,
    tAiAssistants,
    tApiKeys,
    tCommon,
    tData,
    tIntegration,
    tProfile,
  ]);

  return null;
}

async function runResumedAction(options: {
  deleteAccount: (token: string) => Promise<void>;
  identities: Array<{ id: string; identity_id: string; provider: string; user_id: string }>;
  providers: string[];
  purpose: ReconfirmPurpose;
  queryClient: QueryClient;
  revokeApiKey: (id: string, stepUpToken: string) => Promise<void>;
  revokeMcpConsent: (id: string, stepUpToken: string) => Promise<void>;
  tAiAssistants: TranslateFn<"SettingsPage", "AiAssistants">;
  tApiKeys: TranslateFn<"SettingsPage", "ApiKeys">;
  tCommon: TranslateFn<"common">;
  tData: TranslateFn<"SettingsPage", "DataManagement">;
  tIntegration: TranslateFn<"SettingsPage", "Integration">;
  tProfile: TranslateFn<"SettingsPage", "Profile">;
  targetId: string | null;
}): Promise<undefined | "stay"> {
  const { purpose } = options;

  switch (purpose) {
    case "add_passkey": {
      const result = await runAddPasskeyCeremony({
        authClient: createWebappAuthClient(),
        createErrorDescription: options.tProfile("Passkeys.CreateErrorDescription"),
        createErrorTitle: options.tProfile("Passkeys.CreateErrorTitle"),
        fallbackName: options.tProfile("Passkeys.FallbackName"),
        nameTemplate: ({ browser, os }) =>
          options.tProfile("Passkeys.NameTemplate", { browser, os }),
        queryClient: options.queryClient,
        tCommon: options.tCommon,
      });
      if (result === "session_stale") {
        throw Object.assign(new Error("SESSION_NOT_FRESH"), { code: "SESSION_NOT_FRESH" });
      }
      if (result !== "ok") {
        return "stay";
      }
      return;
    }
    case "link_github":
    case "link_linkedin": {
      const provider = purpose === "link_github" ? "github" : "linkedin";
      try {
        await runLinkSocialProvider(provider);
      } catch (error) {
        notifications.show(
          errorNotificationTemplate({
            description: getAuthUserFacingError(error, options.tCommon),
            title: options.tCommon("feedback.errorTitle"),
          }),
        );
      }
      return;
    }
    case "unlink_github":
    case "unlink_linkedin": {
      const provider = purpose === "unlink_github" ? "github" : "linkedin";
      if (options.providers.length <= 1) {
        notifications.show(
          errorNotificationTemplate({
            description: options.tIntegration("MustHaveOneMethod"),
            title: options.tIntegration("CannotUnlink"),
          }),
        );
        return;
      }
      openUnlinkProviderConfirm({
        displayName:
          provider === "github" ? options.tIntegration("GitHub") : options.tIntegration("LinkedIn"),
        identities: options.identities,
        onUnlinked: (unlinked) => {
          void invalidateSettings(options.queryClient);
          notifications.show(
            successNotificationTemplate({
              description: options.tIntegration("UnlinkSuccess", { provider: unlinked }),
              title: options.tProfile("UpdateSuccess"),
            }),
          );
        },
        provider,
        t: options.tProfile,
        tCommon: options.tCommon,
      });
      return;
    }
    case "create_api_key": {
      openApiKeyModal({
        apiBaseUrl: getWebappRuntimeConfigSync().apiBaseUrl,
        onCreated: () => {},
      });
      return;
    }
    case "revoke_api_key": {
      if (!options.targetId) {
        return;
      }
      const apiKeys =
        options.queryClient.getQueryData<ApiKeyListItem[]>(settingsKeys.apiKeys()) ?? [];
      const key = apiKeys.find((item) => item.id === options.targetId);
      openRevokeApiKeyConfirm({
        id: options.targetId,
        label: key?.label ?? options.targetId,
        revokeApiKey: options.revokeApiKey,
        t: options.tApiKeys,
        tCommon: options.tCommon,
      });
      return;
    }
    case "revoke_mcp_consent": {
      if (!options.targetId) {
        return;
      }
      const consents =
        options.queryClient.getQueryData<McpConsentListItem[]>(settingsKeys.mcpConsents()) ?? [];
      const consent = consents.find((item) => item.id === options.targetId);
      openRevokeMcpConsentConfirm({
        clientName: consent?.clientName ?? options.targetId,
        id: options.targetId,
        revokeConsent: options.revokeMcpConsent,
        t: options.tAiAssistants,
        tCommon: options.tCommon,
      });
      return;
    }
    case "delete_account": {
      openDeleteAccountConfirm({
        deleteAccount: options.deleteAccount,
        t: options.tData,
        tCommon: options.tCommon,
      });
      return;
    }
    default: {
      const _exhaustive: never = purpose;
      return _exhaustive;
    }
  }
}
