"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { Button, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";
import { Trans } from "next-i18next/client";
import { endSession } from "@/lib/auth/endSession";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useDeleteAccountMutation } from "@/lib/query/hooks/useSettings";
import { openStandardConfirmModal } from "../../components/modals/openStandardConfirmModal";

export function DeleteAccountSection() {
  const tCommon = useCommonTranslations();

  const t = useWebTranslations("SettingsPage", "DataManagement");
  const deleteAccountMutation = useDeleteAccountMutation();

  const handleDeleteAccount = () => {
    openStandardConfirmModal({
      cancelLabel: t("DeleteCancelButton"),
      confirmColor: "red",
      confirmLabel: t("DeleteConfirmButton"),
      confirmLeftSection: <IconTrash size={16} />,
      message: (
        <Text size="sm">
          <Trans components={{ b: <b /> }} i18nKey="DeleteConfirmMessage" t={t} />
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

          await deleteAccountMutation.mutateAsync();

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
  };

  return (
    <Group align="flex-start" justify="space-between">
      <div style={{ flex: 1 }}>
        <Text c="red" fw={500} mb={4} size="sm">
          {t("DeleteAccount")}
        </Text>
        <Text c="dimmed" size="xs">
          {t("DeleteAccountDescription")}
        </Text>
      </div>
      <Button
        color="red"
        leftSection={<IconTrash size={16} />}
        onClick={handleDeleteAccount}
        variant="light"
      >
        {t("DeleteButton")}
      </Button>
    </Group>
  );
}
