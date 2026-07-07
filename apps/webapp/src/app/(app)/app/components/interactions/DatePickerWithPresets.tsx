"use client";

import { DatePickerInput } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";

type DatePickerWithPresetsProps = Omit<ComponentProps<typeof DatePickerInput>, "onDropdownOpen"> & {
  onDropdownOpen?: () => void;
};

/**
 * Date picker with quick presets for timeline activities.
 * Tomorrow is listed above Today. The currently selected preset is highlighted
 * with a primary-colour background (via the `presetsButton[data-active]` CSS rule).
 */
export function DatePickerWithPresets({
  onChange,
  onDropdownOpen,
  popoverProps,
  classNames,
  ...props
}: DatePickerWithPresetsProps) {
  const t = useTranslations("InteractionsPage");
  const now = new Date();
  const toDatePreset = (value: Date) => {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, "0");
    const day = `${value.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  /**
   * Normalises any date value to a "YYYY-MM-DD" string so that preset
   * matching works regardless of whether Mantine passes a Date object (which
   * it does when valueFormat is overridden to e.g. "MMMM D, YYYY") or
   * a plain string.
   */
  const toNormalizedDateString = (val: Date | string | null | undefined): string | null => {
    if (val instanceof Date) return toDatePreset(val);
    if (typeof val === "string" && val) return val.split("T")[0] || null;
    return null;
  };

  const presets = useMemo(
    () => [
      {
        value: toDatePreset(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)),
        label: t("DatePresetTomorrow"),
      },
      { value: toDatePreset(new Date(now)), label: t("DatePresetToday") },
      {
        value: toDatePreset(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)),
        label: t("DatePresetYesterday"),
      },
      {
        value: toDatePreset(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)),
        label: t("DatePresetLastWeek"),
      },
      {
        value: toDatePreset(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())),
        label: t("DatePresetLastMonth"),
      },
      {
        value: toDatePreset(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())),
        label: t("DatePresetLastYear"),
      },
    ],
    [now, t],
  );

  // Stable ref to the current presets array so `markActivePreset` can look up
  // a preset by its label text instead of by DOM index (which is unreliable).
  const presetsRef = useRef(presets);
  presetsRef.current = presets;

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
   * Adds `data-active` to the preset button whose label matches a known preset
   * with the currently selected value. Matching by label text is more robust
   * than by DOM index when multiple pickers are open simultaneously.
   * Runs after a short delay so Mantine's portal has time to mount the dropdown.
   */
  const markActivePreset = useCallback((current: string | null) => {
    setTimeout(() => {
      document.querySelectorAll<HTMLButtonElement>(".presetsButton").forEach((button) => {
        const labelText = button.textContent?.trim() ?? "";
        const isActive = presetsRef.current.some(
          (p) => p.label === labelText && p.value === current,
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
      valueFormat="YYYY-MM-DD"
      leftSection={<IconCalendar size={16} />}
      presets={presets}
      classNames={{
        presetsList: "presetsList",
        presetButton: "presetsButton",
        ...(classNames as Record<string, string> | undefined),
      }}
      {...props}
      popoverProps={{
        ...popoverProps,
        onOpen: () => {
          markActivePreset(valueRef.current);
          onDropdownOpen?.();
          (popoverProps as { onOpen?: () => void } | undefined)?.onOpen?.();
        },
      }}
      onChange={(val) => {
        const next = toNormalizedDateString(val as Date | string | null);
        valueRef.current = next;
        markActivePreset(next);
        onChange?.(val);
      }}
    />
  );
}
