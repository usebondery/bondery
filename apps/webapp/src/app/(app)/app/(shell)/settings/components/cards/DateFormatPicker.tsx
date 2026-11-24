"use client";

import type { DateFormatPreference } from "@bondery/schemas";
import {
  buildIntlLocaleTag,
  coerceDateFormatPreference,
  formatOrderedDate,
} from "@bondery/schemas/locale";
import { IconCalendar } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { SearchableComboboxPickerOption } from "@/components/shared/SearchableComboboxItem";
import { SearchableComboboxPicker } from "@/components/shared/SearchableComboboxPicker";
import { useUserLocale } from "@/components/shell/UserLocaleProvider";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { nonEmpty } from "@/lib/shared/nonEmpty";

const PREVIEW_DATE = new Date(Date.UTC(2026, 10, 13, 12, 0, 0));
const OPTIONS: DateFormatPreference[] = ["locale", "mdy", "dmy", "ymd"];

interface DateFormatPickerProps {
  description?: ReactNode;
  disabled?: boolean;
  label?: ReactNode;
  loading?: boolean;
  onBlur?: (value: DateFormatPreference) => void;
  onChange?: (value: DateFormatPreference) => void;
  placeholder?: string;
  value: DateFormatPreference;
}

function previewFor(preference: DateFormatPreference, intlLocaleTag: string): string {
  if (preference === "locale") {
    return formatOrderedDate({
      date: PREVIEW_DATE,
      dateFormat: "locale",
      intlLocaleTag,
    });
  }
  if (preference === "mdy") {
    return "11/13/2026";
  }
  if (preference === "dmy") {
    return "13/11/2026";
  }
  return "2026-11-13";
}

export function DateFormatPicker({
  value,
  onChange,
  onBlur,
  label,
  description,
  placeholder,
  loading = false,
  disabled = false,
}: DateFormatPickerProps) {
  const t = useSettingsPageTranslations("Preferences");
  const { locale, timeFormat } = useUserLocale();
  const intlLocaleTag = buildIntlLocaleTag(locale, timeFormat);

  const itemFor = (preference: DateFormatPreference) => {
    const supporting = previewFor(preference, intlLocaleTag);
    if (preference === "locale") {
      return { main: t("DateFormatLocale"), supporting };
    }
    if (preference === "mdy") {
      return { main: t("DateFormatMdy"), supporting };
    }
    if (preference === "dmy") {
      return { main: t("DateFormatDmy"), supporting };
    }
    return { main: t("DateFormatYmd"), supporting };
  };

  const searchPlaceholder = nonEmpty(placeholder) ?? t("DateFormatSearch");
  const selectedItem = itemFor(value);

  return (
    <SearchableComboboxPicker
      description={description}
      disabled={disabled}
      label={label}
      loading={loading}
      onBlur={(next) => {
        onBlur?.(coerceDateFormatPreference(next));
      }}
      onChange={(next) => {
        onChange?.(coerceDateFormatPreference(next));
      }}
      renderOptions={({ query, selectedValue }) => {
        const normalized = query.trim().toLowerCase();
        return OPTIONS.filter((option) => {
          if (!normalized) {
            return true;
          }
          const { main, supporting } = itemFor(option);
          return (
            main.toLowerCase().includes(normalized) || supporting.toLowerCase().includes(normalized)
          );
        }).map((option) => {
          const { main, supporting } = itemFor(option);
          return (
            <SearchableComboboxPickerOption
              isSelected={option === selectedValue}
              key={option}
              main={main}
              supporting={supporting}
              value={option}
            />
          );
        });
      }}
      searchPlaceholder={searchPlaceholder}
      targetFallback={selectedItem.main || searchPlaceholder}
      targetItem={selectedItem}
      targetLeftSection={<IconCalendar size={16} />}
      value={value}
    />
  );
}
