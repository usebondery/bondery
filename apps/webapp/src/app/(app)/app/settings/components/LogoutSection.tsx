"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { errorNotificationTemplate, loadingNotificationTemplate } from "@bondery/mantine-next";
import { Button, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconLogout } from "@tabler/icons-react";
import { endSession } from "@/lib/auth/endSession";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";

export function LogoutSection() {
  const tCommon = useCommonTranslations();

  const t = useWebTranslations("SettingsPage", "DataManagement");

  const handleLogout = async () => {
    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("SignOutWait"),
        title: t("SigningOut"),
      }),
    });

    try {
      await endSession({ reason: "user_initiated" });
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: t("UpdateError"),
        }),
      );
    } finally {
      notifications.hide(loadingNotification);
    }
  };

  return (
    <Group align="flex-start" justify="space-between">
      <div style={{ flex: 1 }}>
        <Text fw={500} mb={4} size="sm">
          {t("SignOut")}
        </Text>
        <Text c="dimmed" size="xs">
          {t("SignOutDescription")}
        </Text>
      </div>
      <Button
        color="blue"
        leftSection={<IconLogout size={16} />}
        onClick={handleLogout}
        variant="light"
      >
        {t("SignOutButton")}
      </Button>
    </Group>
  );
}
