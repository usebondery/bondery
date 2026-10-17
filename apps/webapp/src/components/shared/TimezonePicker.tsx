// biome-ignore-all lint/nursery/useReactCompiler: live timezone clock uses an interval after mount
"use client";

import { formatOffset, getGroupedTimezones, TIMEZONES_DATA } from "@bondery/helpers/locale";
import { Combobox } from "@mantine/core";
import { IconWorld } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SearchableComboboxPickerOption } from "@/components/shared/SearchableComboboxItem";
import { SearchableComboboxPicker } from "@/components/shared/SearchableComboboxPicker";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";

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

function formatTimezoneClock(
  formatter: ReturnType<typeof useFormatter>,
  timeZone: string,
  now: Date,
): string {
  return formatter.dateTime(now, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
  });
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
  const timezone = value ?? initialValue;
  const t = useSettingsPageTranslations("Profile");
  const formatter = useFormatter();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedTimezone = TIMEZONES_DATA.find((tz) => tz.value === timezone);
  const nowForDisplay = now ?? new Date(0);
  const currentTimezoneTime =
    selectedTimezone && now
      ? formatTimezoneClock(formatter, selectedTimezone.value, nowForDisplay)
      : "--:--:--";

  const searchPlaceholder = placeholder || t("TimezoneSearch");

  const groupedOptions = (query: string) => {
    const normalized = query.trim().toLowerCase();
    return getGroupedTimezones()
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          normalized ? item.label.toLowerCase().includes(normalized) : true,
        ),
      }))
      .filter((group) => group.items.length > 0);
  };

  return (
    <SearchableComboboxPicker
      description={description}
      disabled={disabled}
      label={label}
      loading={loading}
      onBlur={onBlur}
      onChange={onChange}
      renderOptions={({ query, selectedValue }) =>
        groupedOptions(query).map((group) => (
          <Combobox.Group key={group.group} label={group.group}>
            {group.items.map((item) => {
              const isSelected = item.value === selectedValue;
              return (
                <SearchableComboboxPickerOption
                  flag={item.flag}
                  isSelected={isSelected}
                  key={item.value}
                  main={item.label}
                  supporting={formatOffset(item.offset)}
                  trailing={formatTimezoneClock(formatter, item.value, nowForDisplay)}
                  value={item.value}
                />
              );
            })}
          </Combobox.Group>
        ))
      }
      searchPlaceholder={searchPlaceholder}
      targetFallback={timezone || searchPlaceholder}
      targetItem={
        selectedTimezone
          ? {
              flag: selectedTimezone.flag || "aq",
              main: `${selectedTimezone.city}, ${selectedTimezone.country}`,
              supporting: formatOffset(selectedTimezone.offset),
              trailing: currentTimezoneTime,
            }
          : undefined
      }
      targetLeftSection={<IconWorld size={16} />}
      value={timezone}
    />
  );
}
