"use client";

import type { ImportantDateType } from "@bondery/schemas";
import { ActionIcon, Card, Group, Loader, Select, TextInput, Tooltip } from "@mantine/core";
import { IconBell, IconCalendarEvent, IconTrash } from "@tabler/icons-react";
import { DatePickerWithPresets } from "../../../../components/interactions/DatePickerWithPresets";
import { getDateFormat, normalizePickerDate } from "../../utils/importantDateUtils";

export type DateTypeOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export interface ImportantDateRowCardProps {
  date: Date | null;
  datePlaceholder: string;
  deleteLabel: string;
  disabled: boolean;
  disabledBirthdateTypeHint: string;
  disabledNamedateTypeHint: string;
  disabledTypeHint: string;
  hideDeleteIcon?: boolean;
  hideNotifySelect?: boolean;
  leftAction?: React.ReactNode;
  loading: boolean;
  note: string;
  noteMaxLength: number;
  notePlaceholder: string;
  notifyDaysBefore: number | null;
  notifyOptions: Array<{ value: string; label: string }>;
  onDateChange: (value: Date | null) => void;
  onDelete: () => void;
  onNoteChange: (value: string) => void;
  onNoteCommit?: () => void;
  onNotifyChange: (value: string | null) => void;
  onTypeChange: (value: string | null) => void;
  type: ImportantDateType | null;
  typeOptions: DateTypeOption[];
  typePlaceholder: string;
}

export function ImportantDateRowCard({
  type,
  date,
  note,
  notifyDaysBefore,
  disabled,
  loading,
  typeOptions,
  notifyOptions,
  disabledTypeHint,
  disabledBirthdateTypeHint,
  disabledNamedateTypeHint,
  noteMaxLength,
  datePlaceholder,
  notePlaceholder,
  typePlaceholder,
  deleteLabel,
  onDateChange,
  onTypeChange,
  onNoteChange,
  onNoteCommit,
  onNotifyChange,
  onDelete,
  hideDeleteIcon = false,
  hideNotifySelect = false,
  leftAction,
}: ImportantDateRowCardProps) {
  const dateFormat = getDateFormat(date);

  return (
    <Card p="sm" radius="md" shadow="none" withBorder>
      <Group align="center" gap="xs" wrap="nowrap">
        {leftAction}

        <DatePickerWithPresets
          className="min-w-44"
          disabled={disabled}
          leftSection={<IconCalendarEvent size={16} />}
          onChange={(value) => onDateChange(normalizePickerDate(value as Date | string | null))}
          placeholder={datePlaceholder}
          size="sm"
          value={date}
          valueFormat={dateFormat}
        />

        <Select
          className="max-w-40"
          data={typeOptions}
          disabled={disabled}
          onChange={onTypeChange}
          placeholder={typePlaceholder}
          renderOption={({ option }) => {
            if (!option.disabled) {
              return option.label;
            }

            const disabledHint =
              option.value === "birthday"
                ? disabledBirthdateTypeHint
                : option.value === "nameday"
                  ? disabledNamedateTypeHint
                  : disabledTypeHint;

            return (
              <Tooltip label={disabledHint} withArrow>
                <span>{option.label}</span>
              </Tooltip>
            );
          }}
          size="sm"
          value={type}
        />

        <TextInput
          disabled={disabled}
          maxLength={noteMaxLength}
          onBlur={onNoteCommit}
          onChange={(event) => onNoteChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && onNoteCommit) {
              event.preventDefault();
              onNoteCommit();
            }
          }}
          placeholder={notePlaceholder}
          rightSection={loading ? <Loader size="xs" /> : null}
          size="sm"
          style={{ flex: 1 }}
          value={note}
        />

        {!hideNotifySelect ? (
          <Select
            className="max-w-52"
            data={notifyOptions}
            disabled={disabled}
            leftSection={<IconBell size={16} />}
            onChange={onNotifyChange}
            size="sm"
            value={notifyDaysBefore ? String(notifyDaysBefore) : "none"}
          />
        ) : null}

        {!hideDeleteIcon ? (
          <ActionIcon
            aria-label={deleteLabel}
            color="red"
            disabled={disabled}
            ml="auto"
            onClick={onDelete}
            variant="subtle"
          >
            <IconTrash size={16} />
          </ActionIcon>
        ) : null}
      </Group>
    </Card>
  );
}
