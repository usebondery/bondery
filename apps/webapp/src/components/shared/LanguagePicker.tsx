"use client";

import { Text, Stack, Combobox, useCombobox, Input, ScrollArea, Group } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { APP_LANGUAGES_DATA, WORLD_LANGUAGES_DATA, LanguageData } from "@/lib/languages";

interface LanguagePickerProps {
  value?: string;
  initialValue?: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  label?: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  languages?: LanguageData[];
  loading?: boolean;
  disabled?: boolean;
}

export function LanguagePicker({
  value,
  initialValue = "en",
  onChange,
  onBlur,
  label,
  description,
  placeholder,
  languages = APP_LANGUAGES_DATA,
  loading = false,
  disabled = false,
}: LanguagePickerProps) {
  const currentValue = value ?? initialValue;
  const [language, setLanguage] = useState(currentValue);
  const [searchValue, setSearchValue] = useState("");
  const t = useTranslations("SettingsPage.Profile");

  // Update language when value or initialValue changes
  useEffect(() => {
    setLanguage(currentValue);
  }, [currentValue]);

  // Update internal value when initialValue changes
  useEffect(() => {
    setLanguage(initialValue);
  }, [initialValue]);

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearchValue("");
      // Don't call onBlur here as it will be called with the old value
    },
    onDropdownOpen: () => {
      combobox.focusSearchInput();
      combobox.updateSelectedOptionIndex("active");
    },
  });

  const handleChange = (val: string | null) => {
    if (!val) return;

    setLanguage(val);
    onChange?.(val);
    combobox.closeDropdown();
    // Call onBlur with the new value after a short delay to ensure the change is processed
    setTimeout(() => {
      onBlur?.(val);
    }, 100);
  };

  const selectedLanguage = languages.find((lang) => lang.value === language);

  return (
    <Stack gap={4}>
      {label && (
        <Text size="sm" fw={500}>
          {label}
        </Text>
      )}
      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
      <Combobox store={combobox} onOptionSubmit={handleChange}>
        <Combobox.Target>
          <Input
            component="button"
            type="button"
            pointer
            disabled={disabled || loading}
            leftSection={<IconLanguage size={16} />}
            rightSection={<Combobox.Chevron />}
            onClick={() => {
              if (disabled || loading) {
                return;
              }

              combobox.toggleDropdown();
            }}
            rightSectionPointerEvents="none"
            styles={{
              input: {
                borderColor: combobox.dropdownOpened
                  ? "var(--mantine-primary-color-filled)"
                  : undefined,
              },
            }}
          >
            {selectedLanguage ? (
              <Group gap="xs" wrap="nowrap">
                <span className={`fi fi-${selectedLanguage.flag}`} style={{ flexShrink: 0 }} />
                <Text size="sm" fw={700}>
                  {selectedLanguage.label} ({selectedLanguage.nativeName})
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
            value={searchValue}
            className="transform-none"
            onChange={(event) => setSearchValue(event.currentTarget.value)}
            placeholder={placeholder || t("LanguageSearch")}
          />
          <Combobox.Options>
            <ScrollArea.Autosize mah={200}>
              {languages
                .filter(
                  (lang) =>
                    lang.label.toLowerCase().includes(searchValue.toLowerCase()) ||
                    lang.nativeName.toLowerCase().includes(searchValue.toLowerCase()),
                )
                .map((lang) => {
                  const isSelected = lang.value === language;
                  return (
                    <Combobox.Option
                      value={lang.value}
                      key={lang.value}
                      style={{
                        backgroundColor: isSelected
                          ? "var(--mantine-color-branding-primary-filled)"
                          : undefined,
                        color: isSelected ? "white" : undefined,
                      }}
                    >
                      <Group gap="xs" wrap="nowrap">
                        <span
                          className={`fi fi-${lang.flag}`}
                          style={{ width: 20, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          {isSelected && (
                            <Text
                              component="span"
                              c="var(--mantine-color-default-color)"
                              size="sm"
                              mr={4}
                              fw={700}
                            >
                              ✓ {t("CurrentlySelected")}:
                            </Text>
                          )}
                          <Text component="span" size="sm" fw={isSelected ? 700 : 400}>
                            {lang.label} ({lang.nativeName})
                          </Text>
                        </div>
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
