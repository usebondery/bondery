"use client";

import { APP_LANGUAGES_DATA } from "@bondery/helpers/locale";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { SupportedLocale } from "@bondery/translations";
import { notifications } from "@mantine/notifications";
import { LanguagePicker as SharedLanguagePicker } from "@/components/shared/LanguagePicker";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useApplyUserLanguage } from "@/lib/i18n/useApplyUserLanguage";
import { useUpdateSettingsMutation } from "@/lib/query/hooks/useSettings";

interface LanguagePickerProps {
  initialValue: string;
}

export function LanguagePicker({ initialValue }: LanguagePickerProps) {
  const t = useSettingsPageTranslations("Profile");
  const updateSettings = useUpdateSettingsMutation();
  const applyUserLanguage = useApplyUserLanguage();

  const handleChange = async (val: string) => {
    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("PleaseWait"),
        title: t("UpdatingLanguage"),
      }),
    });

    try {
      await updateSettings.mutateAsync({ language: val });
      await applyUserLanguage(val as SupportedLocale);

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          description: t("LanguageUpdateSuccess"),
          title: t("UpdateSuccess"),
        }),
      );
    } catch {
      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          description: t("LanguageUpdateError"),
          title: t("UpdateError"),
        }),
      );
    }
  };

  return (
    <SharedLanguagePicker
      initialValue={initialValue}
      label={t("Language")}
      languages={APP_LANGUAGES_DATA}
      onChange={handleChange}
      placeholder={t("LanguageSearch")}
    />
  );
}
