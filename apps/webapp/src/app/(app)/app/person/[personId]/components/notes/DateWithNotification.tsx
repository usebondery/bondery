"use client";

import { Checkbox, Group, Loader, Text, TextInput } from "@mantine/core";
import { IconGift } from "@tabler/icons-react";
import { DatePickerWithPresets } from "@/components/interactions/DatePickerWithPresets";
import { useContactImportantDatesTranslations } from "@/lib/i18n/generated/hooks";
import { INPUT_MAX_LENGTHS } from "@/lib/platform/config";

interface DateWithNotificationProps {
  dateLabel?: string;
  dateValue: Date | null;
  fieldPrefix?: string;
  focusedField?: string | null;
  nameLabel?: string;
  nameValue?: string;
  notifyLabel?: string;
  notifyValue: boolean;
  onBlur?: (field: string) => void;
  onDateChange: (date: Date | null) => void;
  onFocus?: (field: string) => void;
  onNameChange?: (name: string) => void;
  onNotifyChange: (notify: boolean) => void;
  saving?: boolean;
  showNameInput?: boolean;
  title: string;
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
  notifyLabel,
}: DateWithNotificationProps) {
  const t = useContactImportantDatesTranslations();
  const dateFieldName = fieldPrefix ? `${fieldPrefix}-date` : "date";
  const nameFieldName = fieldPrefix ? `${fieldPrefix}-name` : "name";

  return (
    <div>
      <Text fw={600} mb="xs" size="sm">
        {title}
      </Text>
      <Group align="flex-start" gap="sm">
        <DatePickerWithPresets
          leftSection={<IconGift size={18} />}
          maxDate={new Date()}
          onBlur={() => onBlur?.(dateFieldName)}
          onChange={(value) => onDateChange(normalizePickerDate(value as Date | string | null))}
          onFocus={() => onFocus?.(dateFieldName)}
          placeholder={dateLabel}
          rightSection={saving && focusedField === dateFieldName ? <Loader size="xs" /> : null}
          style={{ flex: showNameInput ? 1 : 2 }}
          value={dateValue}
          valueFormat="MMMM D, YYYY"
        />
        {showNameInput && (
          <TextInput
            maxLength={INPUT_MAX_LENGTHS.dateName}
            onBlur={() => onBlur?.(nameFieldName)}
            onChange={(e) => onNameChange?.(e.target.value)}
            onFocus={() => onFocus?.(nameFieldName)}
            placeholder={nameLabel}
            rightSection={
              saving && focusedField === nameFieldName ? (
                <Loader size="xs" />
              ) : focusedField === nameFieldName ? (
                <Text c="dimmed" size="10px">
                  {nameValue.length}/{INPUT_MAX_LENGTHS.dateName}
                </Text>
              ) : null
            }
            style={{ flex: 1 }}
            value={nameValue}
          />
        )}
        <Checkbox
          checked={notifyValue}
          disabled={!dateValue}
          label={notifyLabel ?? t("NotifyMe")}
          onChange={(e) => onNotifyChange(e.currentTarget.checked)}
        />
      </Group>
    </div>
  );
}
