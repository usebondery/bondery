"use client";

import { Text, Button, Group } from "@mantine/core";
import { IconTrash, IconAlertCircle } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { API_ROUTES, WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { createBrowswerSupabaseClient } from "@/lib/supabase/client";

export function DeleteAccountSection() {
  const t = useTranslations("SettingsPage.DataManagement");

  const handleDeleteAccount = () => {
    modals.openConfirmModal({
      title: (
        <ModalTitle
          text={t("DeleteConfirmTitle")}
          icon={<IconAlertCircle size={24} />}
          isDangerous={true}
        />
      ),
      children: (
        <Text size="sm">
          {t.rich("DeleteConfirmMessage", {
            b: (chunks) => <b>{chunks}</b>,
          })}
        </Text>
      ),
      centered: true,
      labels: {
        confirm: t("DeleteConfirmButton"),
        cancel: t("DeleteCancelButton"),
      },
      confirmProps: { color: "red", leftSection: <IconTrash size={16} /> },
      onConfirm: async () => {
        try {
          notifications.show({
            ...loadingNotificationTemplate({
              title: t("DeletingAccount"),
              description: t("PleaseWait"),
            }),
            id: "delete-account",
          });

          const response = await fetch(API_ROUTES.ACCOUNT, {
            method: "DELETE",
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Failed to delete account");
          }

          notifications.hide("delete-account");
          notifications.show(
            successNotificationTemplate({
              title: t("DeleteSuccess"),
              description: t("AccountDeleted"),
            }),
          );

          const supabase = createBrowswerSupabaseClient();
          await supabase.auth.signOut({ scope: "local" });

          window.location.assign(WEBSITE_ROUTES.LOGIN);
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
