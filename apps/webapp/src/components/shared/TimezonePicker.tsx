// biome-ignore-all lint/nursery/useReactCompiler: live timezone clock uses an interval after mount
"use client";

import {
  formatOffset,
  formatTimezoneLabel,
  type GroupedTimezoneGroup,
  getGroupedTimezones,
  TIMEZONES_DATA,
} from "@bondery/helpers/locale";
import { ClockTime } from "@bondery/mantine-next";
import { intlTagForLocale } from "@bondery/schemas/locale";
import { Combobox } from "@mantine/core";
import { IconWorld } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SearchableComboboxPickerOption } from "@/components/shared/SearchableComboboxItem";
import { SearchableComboboxPicker } from "@/components/shared/SearchableComboboxPicker";
import { useCurrentLocale } from "@/components/shell/UserLocaleProvider";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useDateFormatter } from "@/lib/i18n/useDateFormatter";
import { nonEmpty } from "@/lib/shared/nonEmpty";

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
  const timezone = value ?? initialValue;
  const t = useSettingsPageTranslations("Profile");
  const formatter = useDateFormatter();
  const intlTag = intlTagForLocale(useCurrentLocale());
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
  const clockFor = (iana: string) => (
    <ClockTime ctx={{ ...formatter.ctx, timeZone: iana }} value={nowForDisplay} withSeconds />
  );
  const currentTimezoneTime =
    selectedTimezone && now ? clockFor(selectedTimezone.value) : "--:--:--";

  const searchPlaceholder = nonEmpty(placeholder) ?? t("TimezoneSearch");

  const groupedOptions = (query: string) => {
    const normalized = query.trim().toLowerCase();
    const groups: GroupedTimezoneGroup[] = [];
    for (const group of getGroupedTimezones(intlTag)) {
      const items = group.items.filter((item) =>
        normalized ? item.searchHaystack.includes(normalized) : true,
      );
      if (items.length === 0) {
        continue;
      }
      groups.push({ ...group, items });
    }
    return groups;
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
                  trailing={clockFor(item.value)}
                  value={item.value}
                />
              );
            })}
          </Combobox.Group>
        ))
      }
      searchPlaceholder={searchPlaceholder}
      targetFallback={nonEmpty(timezone) ?? searchPlaceholder}
      targetItem={
        selectedTimezone
          ? {
              flag: selectedTimezone.flag || "aq",
              main: formatTimezoneLabel(selectedTimezone, intlTag),
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
