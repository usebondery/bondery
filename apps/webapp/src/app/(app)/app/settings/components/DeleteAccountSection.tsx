"use client";

import { Text, Button, Group } from "@mantine/core";
import { IconTrash, IconAlertCircle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { Trans } from "next-i18next/client";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useDeleteAccountMutation } from "@/lib/query/hooks/useSettings";
import { endSession } from "@/lib/auth/endSession";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { openStandardConfirmModal } from "../../components/modals/openStandardConfirmModal";

export function DeleteAccountSection() {
  const t = useTranslations("SettingsPage.DataManagement");
  const deleteAccountMutation = useDeleteAccountMutation();

  const handleDeleteAccount = () => {
    openStandardConfirmModal({
      title: (
        <ModalTitle
          text={t("DeleteConfirmTitle")}
          icon={<IconAlertCircle size={24} />}
          isDangerous={true}
        />
      ),
      message: (
        <Text size="sm">
          <Trans t={t} i18nKey="DeleteConfirmMessage" components={{ b: <b /> }} />
        </Text>
      ),
      confirmLabel: t("DeleteConfirmButton"),
      cancelLabel: t("DeleteCancelButton"),
      confirmColor: "red",
      confirmLeftSection: <IconTrash size={16} />,
      onConfirm: async () => {
        try {
          notifications.show({
            ...loadingNotificationTemplate({
              title: t("DeletingAccount"),
              description: t("PleaseWait"),
            }),
            id: "delete-account",
          });

          await deleteAccountMutation.mutateAsync();

          notifications.hide("delete-account");
          notifications.show(
            successNotificationTemplate({
              title: t("DeleteSuccess"),
              description: t("AccountDeleted"),
            }),
          );

          await endSession({ reason: "account_deleted" });
        } catch (error) {
          notifications.hide("delete-account");
          notifications.show(
            errorNotificationTemplate({
              title: t("UpdateError"),
              description: error instanceof Error ? error.message : t("DeleteError"),
            }),
          );
        }
      },
    });
  };

  return (
    <Group justify="space-between" align="flex-start">
      <div style={{ flex: 1 }}>
        <Text size="sm" fw={500} mb={4} c="red">
          {t("DeleteAccount")}
        </Text>
        <Text size="xs" c="dimmed">
          {t("DeleteAccountDescription")}
        </Text>
      </div>
      <Button
        leftSection={<IconTrash size={16} />}
        color="red"
        variant="light"
        onClick={handleDeleteAccount}
      >
        {t("DeleteButton")}
      </Button>
    </Group>
  );
}
