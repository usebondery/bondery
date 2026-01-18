"use client";

import { Text, Stack, Combobox, useCombobox, Input, ScrollArea, Group } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { LANGUAGES_DATA } from "@/lib/languages";
import { useTranslations } from "next-intl";

interface LanguagePickerProps {
  initialValue: string;
}

export function LanguagePicker({ initialValue }: LanguagePickerProps) {
  const [language, setLanguage] = useState(initialValue);
  const [searchValue, setSearchValue] = useState("");
  const t = useTranslations("SettingsPage.Profile");

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

  const handleChange = async (val: string | null) => {
    if (!val) return;

    const loadingNotification = notifications.show({
      title: t("UpdatingLanguage"),
      message: t("PleaseWait"),
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });

    try {
      const response = await fetch("/api/settings", {
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

      setLanguage(val);
      combobox.closeDropdown();

      notifications.hide(loadingNotification);
      notifications.show({
        title: t("UpdateSuccess"),
        message: t("LanguageUpdateSuccess"),
        color: "green",
      });

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      notifications.hide(loadingNotification);
      notifications.show({
        title: t("UpdateError"),
        message: t("LanguageUpdateError"),
        color: "red",
      });
    }
  };

  const selectedLanguage = LANGUAGES_DATA.find((lang) => lang.value === language);

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {t("Language")}
      </Text>
      <Combobox store={combobox} onOptionSubmit={handleChange}>
        <Combobox.Target>
          <Input
            component="button"
            type="button"
            pointer
            leftSection={<IconLanguage size={16} />}
            rightSection={<Combobox.Chevron />}
            onClick={() => combobox.toggleDropdown()}
            rightSectionPointerEvents="none"
            className={combobox.dropdownOpened ? "" : "input-scale-effect"}
            style={{
              transform: combobox.dropdownOpened ? "scale(0.98)" : undefined,
              filter: combobox.dropdownOpened ? "brightness(0.9)" : undefined,
              transition:
                "transform var(--transition-time) var(--transition-ease), filter var(--transition-time) var(--transition-ease), border-color var(--transition-time) var(--transition-ease)",
            }}
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
              language
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
            placeholder={t("LanguageSearch")}
          />
          <Combobox.Options>
            <ScrollArea.Autosize mah={200}>
              {LANGUAGES_DATA.filter(
                (lang) =>
                  lang.label.toLowerCase().includes(searchValue.toLowerCase()) ||
                  lang.nativeName.toLowerCase().includes(searchValue.toLowerCase()),
              ).map((lang) => {
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
                      <span className={`fi fi-${lang.flag}`} style={{ width: 20, flexShrink: 0 }} />
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
