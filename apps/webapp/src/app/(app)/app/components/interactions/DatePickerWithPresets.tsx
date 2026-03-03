"use client";

import { DatePickerInput } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";
import type { ComponentProps } from "react";

type DatePickerWithPresetsProps = ComponentProps<typeof DatePickerInput>;

/**
 * Date picker with quick presets for timeline activities.
 */
export function DatePickerWithPresets(props: DatePickerWithPresetsProps) {
  const now = new Date();
  const toDatePreset = (value: Date) => {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, "0");
    const day = `${value.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const presets = [
    { value: toDatePreset(new Date(now)), label: "Today" },
    {
      value: toDatePreset(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)),
      label: "Tomorrow",
    },
    {
      value: toDatePreset(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)),
      label: "Yesterday",
    },
    {
      value: toDatePreset(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)),
      label: "Last week",
    },
  ];

  return (
    <DatePickerInput
      valueFormat="YYYY-MM-DD"
      leftSection={<IconCalendar size={16} />}
      presets={presets}
      {...props}
    />
  );
}
