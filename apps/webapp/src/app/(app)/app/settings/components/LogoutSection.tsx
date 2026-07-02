"use client";

import { Text, Button, Group } from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { endSession } from "@/lib/auth/endSession";
import { errorNotificationTemplate, loadingNotificationTemplate } from "@bondery/mantine-next";

export function LogoutSection() {
  const t = useTranslations("SettingsPage.DataManagement");

  const handleLogout = async () => {
    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("SigningOut"),
        description: t("SignOutWait"),
      }),
    });

    try {
      await endSession({ reason: "user_initiated" });
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: t("UpdateError"),
          description: error instanceof Error ? error.message : t("SignOutError"),
        }),
      );
    } finally {
      notifications.hide(loadingNotification);
    }
  };

  return (
    <Group justify="space-between" align="flex-start">
      <div style={{ flex: 1 }}>
        <Text size="sm" fw={500} mb={4}>
          {t("SignOut")}
        </Text>
        <Text size="xs" c="dimmed">
          {t("SignOutDescription")}
        </Text>
      </div>
      <Button
        variant="light"
        color="blue"
        leftSection={<IconLogout size={16} />}
        onClick={handleLogout}
      >
        {t("SignOutButton")}
      </Button>
    </Group>
  );
}
