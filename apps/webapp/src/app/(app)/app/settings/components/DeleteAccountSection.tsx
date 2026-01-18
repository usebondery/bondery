"use client";

import { Text, Button, Group } from "@mantine/core";
import { IconTrash, IconAlertCircle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";

export function DeleteAccountSection() {
  const router = useRouter();
  const t = useTranslations("SettingsPage.DataManagement");

  const handleDeleteAccount = () => {
    modals.openConfirmModal({
      title: (
        <Group gap="xs">
          <IconAlertCircle size={24} color="red" />
          <Text fw={600} size="lg" c={"red"}>
            {t("DeleteConfirmTitle")}
          </Text>
        </Group>
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
            id: "delete-account",
            title: t("DeletingAccount"),
            message: t("PleaseWait"),
            loading: true,
            autoClose: false,
            withCloseButton: false,
          });

          const response = await fetch("/api/account", {
            method: "DELETE",
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Failed to delete account");
          }

          notifications.hide("delete-account");
          notifications.show({
            title: t("DeleteSuccess"),
            message: t("AccountDeleted"),
            color: "green",
          });

          router.push("/");
        } catch (error) {
          notifications.hide("delete-account");
          notifications.show({
            title: t("UpdateError"),
            message: error instanceof Error ? error.message : t("DeleteError"),
            color: "red",
          });
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
