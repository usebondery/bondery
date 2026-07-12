"use client";

import {
  APP_LANGUAGES_DATA,
  type AppLanguageData,
  formatLanguageDisplayLabel,
  getAppLanguageExonymKey,
  type LanguageData,
} from "@bondery/helpers/locale";
import { DEFAULT_LOCALE } from "@bondery/translations";
import { Combobox, Group, Input, ScrollArea, Stack, Text, useCombobox } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
  const currentValue = value ?? initialValue;
  const [language, setLanguage] = useState(currentValue);
  const [searchValue, setSearchValue] = useState("");
  const t = useSettingsPageTranslations("Profile");
  const tLanguages = useLanguagesTranslations();

  useEffect(() => {
    setLanguage(currentValue);
  }, [currentValue]);

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearchValue("");
    },
    onDropdownOpen: () => {
      combobox.focusSearchInput();
      combobox.updateSelectedOptionIndex("active");
    },
  });

  const handleChange = (val: string | null) => {
    if (!val) {
      return;
    }

    setLanguage(val);
    onChange?.(val);
    combobox.closeDropdown();
    setTimeout(() => {
      onBlur?.(val);
    }, 100);
  };

  const selectedLanguage = languages.find((lang) => lang.value === language);

  const getExonym = (lang: PickerLanguage): string => {
    if (getLocalizedLabel) {
      return getLocalizedLabel(lang);
    }
    if (isWorldLanguage(lang)) {
      return lang.label;
    }
    return tLanguages(getAppLanguageExonymKey(lang.value) as never);
  };

  const getDisplayLabel = (lang: PickerLanguage) =>
    formatLanguageDisplayLabel(getExonym(lang), lang.nativeName);

  return (
    <Stack gap={4}>
      {label && (
        <Text fw={500} size="sm">
          {label}
        </Text>
      )}
      {description && (
        <Text c="dimmed" size="xs">
          {description}
        </Text>
      )}
      <Combobox onOptionSubmit={handleChange} store={combobox}>
        <Combobox.Target>
          <Input
            component="button"
            disabled={disabled || loading}
            leftSection={<IconLanguage size={16} />}
            onClick={() => {
              if (disabled || loading) {
                return;
              }

              combobox.toggleDropdown();
            }}
            pointer
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            styles={{
              input: {
                borderColor: combobox.dropdownOpened
                  ? "var(--mantine-primary-color-filled)"
                  : undefined,
              },
            }}
            type="button"
          >
            {selectedLanguage ? (
              <Group gap="xs" wrap="nowrap">
                <span className={`fi fi-${selectedLanguage.flag}`} style={{ flexShrink: 0 }} />
                <Text fw={400} size="sm">
                  {getDisplayLabel(selectedLanguage)}
                </Text>
              </Group>
            ) : (
              language || placeholder
            )}
          </Input>
        </Combobox.Target>

        <Combobox.Dropdown
          styles={{
            dropdown: {
              "--combobox-option-active-bg": "var(--mantine-color-branding-primary-filled-hover)",
            },
          }}
        >
          <Combobox.Search
            className="transform-none"
            onChange={(event) => setSearchValue(event.currentTarget.value)}
            placeholder={placeholder || t("LanguageSearch")}
            value={searchValue}
          />
          <Combobox.Options>
            <ScrollArea.Autosize className="max-h-60">
              {languages
                .filter((lang) => {
                  const query = searchValue.toLowerCase();
                  const exonym = getExonym(lang).toLowerCase();

                  return (
                    exonym.includes(query) ||
                    lang.nativeName.toLowerCase().includes(query) ||
                    (isWorldLanguage(lang) && lang.label.toLowerCase().includes(query))
                  );
                })
                .map((lang) => {
                  const isSelected = lang.value === language;
                  return (
                    <Combobox.Option
                      key={lang.value}
                      style={{
                        backgroundColor: isSelected
                          ? "var(--mantine-color-branding-primary-filled)"
                          : undefined,
                        color: isSelected ? "white" : undefined,
                      }}
                      value={lang.value}
                    >
                      <Group gap="xs" wrap="nowrap">
                        <span
                          className={`fi fi-${lang.flag}`}
                          style={{ flexShrink: 0, width: 20 }}
                        />
                        <Text component="span" fw={400} size="sm">
                          {getDisplayLabel(lang)}
                        </Text>
                      </Group>
                    </Combobox.Option>
                  );
                })}
            </ScrollArea.Autosize>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Stack>
  );
}
