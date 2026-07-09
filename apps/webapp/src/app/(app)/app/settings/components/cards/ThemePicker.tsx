"use client";

import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ThemePicker as SharedThemePicker,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { ColorSchemePreference } from "@bondery/schemas";
import { useMantineColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { ReactNode } from "react";
import { useState } from "react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useUpdateSettingsMutation } from "@/lib/query/hooks/useSettings";

interface ThemePickerProps {
  initialValue: ColorSchemePreference;
  label?: ReactNode;
}

export function ThemePicker({ initialValue, label }: ThemePickerProps) {
  const t = useWebTranslations("SettingsPage", "Preferences");
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
        description: t("PleaseWait"),
        title: t("UpdatingTheme"),
      }),
    });

    try {
      await updateSettings.mutateAsync({ colorScheme: nextValue });

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          description: t("ThemeUpdateSuccess"),
          title: t("UpdateSuccess"),
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
          description: t("ThemeUpdateError"),
          title: t("UpdateError"),
        }),
      );
    }
  };

  return (
    <SharedThemePicker
      className="max-w-96"
      labels={{
        dark: t("Dark"),
        light: t("Light"),
        system: t("System"),
        title: label ?? t("Theme"),
      }}
      onChange={handleChange}
      value={value}
    />
  );
}
