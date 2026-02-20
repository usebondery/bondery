"use client";

import { Text, Stack, Combobox, useCombobox, Input, ScrollArea, Group } from "@mantine/core";
import { IconWorld } from "@tabler/icons-react";
import { useState, useEffect, forwardRef } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  getGroupedTimezones,
  getCurrentTimeInTimezone,
  formatOffset,
  TIMEZONES_DATA,
} from "@/lib/timezones";

const TimezoneItem = forwardRef<
  HTMLDivElement,
  {
    label: string;
    flag: string;
    offset: number;
    isSelected?: boolean;
    currentlySelectedText: string;
  }
>(({ label, flag, offset, isSelected, currentlySelectedText, ...others }, ref) => {
  const [currentTime, setCurrentTime] = useState(() => getCurrentTimeInTimezone(offset));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeInTimezone(offset));
    }, 1000);

    return () => clearInterval(interval);
  }, [offset]);

  const utcLabel = formatOffset(offset);

  return (
    <div
      ref={ref}
      {...others}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
        <span className={`fi fi-${flag || "aq"}`} style={{ width: 20, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          {isSelected && (
            <Text component="span" c="var(--mantine-color-default-color)" size="sm" mr={4} fw={700}>
              ✓ {currentlySelectedText}:
            </Text>
          )}
          <Text component="span" size="sm" fw={isSelected ? 700 : 400}>
            {label}{" "}
          </Text>
          <Text component="span" c={isSelected ? "white" : "dimmed"} size="xs">
            ({utcLabel})
          </Text>
        </div>
      </div>
      <Text size="xs" c={isSelected ? "white" : "dimmed"}>
        {currentTime}
      </Text>
    </div>
  );
});

TimezoneItem.displayName = "TimezoneItem";

interface TimezonePickerProps {
  value?: string;
  initialValue?: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  label?: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
}

export function TimezonePicker({
  value,
  initialValue = "UTC",
  onChange,
  onBlur,
  label,
  description,
  placeholder,
  loading = false,
  disabled = false,
}: TimezonePickerProps) {
  const currentValue = value ?? initialValue;
  const [timezone, setTimezone] = useState(currentValue);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const t = useTranslations("SettingsPage.Profile");
  const [currentTimezoneTime, setCurrentTimezoneTime] = useState(() => {
    const tzData = TIMEZONES_DATA.find((tz) => tz.value === currentValue);
    return tzData ? getCurrentTimeInTimezone(tzData.offset) : "";
  });

  // Update timezone when value or initialValue changes
  useEffect(() => {
    setTimezone(currentValue);
  }, [currentValue]);

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setTimezoneSearch("");
      // Don't call onBlur here as it will be called with the old value
    },
    onDropdownOpen: () => {
      combobox.focusSearchInput();
      combobox.updateSelectedOptionIndex("active");
    },
  });

  useEffect(() => {
    const tzData = TIMEZONES_DATA.find((tz) => tz.value === timezone);
    if (!tzData) return;

    const interval = setInterval(() => {
      setCurrentTimezoneTime(getCurrentTimeInTimezone(tzData.offset));
    }, 1000);

    return () => clearInterval(interval);
  }, [timezone]);

  const handleChange = (val: string | null) => {
    if (!val) return;

    setTimezone(val);
    onChange?.(val);
    combobox.closeDropdown();
    // Call onBlur with the new value after a short delay to ensure the change is processed
    setTimeout(() => {
      onBlur?.(val);
    }, 100);
  };

  const selectedTimezone = TIMEZONES_DATA.find((tz) => tz.value === timezone);

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
            leftSection={<IconWorld size={16} />}
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
            {selectedTimezone ? (
              <Group gap="xs" wrap="nowrap" style={{ flex: 1, overflow: "hidden" }}>
                <span className={`fi fi-${selectedTimezone.flag || "aq"}`} />
                <Text size="sm" truncate style={{ flex: 1 }} fw={700}>
                  {selectedTimezone.city}, {selectedTimezone.country}{" "}
                  <Text component="span" c="var(--mantine-color-default-color)" size="xs" fw={400}>
                    ({formatOffset(selectedTimezone.offset)})
                  </Text>
                </Text>
                <Text component="span" c="dimmed" size="xs" fw={400}>
                  {currentTimezoneTime}
                </Text>
              </Group>
            ) : (
              timezone || placeholder
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
            value={timezoneSearch}
            className="transform-none"
            onChange={(event) => setTimezoneSearch(event.currentTarget.value)}
            placeholder={placeholder || t("TimezoneSearch")}
          />
          <Combobox.Options>
            <ScrollArea.Autosize className="max-h-60">
              {getGroupedTimezones()
                .map((group) => ({
                  ...group,
                  items: group.items.filter((item) =>
                    item.label.toLowerCase().includes(timezoneSearch.toLowerCase()),
                  ),
                }))
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <Combobox.Group label={group.group} key={group.group}>
                    {group.items.map((item) => {
                      const isSelected = item.value === timezone;
                      return (
                        <Combobox.Option
                          value={item.value}
                          key={item.value}
                          style={{
                            backgroundColor: isSelected
                              ? "var(--mantine-color-branding-primary-filled)"
                              : undefined,
                            color: isSelected ? "white" : undefined,
                          }}
                        >
                          <TimezoneItem
                            {...item}
                            isSelected={isSelected}
                            currentlySelectedText={t("CurrentlySelected")}
                          />
                        </Combobox.Option>
                      );
                    })}
                  </Combobox.Group>
                ))}
            </ScrollArea.Autosize>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Stack>
  );
}
