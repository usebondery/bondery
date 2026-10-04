"use client";

import { getAuthUserFacingError, getUserFacingError } from "@bondery/helpers/api";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { TranslateFn } from "@bondery/translations";
import { Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconTrash, IconUnlink } from "@tabler/icons-react";
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { mintStepUpNonce } from "@/lib/api/domains/step-up";
import { betterAuthUnlinkAccountId } from "@/lib/auth/better-auth-unlink-account-id";
import { createWebappAuthClient } from "@/lib/auth/client";
import { endSession } from "@/lib/auth/endSession";
import { TypedTrans } from "@/lib/i18n/TypedTrans";
import { INTEGRATION_PROVIDERS } from "@/lib/platform/config";

type UserIdentity = {
  id: string;
  identity_id: string;
  provider: string;
  user_id: string;
};

export function providerKeyFor(provider: "github" | "linkedin"): string {
  return INTEGRATION_PROVIDERS.find((item) => item.provider === provider)?.providerKey ?? provider;
}

function identityMatchesProvider(identity: UserIdentity, provider: "github" | "linkedin"): boolean {
  if (identity.provider === provider || identity.provider === providerKeyFor(provider)) {
    return true;
  }
  return provider === "linkedin" && identity.provider === "linkedin_oidc";
}

export async function runLinkSocialProvider(provider: "github" | "linkedin"): Promise<void> {
  const authClient = createWebappAuthClient();
  const { data, error } = await authClient.linkSocial({ provider });
  if (error) {
    throw error;
  }
  if (data?.url) {
    window.location.href = data.url;
  }
}

export function openUnlinkProviderConfirm(options: {
  displayName: string;
  identities: UserIdentity[];
  onUnlinked: (provider: "github" | "linkedin") => void;
  provider: "github" | "linkedin";
  t: TranslateFn<"SettingsPage", "Profile">;
  tCommon: TranslateFn<"common">;
}): void {
  const { t } = options;

  openStandardConfirmModal({
    cancelLabel: t("Cancel"),
    confirmColor: "red",
    confirmLabel: t("UnlinkAccountButton"),
    message: (
      <Text size="sm">
        <TypedTrans
          components={{ b: <b /> }}
          i18nKey="UnlinkAccountMessage"
          t={t}
          values={{ provider: options.displayName }}
        />
      </Text>
    ),
    onConfirm: () => confirmUnlinkProvider(options),
    title: (
      <ModalTitle icon={<IconUnlink size={20} stroke={1.5} />} text={t("UnlinkAccountTitle")} />
    ),
  });
}

async function confirmUnlinkProvider(options: {
  identities: UserIdentity[];
  onUnlinked: (provider: "github" | "linkedin") => void;
  provider: "github" | "linkedin";
  tCommon: TranslateFn<"common">;
}): Promise<void> {
  const { provider, tCommon } = options;
  try {
    const targetIdentity = options.identities.find((identity) =>
      identityMatchesProvider(identity, provider),
    );

    if (!targetIdentity) {
      throw new Error(`${provider} identity not found`);
    }

    const authClient = createWebappAuthClient();
    const { error } = await authClient.unlinkAccount({
      accountId: betterAuthUnlinkAccountId(targetIdentity),
    });
    if (error) {
      throw error;
    }

    options.onUnlinked(provider);
  } catch (error) {
    notifications.show(
      errorNotificationTemplate({
        description: getAuthUserFacingError(error, tCommon),
        title: tCommon("feedback.errorTitle"),
      }),
    );
  }
}

export function openDeleteAccountConfirm(options: {
  deleteAccount: (stepUpToken: string) => Promise<void>;
  t: TranslateFn<"SettingsPage", "DataManagement">;
  tCommon: TranslateFn<"common">;
}): void {
  const { t, tCommon } = options;

  openStandardConfirmModal({
    cancelLabel: t("DeleteCancelButton"),
    confirmColor: "red",
    confirmLabel: t("DeleteConfirmButton"),
    confirmLeftSection: <IconTrash size={16} />,
    message: (
      <Text size="sm">
        <TypedTrans components={{ b: <b /> }} i18nKey="DeleteConfirmMessage" t={t} />
      </Text>
    ),
    onConfirm: async () => {
      try {
        notifications.show({
          ...loadingNotificationTemplate({
            description: t("PleaseWait"),
            title: t("DeletingAccount"),
          }),
          id: "delete-account",
        });

        const token = await mintStepUpNonce();
        await options.deleteAccount(token);

        notifications.hide("delete-account");
        notifications.show(
          successNotificationTemplate({
            description: t("AccountDeleted"),
            title: t("DeleteSuccess"),
          }),
        );

        await endSession({ reason: "account_deleted" });
      } catch (error) {
        notifications.hide("delete-account");
        notifications.show(
          errorNotificationTemplate({
            description: getUserFacingError(error, tCommon),
            title: t("UpdateError"),
          }),
        );
      }
    },
    title: (
      <ModalTitle
        icon={<IconAlertCircle size={24} />}
        isDangerous={true}
        text={t("DeleteConfirmTitle")}
      />
    ),
  });
}

export function openRevokeApiKeyConfirm(options: {
  id: string;
  label: string;
  revokeApiKey: (id: string, stepUpToken: string) => Promise<void>;
  t: TranslateFn<"SettingsPage", "ApiKeys">;
  tCommon: TranslateFn<"common">;
}): void {
  const { t, tCommon } = options;

  openStandardConfirmModal({
    cancelLabel: tCommon("confirm.noCancel"),
    confirmColor: "red",
    confirmLabel: tCommon("confirm.yesDelete"),
    confirmLeftSection: <IconTrash size={16} />,
    message: <Text size="sm">{t("DeleteMessage")}</Text>,
    onConfirm: async () => {
      try {
        const token = await mintStepUpNonce();
        await options.revokeApiKey(options.id, token);
      } catch (error) {
        notifications.show(
          errorNotificationTemplate({
            description: getUserFacingError(error, tCommon),
            title: tCommon("feedback.errorTitle"),
          }),
        );
      }
    },
    title: (
      <ModalTitle
        icon={<IconAlertCircle size={24} />}
        isDangerous
        text={t("DeleteTitle", { label: options.label })}
      />
    ),
  });
}

export function openRevokeMcpConsentConfirm(options: {
  clientName: string;
  id: string;
  revokeConsent: (id: string, stepUpToken: string) => Promise<void>;
  t: TranslateFn<"SettingsPage", "AiAssistants">;
  tCommon: TranslateFn<"common">;
}): void {
  const { t, tCommon } = options;

  openStandardConfirmModal({
    cancelLabel: tCommon("confirm.noCancel"),
    confirmColor: "red",
    confirmLabel: t("RevokeConfirm"),
    confirmLeftSection: <IconTrash size={16} />,
    message: <Text size="sm">{t("RevokeMessage")}</Text>,
    onConfirm: async () => {
      try {
        const token = await mintStepUpNonce();
        await options.revokeConsent(options.id, token);
      } catch (error) {
        notifications.show(
          errorNotificationTemplate({
            description: getUserFacingError(error, tCommon),
            title: tCommon("feedback.errorTitle"),
          }),
        );
      }
    },
    title: (
      <ModalTitle
        icon={<IconAlertCircle size={24} />}
        isDangerous
        text={t("RevokeTitle", { name: options.clientName })}
      />
    ),
  });
}
