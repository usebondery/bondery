"use client";

import { formatOffset, getGroupedTimezones, TIMEZONES_DATA } from "@bondery/helpers/locale";
import { Combobox, Group, Input, ScrollArea, Stack, Text, useCombobox } from "@mantine/core";
import { IconWorld } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { forwardRef, useEffect, useState } from "react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";

const TimezoneItem = forwardRef<
  HTMLDivElement,
  {
    label: string;
    flag: string;
    offset: number;
    timezoneValue: string;
    isSelected?: boolean;
    currentlySelectedText: string;
    now: Date;
  }
>(
  (
    { label, flag, offset, timezoneValue, isSelected, currentlySelectedText, now, ...others },
    ref,
  ) => {
    const formatter = useFormatter();

    const currentTime = formatter.dateTime(now, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: timezoneValue,
    });

    const utcLabel = formatOffset(offset);

    return (
      <div
        ref={ref}
        {...others}
        style={{
          alignItems: "center",
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", flex: 1, gap: 8 }}>
          <span className={`fi fi-${flag || "aq"}`} style={{ flexShrink: 0, width: 20 }} />
          <div style={{ flex: 1 }}>
            <Text component="span" fw={400} size="sm">
              {label}{" "}
            </Text>
            <Text c={isSelected ? "white" : "dimmed"} component="span" size="xs">
              ({utcLabel})
            </Text>
          </div>
        </div>
        <Text c={isSelected ? "white" : "dimmed"} size="xs">
          {currentTime}
        </Text>
      </div>
    );
  },
);

TimezoneItem.displayName = "TimezoneItem";

interface TimezonePickerProps {
  description?: ReactNode;
  disabled?: boolean;
  initialValue?: string;
  label?: ReactNode;
  loading?: boolean;
  onBlur?: (value: string) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  value?: string;
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
  const t = useSettingsPageTranslations("Profile");
  const formatter = useFormatter();
  const [isMounted, setIsMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Update timezone when value or initialValue changes
  useEffect(() => {
    setTimezone(currentValue);
  }, [currentValue]);

  // Single timer at parent level – all TimezoneItems share this tick
  useEffect(() => {
    setIsMounted(true);
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    setIsMounted(true);

    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleChange = (val: string | null) => {
    if (!val) {
      return;
    }

    setTimezone(val);
    onChange?.(val);
    combobox.closeDropdown();
    // Call onBlur with the new value after a short delay to ensure the change is processed
    setTimeout(() => {
      onBlur?.(val);
    }, 100);
  };

  const selectedTimezone = TIMEZONES_DATA.find((tz) => tz.value === timezone);
  const currentTimezoneTime =
    selectedTimezone && isMounted
      ? formatter.dateTime(now, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: selectedTimezone.value,
        })
      : "--:--:--";

  // Stable reference for the current tick so dropdown items don't need their own timers
  const nowForItems = isMounted ? now : new Date(0);

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
            leftSection={<IconWorld size={16} />}
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
            {selectedTimezone ? (
              <Group gap="xs" style={{ flex: 1, overflow: "hidden" }} wrap="nowrap">
                <span className={`fi fi-${selectedTimezone.flag || "aq"}`} />
                <Text fw={400} size="sm" style={{ flex: 1 }} truncate>
                  {selectedTimezone.city}, {selectedTimezone.country}{" "}
                  <Text c="var(--mantine-color-default-color)" component="span" fw={400} size="xs">
                    ({formatOffset(selectedTimezone.offset)})
                  </Text>
                </Text>
                <Text c="dimmed" component="span" fw={400} size="xs">
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
            className="transform-none"
            onChange={(event) => setTimezoneSearch(event.currentTarget.value)}
            placeholder={placeholder || t("TimezoneSearch")}
            value={timezoneSearch}
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
                  <Combobox.Group key={group.group} label={group.group}>
                    {group.items.map((item) => {
                      const isSelected = item.value === timezone;
                      return (
                        <Combobox.Option
                          key={item.value}
                          style={{
                            backgroundColor: isSelected
                              ? "var(--mantine-color-branding-primary-filled)"
                              : undefined,
                            color: isSelected ? "white" : undefined,
                          }}
                          value={item.value}
                        >
                          <TimezoneItem
                            currentlySelectedText={t("CurrentlySelected")}
                            flag={item.flag}
                            isSelected={isSelected}
                            label={item.label}
                            now={nowForItems}
                            offset={item.offset}
                            timezoneValue={item.value}
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
