"use client";

import {
  APP_LANGUAGES_DATA,
  type AppLanguageData,
  getAppLanguageExonymKey,
  type LanguageData,
} from "@bondery/helpers/locale";
import { DEFAULT_LOCALE } from "@bondery/translations";
import { IconLanguage } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { SearchableComboboxPickerOption } from "@/components/shared/SearchableComboboxItem";
import { SearchableComboboxPicker } from "@/components/shared/SearchableComboboxPicker";
import { useLanguagesTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";

type PickerLanguage = AppLanguageData | LanguageData;

function isWorldLanguage(language: PickerLanguage): language is LanguageData {
  return "label" in language;
}

interface LanguagePickerProps {
  description?: ReactNode;
  disabled?: boolean;
  /** Override exonym resolution; app locales default to the `Languages` namespace. */
  getLocalizedLabel?: (language: PickerLanguage) => string;
  initialValue?: string;
  label?: ReactNode;
  languages?: PickerLanguage[];
  loading?: boolean;
  onBlur?: (value: string) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  value?: string;
}

export function LanguagePicker({
  value,
  initialValue = DEFAULT_LOCALE,
  onChange,
  onBlur,
  label,
  description,
  placeholder,
  languages = APP_LANGUAGES_DATA,
  getLocalizedLabel,
  loading = false,
  disabled = false,
}: LanguagePickerProps) {
  const language = value ?? initialValue;
  const t = useSettingsPageTranslations("Profile");
  const tLanguages = useLanguagesTranslations();

  const getExonym = (lang: PickerLanguage): string => {
    if (getLocalizedLabel) {
      return getLocalizedLabel(lang);
    }
    if (isWorldLanguage(lang)) {
      return lang.label;
    }
    return tLanguages(getAppLanguageExonymKey(lang.value) as never);
  };

  const getLanguageItemText = (lang: PickerLanguage) => {
    const exonym = getExonym(lang);
    const nativeName = lang.nativeName.trim();

    return {
      main: exonym,
      supporting: nativeName.length > 0 ? nativeName : undefined,
    };
  };

  const filterLanguages = (query: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return languages;
    }

    return languages.filter((lang) => {
      const exonym = getExonym(lang).toLowerCase();
      return (
        exonym.includes(normalized) ||
        lang.nativeName.toLowerCase().includes(normalized) ||
        (isWorldLanguage(lang) && lang.label.toLowerCase().includes(normalized))
      );
    });
  };

  const selectedLanguage = languages.find((lang) => lang.value === language);
  const searchPlaceholder = placeholder || t("LanguageSearch");

  return (
    <SearchableComboboxPicker
      description={description}
      disabled={disabled}
      label={label}
      loading={loading}
      onBlur={onBlur}
      onChange={onChange}
      renderOptions={({ query, selectedValue }) =>
        filterLanguages(query).map((lang) => {
          const { main, supporting } = getLanguageItemText(lang);
          return (
            <SearchableComboboxPickerOption
              flag={lang.flag}
              isSelected={lang.value === selectedValue}
              key={lang.value}
              main={main}
              supporting={supporting}
              value={lang.value}
            />
          );
        })
      }
      searchPlaceholder={searchPlaceholder}
      targetFallback={language || searchPlaceholder}
      targetItem={
        selectedLanguage
          ? {
              flag: selectedLanguage.flag,
              ...getLanguageItemText(selectedLanguage),
            }
          : undefined
      }
      targetLeftSection={<IconLanguage size={16} />}
      value={language}
    />
  );
}
