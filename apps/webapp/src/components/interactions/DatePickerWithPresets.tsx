"use client";

import { Group, Text } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useInteractionsPageTranslations } from "@/lib/i18n/generated/hooks";

type DatePickerWithPresetsProps = Omit<ComponentProps<typeof DatePickerInput>, "onDropdownOpen"> & {
  onDropdownOpen?: () => void;
};

type DatePresetItem = {
  offsetDays: number;
  textLabel: string;
  value: string;
};

function toDatePreset(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function dayOffsetFromToday(today: Date, value: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfLocalDay(value).getTime() - today.getTime()) / msPerDay);
}

function formatDayOffset(offsetDays: number) {
  if (offsetDays === 0) {
    return "0";
  }
  return offsetDays > 0 ? `+${offsetDays}` : `${offsetDays}`;
}

/**
 * Normalises any date value to a "YYYY-MM-DD" string so that preset
 * matching works regardless of whether Mantine passes a Date object (which
 * it does when valueFormat is overridden to e.g. "MMMM D, YYYY") or
 * a plain string.
 */
function toNormalizedDateString(val: Date | string | null | undefined): string | null {
  if (val instanceof Date) {
    return toDatePreset(val);
  }
  if (typeof val === "string" && val) {
    return val.split("T")[0] || null;
  }
  return null;
}

function DatePresetLabel({ offsetDays, label }: { label: string; offsetDays: number }) {
  return (
    <Group gap="xs" justify="flex-start" wrap="nowrap">
      <Text
        component="span"
        opacity={0.7}
        size="sm"
        style={{ fontVariantNumeric: "tabular-nums" }}
        ta="right"
        w="4ch"
      >
        {formatDayOffset(offsetDays)}
      </Text>
      <Text component="span" size="sm">
        {label}
      </Text>
    </Group>
  );
}

/**
 * Date picker with quick presets for timeline activities.
 * Presets are chronological (past → future). Each button shows a day offset
 * from today (`-1`, `0`, `+1`, …) so the list is scannable.
 * The currently selected preset is highlighted with a primary-colour background
 * (via the `presetsButton[data-active]` CSS rule).
 */
export function DatePickerWithPresets({
  onChange,
  onDropdownOpen,
  popoverProps,
  classNames,
  ...props
}: DatePickerWithPresetsProps) {
  const t = useInteractionsPageTranslations();
  const today = useMemo(() => startOfLocalDay(new Date()), []);

  const presetItems = useMemo<DatePresetItem[]>(() => {
    const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return [
      { date: lastYear, textLabel: t("DatePresetLastYear") },
      { date: lastMonth, textLabel: t("DatePresetLastMonth") },
      { date: lastWeek, textLabel: t("DatePresetLastWeek") },
      { date: yesterday, textLabel: t("DatePresetYesterday") },
      { date: today, textLabel: t("DatePresetToday") },
      { date: tomorrow, textLabel: t("DatePresetTomorrow") },
    ].map(({ date, textLabel }) => ({
      offsetDays: dayOffsetFromToday(today, date),
      textLabel,
      value: toDatePreset(date),
    }));
  }, [t, today]);

  const presets = useMemo(
    () =>
      presetItems.map((item) => ({
        label: <DatePresetLabel label={item.textLabel} offsetDays={item.offsetDays} />,
        value: item.value,
      })),
    [presetItems],
  );

  // Stable ref to the current presets array so `markActivePreset` can look up
  // a preset by its label text instead of by DOM index (which is unreliable).
  const presetsRef = useRef(presetItems);
  presetsRef.current = presetItems;

  // Ref that always holds the latest effective value (normalised to
  // "YYYY-MM-DD") so `markActivePreset` can compare against preset strings
  // regardless of how the consumer formats or stores the date.
  const valueRef = useRef<string | null>(
    toNormalizedDateString(
      (props.value as Date | string | null) ?? (props.defaultValue as Date | string | null) ?? null,
    ),
  );

  // Keep ref in sync when used as a controlled input.
  useEffect(() => {
    if (props.value !== undefined) {
      valueRef.current = toNormalizedDateString(props.value as Date | string | null);
    }
  }, [props.value]);

  /**
   * Adds `data-active` to the preset button whose visible label matches a known
   * preset with the currently selected value. Matching by translated name is more
   * robust than by DOM index when multiple pickers are open simultaneously.
   * Runs after a short delay so Mantine's portal has time to mount the dropdown.
   */
  const markActivePreset = useCallback((current: string | null) => {
    setTimeout(() => {
      document.querySelectorAll<HTMLButtonElement>(".presetsButton").forEach((button) => {
        const labelText = button.textContent?.trim() ?? "";
        const isActive = presetsRef.current.some(
          (preset) => labelText.includes(preset.textLabel) && preset.value === current,
        );
        if (isActive) {
          button.setAttribute("data-active", "true");
        } else {
          button.removeAttribute("data-active");
        }
      });
    }, 0);
  }, []);

  return (
    <DatePickerInput
      classNames={{
        presetButton: "presetsButton",
        presetsList: "presetsList",
        ...(classNames as Record<string, string> | undefined),
      }}
      leftSection={<IconCalendar size={16} />}
      presets={presets}
      valueFormat="YYYY-MM-DD"
      {...props}
      onChange={(val) => {
        const next = toNormalizedDateString(val as Date | string | null);
        valueRef.current = next;
        markActivePreset(next);
        onChange?.(val);
      }}
      popoverProps={{
        width: "max-content",
        ...popoverProps,
        onOpen: () => {
          markActivePreset(valueRef.current);
          onDropdownOpen?.();
          (popoverProps as { onOpen?: () => void } | undefined)?.onOpen?.();
        },
      }}
    />
  );
}
