"use client";

import { Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { useMantineColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMoon, IconSettings, IconSun } from "@tabler/icons-react";
import type { ColorSchemePreference } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";

interface ThemePickerProps {
  initialValue: ColorSchemePreference;
}

export function ThemePicker({ initialValue }: ThemePickerProps) {
  const t = useTranslations("SettingsPage.Preferences");
  const [value, setValue] = useState<ColorSchemePreference>(initialValue);
  const { setColorScheme } = useMantineColorScheme();

  const handleChange = async (nextValue: string) => {
    if (nextValue !== "light" && nextValue !== "dark" && nextValue !== "auto") {
      return;
    }

    const previousValue = value;
    setValue(nextValue);
    setColorScheme(nextValue);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("UpdatingTheme"),
        description: t("PleaseWait"),
      }),
    });

    try {
      const response = await fetch(API_ROUTES.SETTINGS, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          color_scheme: nextValue,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update color scheme");
      }

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          title: t("UpdateSuccess"),
          description: t("ThemeUpdateSuccess"),
        }),
      );

      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch {
      setValue(previousValue);
      setColorScheme(previousValue);

      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          title: t("UpdateError"),
          description: t("ThemeUpdateError"),
        }),
      );
    }
  };

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {t("Theme")}
      </Text>
      <SegmentedControl
        w={"fit-content"}
        value={value}
        onChange={handleChange}
        data={[
          {
            label: (
              <Group gap={6} wrap="nowrap" justify="center" px={"xl"}>
                <IconSun size={14} />
                <Text size="sm">{t("Light")}</Text>
              </Group>
            ),
            value: "light",
          },
          {
            label: (
              <Group gap={6} wrap="nowrap" justify="center" px={"xl"}>
                <IconMoon size={14} />
                <Text size="sm">{t("Dark")}</Text>
              </Group>
            ),
            value: "dark",
          },
          {
            label: (
              <Group gap={6} wrap="nowrap" justify="center" px={"xl"}>
                <IconSettings size={14} />
                <Text size="sm">{t("System")}</Text>
              </Group>
            ),
            value: "auto",
          },
        ]}
      />
    </Stack>
  );
}
