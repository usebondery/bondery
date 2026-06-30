"use client";

import { notifications } from "@mantine/notifications";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useApplyUserLanguage } from "@/lib/i18n/useApplyUserLanguage";
import type { SupportedLocale } from "@bondery/translations";
import { LanguagePicker as SharedLanguagePicker } from "@/components/shared/LanguagePicker";
import { APP_LANGUAGES_DATA } from "@bondery/helpers/locale";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { useUpdateSettingsMutation } from "@/lib/query/hooks/useSettings";

interface LanguagePickerProps {
  initialValue: string;
}

export function LanguagePicker({ initialValue }: LanguagePickerProps) {
  const t = useTranslations("SettingsPage.Profile");
  const tLanguages = useTranslations("Languages");
  const updateSettings = useUpdateSettingsMutation();
  const applyUserLanguage = useApplyUserLanguage();

  const handleChange = async (val: string) => {
    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("UpdatingLanguage"),
        description: t("PleaseWait"),
      }),
    });

    try {
      await updateSettings.mutateAsync({ language: val });
      await applyUserLanguage(val as SupportedLocale);

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          title: t("UpdateSuccess"),
          description: t("LanguageUpdateSuccess"),
        }),
      );

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
      getLocalizedLabel={(language) => tLanguages(language.value)}
    />
  );
}
