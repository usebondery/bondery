"use client";

import { Group, Checkbox, TextInput, Text, Loader } from "@mantine/core";
import { IconGift } from "@tabler/icons-react";
import { INPUT_MAX_LENGTHS } from "@/lib/config";
import { DatePickerWithPresets } from "../../../components/timeline/DatePickerWithPresets";

interface DateWithNotificationProps {
  title: string;
  dateLabel?: string;
  nameLabel?: string;
  dateValue: Date | null;
  nameValue?: string;
  notifyValue: boolean;
  onDateChange: (date: Date | null) => void;
  onNameChange?: (name: string) => void;
  onNotifyChange: (notify: boolean) => void;
  showNameInput?: boolean;
  saving?: boolean;
  focusedField?: string | null;
  onFocus?: (field: string) => void;
  onBlur?: (field: string) => void;
  fieldPrefix?: string;
}

function normalizePickerDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const [year, month, day] = value.split("-").map(Number);
  if (year && month && day) {
    return new Date(year, month - 1, day);
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
}

export default function DateWithNotification({
  title,
  dateLabel = "Date",
  nameLabel = "Name",
  dateValue,
  nameValue = "",
  notifyValue,
  onDateChange,
  onNameChange,
  onNotifyChange,
  showNameInput = false,
  saving = false,
  focusedField,
  onFocus,
  onBlur,
  fieldPrefix = "",
}: DateWithNotificationProps) {
  const dateFieldName = fieldPrefix ? `${fieldPrefix}-date` : "date";
  const nameFieldName = fieldPrefix ? `${fieldPrefix}-name` : "name";

  return (
    <div>
      <Text size="sm" fw={600} mb="xs">
        {title}
      </Text>
      <Group gap="sm" align="flex-start">
        <DatePickerWithPresets
          placeholder={dateLabel}
          value={dateValue}
          onChange={(value) => onDateChange(normalizePickerDate(value as Date | string | null))}
          valueFormat="MMMM D, YYYY"
          maxDate={new Date()}
          leftSection={<IconGift size={18} />}
          style={{ flex: showNameInput ? 1 : 2 }}
          rightSection={saving && focusedField === dateFieldName ? <Loader size="xs" /> : null}
          onFocus={() => onFocus?.(dateFieldName)}
          onBlur={() => onBlur?.(dateFieldName)}
        />
        {showNameInput && (
          <TextInput
            placeholder={nameLabel}
            value={nameValue}
            onChange={(e) => onNameChange?.(e.target.value)}
            maxLength={INPUT_MAX_LENGTHS.dateName}
            style={{ flex: 1 }}
            rightSection={
              saving && focusedField === nameFieldName ? (
                <Loader size="xs" />
              ) : focusedField === nameFieldName ? (
                <Text size="10px" c="dimmed">
                  {nameValue.length}/{INPUT_MAX_LENGTHS.dateName}
                </Text>
              ) : null
            }
            onFocus={() => onFocus?.(nameFieldName)}
            onBlur={() => onBlur?.(nameFieldName)}
          />
        )}
        <Checkbox
          label="Notify me"
          checked={notifyValue}
          onChange={(e) => onNotifyChange(e.currentTarget.checked)}
          disabled={!dateValue}
        />
      </Group>
    </div>
  );
}
