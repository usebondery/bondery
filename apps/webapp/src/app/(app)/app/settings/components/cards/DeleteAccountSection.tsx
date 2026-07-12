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
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { endSession } from "@/lib/auth/endSession";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { TypedTrans } from "@/lib/i18n/TypedTrans";
import { useDeleteAccountMutation } from "@/lib/query/hooks/useSettings";

export function DeleteAccountSection() {
  const tCommon = useCommonTranslations();

  const t = useSettingsPageTranslations("DataManagement");
  const deleteAccountMutation = useDeleteAccountMutation();

  const handleDeleteAccount = () => {
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
