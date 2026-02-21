"use client";

import { Text, Stack, Combobox, useCombobox, Input, ScrollArea, Group } from "@mantine/core";
import { IconWorld } from "@tabler/icons-react";
import { useState, useEffect, forwardRef } from "react";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
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
  initialValue: string;
}

export function TimezonePicker({ initialValue }: TimezonePickerProps) {
  const [timezone, setTimezone] = useState(initialValue);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const t = useTranslations("SettingsPage.Profile");
  const [currentTimezoneTime, setCurrentTimezoneTime] = useState(() => {
    const tzData = TIMEZONES_DATA.find((tz) => tz.value === initialValue);
    return tzData ? getCurrentTimeInTimezone(tzData.offset) : "";
  });

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setTimezoneSearch("");
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

  const handleChange = async (val: string | null) => {
    if (!val) return;

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("UpdatingTimezone"),
        description: t("PleaseWait"),
      }),
      
    });

    try {
      const response = await fetch(API_ROUTES.SETTINGS, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timezone: val,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update timezone");
      }

      setTimezone(val);
      combobox.closeDropdown();

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          title: t("UpdateSuccess"),
          description: t("TimezoneUpdateSuccess"),
        }),
      );

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          title: t("UpdateError"),
          description: t("TimezoneUpdateError"),
        }),
      );
    }
  };

  const selectedTimezone = TIMEZONES_DATA.find((tz) => tz.value === timezone);

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {t("Timezone")}
      </Text>
      <Combobox store={combobox} onOptionSubmit={handleChange}>
        <Combobox.Target>
          <Input
            component="button"
            type="button"
            pointer
            leftSection={<IconWorld size={16} />}
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
              timezone
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
            placeholder={t("TimezoneSearch")}
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
