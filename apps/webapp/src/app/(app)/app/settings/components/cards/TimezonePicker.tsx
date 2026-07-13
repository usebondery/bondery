"use client";

import {
  formatOffset,
  getCurrentTimeInTimezone,
  getGroupedTimezones,
  TIMEZONES_DATA,
} from "@bondery/helpers/locale";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { Combobox, Group, Input, ScrollArea, Stack, Text, useCombobox } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconWorld } from "@tabler/icons-react";
import { forwardRef, useEffect, useState } from "react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useUpdateSettingsMutation } from "@/lib/query/hooks/useSettings";

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
          {isSelected && (
            <Text c="var(--mantine-color-default-color)" component="span" fw={400} mr={4} size="sm">
              ✓ {currentlySelectedText}:
            </Text>
          )}
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
});

TimezoneItem.displayName = "TimezoneItem";

interface TimezonePickerProps {
  initialValue: string;
}

export function TimezonePicker({ initialValue }: TimezonePickerProps) {
  const [timezone, setTimezone] = useState(initialValue);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const t = useSettingsPageTranslations("Profile");
  const updateSettingsMutation = useUpdateSettingsMutation();
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
    if (!tzData) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTimezoneTime(getCurrentTimeInTimezone(tzData.offset));
    }, 1000);

    return () => clearInterval(interval);
  }, [timezone]);

  const handleChange = async (val: string | null) => {
    if (!val) {
      return;
    }

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("PleaseWait"),
        title: t("UpdatingTimezone"),
      }),
    });

    try {
      await updateSettingsMutation.mutateAsync({
        timezone: val,
      });

      setTimezone(val);
      combobox.closeDropdown();

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          description: t("TimezoneUpdateSuccess"),
          title: t("UpdateSuccess"),
        }),
      );

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          description: t("TimezoneUpdateError"),
          title: t("UpdateError"),
        }),
      );
    }
  };

  const selectedTimezone = TIMEZONES_DATA.find((tz) => tz.value === timezone);

  return (
    <Stack gap={4}>
      <Text fw={500} size="sm">
        {t("Timezone")}
      </Text>
      <Combobox onOptionSubmit={handleChange} store={combobox}>
        <Combobox.Target>
          <Input
            className={combobox.dropdownOpened ? "" : "input-scale-effect"}
            component="button"
            leftSection={<IconWorld size={16} />}
            onClick={() => combobox.toggleDropdown()}
            pointer
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            style={{
              filter: combobox.dropdownOpened ? "brightness(0.9)" : undefined,
              transform: combobox.dropdownOpened ? "scale(0.98)" : undefined,
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
            className="transform-none"
            onChange={(event) => setTimezoneSearch(event.currentTarget.value)}
            placeholder={t("TimezoneSearch")}
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
                            {...item}
                            currentlySelectedText={t("CurrentlySelected")}
                            isSelected={isSelected}
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
