"use client";

import type { DateFormatPreference } from "@bondery/schemas";
import { buildIntlLocaleTag, formatOrderedDate } from "@bondery/schemas/locale";
import { SegmentedControl, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { useUserLocale } from "@/components/shell/UserLocaleProvider";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";

const PREVIEW_DATE = new Date(Date.UTC(2026, 10, 13, 12, 0, 0));

interface DateFormatPickerProps {
  description?: string;
  label?: ReactNode;
  onChange: (nextFormat: DateFormatPreference) => void;
  value: DateFormatPreference;
}

function previewLabel(
  preference: DateFormatPreference,
  intlLocaleTag: string,
  t: ReturnType<typeof useSettingsPageTranslations>,
): string {
  if (preference === "locale") {
    return t("DateFormatLocale", {
      preview: formatOrderedDate({
        date: PREVIEW_DATE,
        dateFormat: "locale",
        intlLocaleTag,
      }),
    });
  }
  if (preference === "mdy") {
    return t("DateFormatMdy", { preview: "11/13/2026" });
  }
  if (preference === "dmy") {
    return t("DateFormatDmy", { preview: "13/11/2026" });
  }
  return t("DateFormatYmd", { preview: "2026-11-13" });
}

export function DateFormatPicker({ value, onChange, label, description }: DateFormatPickerProps) {
  const t = useSettingsPageTranslations("Preferences");
  const { locale, timeFormat } = useUserLocale();
  const intlLocaleTag = buildIntlLocaleTag(locale, timeFormat);

  const options: DateFormatPreference[] = ["locale", "mdy", "dmy", "ymd"];

  return (
    <Stack gap={4}>
      <Text fw={500} size="sm">
        {label ?? t("DateFormat")}
      </Text>
      {description ? (
        <Text c="dimmed" size="xs">
          {description}
        </Text>
      ) : null}
      <SegmentedControl
        data={options.map((option) => ({
          label: previewLabel(option, intlLocaleTag, t),
          value: option,
        }))}
        fullWidth
        onChange={(nextValue) => {
          if (
            nextValue !== "locale" &&
            nextValue !== "mdy" &&
            nextValue !== "dmy" &&
            nextValue !== "ymd"
          ) {
            return;
          }
          onChange(nextValue);
        }}
        value={value}
      />
    </Stack>
  );
}
