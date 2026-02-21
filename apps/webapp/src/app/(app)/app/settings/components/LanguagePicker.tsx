"use client";

import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { LanguagePicker as SharedLanguagePicker } from "@/components/shared/LanguagePicker";
import { APP_LANGUAGES_DATA } from "@/lib/languages";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";

interface LanguagePickerProps {
  initialValue: string;
}

export function LanguagePicker({ initialValue }: LanguagePickerProps) {
  const t = useTranslations("SettingsPage.Profile");

  const handleChange = async (val: string) => {
    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("UpdatingLanguage"),
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
          language: val,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update language");
      }

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          title: t("UpdateSuccess"),
          description: t("LanguageUpdateSuccess"),
        }),
      );

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          title: t("UpdateError"),
          description: t("LanguageUpdateError"),
        }),
      );
    }
  };

  return (
    <SharedLanguagePicker
      initialValue={initialValue}
      onChange={handleChange}
      label={t("Language")}
      placeholder={t("LanguageSearch")}
      languages={APP_LANGUAGES_DATA}
    />
  );
}
