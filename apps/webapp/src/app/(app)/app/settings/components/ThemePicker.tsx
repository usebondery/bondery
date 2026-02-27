import { useMantineColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { ColorSchemePreference } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ThemePicker as SharedThemePicker,
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";

interface ThemePickerProps {
  initialValue: ColorSchemePreference;
  label?: ReactNode;
}

export function ThemePicker({ initialValue, label }: ThemePickerProps) {
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
