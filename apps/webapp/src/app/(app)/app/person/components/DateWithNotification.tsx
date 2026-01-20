"use client";

import { Group, Checkbox, TextInput, Text, Loader } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconGift } from "@tabler/icons-react";
import { INPUT_MAX_LENGTHS } from "@/lib/config";

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
        <DatePickerInput
          placeholder={dateLabel}
          value={dateValue}
          onChange={(value) => {
            const date = value ? new Date(value) : null;
            onDateChange(date);
          }}
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
