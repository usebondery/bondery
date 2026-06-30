"use client";

import { useMantineColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { ColorSchemePreference } from "@bondery/schemas";
import { useState } from "react";
import type { ReactNode } from "react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import {
  ThemePicker as SharedThemePicker,
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { useUpdateSettingsMutation } from "@/lib/query/hooks/useSettings";

interface ThemePickerProps {
  initialValue: ColorSchemePreference;
  label?: ReactNode;
}

export function ThemePicker({ initialValue, label }: ThemePickerProps) {
  const t = useTranslations("SettingsPage.Preferences");
  const [value, setValue] = useState<ColorSchemePreference>(initialValue);
  const { setColorScheme } = useMantineColorScheme();
  const updateSettings = useUpdateSettingsMutation();

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
      await updateSettings.mutateAsync({ colorScheme: nextValue });

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
    <SharedThemePicker
      value={value}
      className="max-w-96"
      onChange={handleChange}
      labels={{
        title: label ?? t("Theme"),
        light: t("Light"),
        dark: t("Dark"),
        system: t("System"),
      }}
    />
  );
}
