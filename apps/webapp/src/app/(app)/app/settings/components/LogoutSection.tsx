"use client";

import { Text, Button, Group } from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { createBrowswerSupabaseClient } from "@/lib/supabase/client";
import { WEBSITE_ROUTES } from "@bondery/helpers";

export function LogoutSection() {
  const router = useRouter();
  const t = useTranslations("SettingsPage.DataManagement");

  const handleLogout = async () => {
    try {
      const loadingNotification = notifications.show({
        title: t("SigningOut"),
        message: t("SignOutWait"),
        loading: true,
        autoClose: false,
        withCloseButton: false,
      });

      const supabase = createBrowswerSupabaseClient();
      const { error } = await supabase.auth.signOut();

      notifications.hide(loadingNotification);

      if (error) {
        throw new Error(error.message || "Failed to sign out");
      }

      router.push(WEBSITE_ROUTES.LOGIN);
    } catch (error) {
      notifications.show({
        title: t("UpdateError"),
        message: error instanceof Error ? error.message : t("SignOutError"),
        color: "red",
      });
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
