"use client";

import {
  ActionIcon,
  Card,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBell, IconCalendarEvent, IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ImportantDate, ImportantDateType } from "@bondery/types";
import { errorNotificationTemplate } from "@bondery/mantine-next";
import { DatePickerWithPresets } from "../../../components/interactions/DatePickerWithPresets";
import {
  IMPORTANT_DATE_NOTIFY_OPTIONS,
  IMPORTANT_DATE_TYPE_OPTIONS,
  INPUT_MAX_LENGTHS,
  LIMITS,
} from "@/lib/config";

interface ImportantDateDraft {
  type: ImportantDateType | null;
  date: Date | null;
  note: string;
  notifyDaysBefore: 1 | 3 | 7 | null;
}

interface ContactImportantDatesSectionProps {
  dates: ImportantDate[];
  personFirstName: string;
  savingField: string | null;
  onDatesChange: (dates: ImportantDate[]) => void;
  onSave: (dates: ImportantDate[]) => void;
}

export type DateTypeOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export interface ImportantDateRowCardProps {
  type: ImportantDateType | null;
  date: Date | null;
  note: string;
  notifyDaysBefore: 1 | 3 | 7 | null;
  disabled: boolean;
  loading: boolean;
  typeOptions: DateTypeOption[];
  notifyOptions: Array<{ value: string; label: string }>;
  disabledTypeHint: string;
  disabledBirthdateTypeHint: string;
  disabledNamedateTypeHint: string;
  noteMaxLength: number;
  datePlaceholder: string;
  notePlaceholder: string;
  typePlaceholder: string;
  deleteLabel: string;
  onDateChange: (value: Date | null) => void;
  onTypeChange: (value: string | null) => void;
  onNoteChange: (value: string) => void;
  onNoteCommit?: () => void;
  onNotifyChange: (value: string | null) => void;
  onDelete: () => void;
  hideDeleteIcon?: boolean;
  hideNotifySelect?: boolean;
  leftAction?: React.ReactNode;
}

function createDraftDate(): ImportantDateDraft {
  return {
    type: null,
    date: null,
    note: "",
    notifyDaysBefore: null,
  };
}

function formatDateString(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateString(date: string): Date | null {
  if (!date) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
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

function parseNotifyValue(value: string | null): 1 | 3 | 7 | null {
  if (value === "1" || value === "3" || value === "7") {
    return Number(value) as 1 | 3 | 7;
  }

  return null;
}

function areDatesEqual(first: ImportantDate[], second: ImportantDate[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((firstEvent, index) => {
    const secondEvent = second[index];
    if (!secondEvent) {
      return false;
    }

    return (
      firstEvent.id === secondEvent.id &&
      firstEvent.type === secondEvent.type &&
      firstEvent.date === secondEvent.date &&
      (firstEvent.note ?? "") === (secondEvent.note ?? "") &&
      (firstEvent.notifyDaysBefore ?? null) === (secondEvent.notifyDaysBefore ?? null)
    );
  });
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
  return (
    <Card withBorder shadow="none" p="sm" radius="md">
      <Group gap="xs" align="center" wrap="nowrap">
        {leftAction}

        <DatePickerWithPresets
          placeholder={datePlaceholder}
          value={date}
          onChange={(value) => onDateChange(normalizePickerDate(value as Date | string | null))}
          valueFormat="MMMM D, YYYY"
          leftSection={<IconCalendarEvent size={16} />}
          className="min-w-44"
          size="sm"
          disabled={disabled}
        />

        <Select
          value={type}
          onChange={onTypeChange}
          data={typeOptions}
          placeholder={typePlaceholder}
          size="sm"
          className="max-w-40"
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
          disabled={disabled}
        />

        <TextInput
          placeholder={notePlaceholder}
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          onBlur={onNoteCommit}
          onKeyDown={(event) => {
            if (event.key === "Enter" && onNoteCommit) {
              event.preventDefault();
              onNoteCommit();
            }
          }}
          maxLength={noteMaxLength}
          style={{ flex: 1 }}
          size="sm"
          disabled={disabled}
          rightSection={loading ? <Loader size="xs" /> : null}
        />

        {!hideNotifySelect ? (
          <Select
            value={notifyDaysBefore ? String(notifyDaysBefore) : "none"}
            onChange={onNotifyChange}
            data={notifyOptions}
            leftSection={<IconBell size={16} />}
            size="sm"
            className="max-w-52"
            disabled={disabled}
          />
        ) : null}

        {!hideDeleteIcon ? (
          <ActionIcon
            ml="auto"
            color="red"
            variant="subtle"
            disabled={disabled}
            onClick={onDelete}
            aria-label={deleteLabel}
          >
            <IconTrash size={16} />
          </ActionIcon>
        ) : null}
      </Group>
    </Card>
  );
}

export function ContactImportantDatesSection({
  dates,
  personFirstName,
  savingField,
  onDatesChange,
  onSave,
}: ContactImportantDatesSectionProps) {
  const t = useTranslations("ContactImportantDates");

  const [localDates, setLocalDates] = useState<ImportantDate[]>(dates);
  const [draftDate, setDraftDate] = useState<ImportantDateDraft>(createDraftDate());

  useEffect(() => {
    setLocalDates(dates);
  }, [dates]);

  const typeOptions = IMPORTANT_DATE_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: `${option.emoji} ${t(`Types.${option.value}`)}`,
  }));

  const getTypeOptionsFor = (currentType: ImportantDateType | null) =>
    typeOptions.map((option) => {
      const hasTypeAlready = localDates.some((dateItem) => dateItem.type === option.value);
      const disableUniqueType =
        (option.value === "birthday" || option.value === "nameday") &&
        hasTypeAlready &&
        currentType !== option.value;

      return {
        ...option,
        disabled: disableUniqueType,
      };
    });

  const notifyOptions = IMPORTANT_DATE_NOTIFY_OPTIONS.map((option) => ({
    value: option.value,
    label:
      option.value === "none"
        ? t("NotifyNone")
        : Number(option.value) === 1
          ? t("NotifyDayBefore", { count: Number(option.value) })
          : t("NotifyDaysBefore", { count: Number(option.value) }),
  }));

  const isLimitReached = localDates.length >= LIMITS.maxImportantDates;

  const persistDates = (nextDates: ImportantDate[]) => {
    if (areDatesEqual(nextDates, localDates)) {
      return;
    }

    setLocalDates(nextDates);
    onDatesChange(nextDates);
    onSave(nextDates);
  };

  const tryCreateDraftDate = (nextDraft: ImportantDateDraft) => {
    if (isLimitReached) {
      return;
    }

    if (!nextDraft.date || !nextDraft.type) {
      return;
    }

    const formattedDate = formatDateString(nextDraft.date);
    if (!formattedDate) {
      return;
    }

    if (
      (nextDraft.type === "birthday" || nextDraft.type === "nameday") &&
      localDates.some((dateItem) => dateItem.type === nextDraft.type)
    ) {
      notifications.show({
        ...errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: t("UniqueTypeError", {
            type: t(`Types.${nextDraft.type}`),
          }),
        }),
      });
      return;
    }

    const nextDates: ImportantDate[] = [
      ...localDates,
      {
        id: crypto.randomUUID(),
        userId: "",
        personId: "",
        type: nextDraft.type,
        date: formattedDate,
        note: nextDraft.note.trim() || null,
        notifyOn: null,
        notifyDaysBefore: nextDraft.notifyDaysBefore,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    persistDates(nextDates);
    setDraftDate(createDraftDate());
  };

  const handleDraftDateSelect = (value: Date | null) => {
    const nextDraft: ImportantDateDraft = {
      ...draftDate,
      date: value,
    };
    setDraftDate(nextDraft);
    tryCreateDraftDate(nextDraft);
  };

  const handleRemoveDate = (index: number) => {
    const nextDates = localDates.filter((_, rowIndex) => rowIndex !== index);
    persistDates(nextDates);
  };

  const handleDateChange = (index: number, value: Date | null) => {
    const formattedDate = formatDateString(value);
    if (!formattedDate) {
      return;
    }

    if (localDates[index]?.date === formattedDate) {
      return;
    }

    const nextDates = [...localDates];
    nextDates[index] = {
      ...nextDates[index],
      date: formattedDate,
    };

    persistDates(nextDates);
  };

  const handleTypeChange = (index: number, dateType: ImportantDateType) => {
    if (localDates[index]?.type === dateType) {
      return;
    }

    if (
      (dateType === "birthday" || dateType === "nameday") &&
      localDates.some((dateItem, rowIndex) => rowIndex !== index && dateItem.type === dateType)
    ) {
      notifications.show({
        ...errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: t("UniqueTypeError", {
            type: t(`Types.${dateType}`),
          }),
        }),
      });
      return;
    }

    const nextDates = [...localDates];
    nextDates[index] = {
      ...nextDates[index],
      type: dateType,
    };

    persistDates(nextDates);
  };

  const handleNotifyChange = (index: number, notifyValue: string | null) => {
    const parsedNotifyValue = parseNotifyValue(notifyValue);
    if ((localDates[index]?.notifyDaysBefore ?? null) === parsedNotifyValue) {
      return;
    }

    const nextDates = [...localDates];
    nextDates[index] = {
      ...nextDates[index],
      notifyDaysBefore: parsedNotifyValue,
    };

    persistDates(nextDates);
  };

  const handleNoteChange = (index: number, note: string) => {
    if ((localDates[index]?.note ?? "") === note) {
      return;
    }

    const nextDates = [...localDates];
    nextDates[index] = {
      ...nextDates[index],
      note,
    };

    setLocalDates(nextDates);
  };

  const handleSaveCurrentDates = (index: number) => {
    const currentDate = localDates[index];
    if (!currentDate) {
      return;
    }

    const originalDate = dates.find((dateItem) => dateItem.id === currentDate.id) || dates[index];

    if (!originalDate) {
      onDatesChange(localDates);
      onSave(localDates);
      return;
    }

    if ((currentDate.note ?? "") === (originalDate.note ?? "")) {
      return;
    }

    onDatesChange(localDates);
    onSave(localDates);
  };

  return (
    <div>
      <Text size="sm" fw={600} mb="md">
        {t("Title")}
      </Text>

      <Stack gap="sm">
        {localDates.length === 0
          ? null
          : localDates.map((dateItem, index) => (
              <ImportantDateRowCard
                key={dateItem.id || index}
                type={dateItem.type}
                date={parseDateString(dateItem.date)}
                note={dateItem.note || ""}
                notifyDaysBefore={dateItem.notifyDaysBefore}
                disabled={savingField === "importantDates"}
                loading={savingField === "importantDates"}
                typeOptions={getTypeOptionsFor(dateItem.type)}
                notifyOptions={notifyOptions}
                disabledTypeHint={t("TypeDisabledHint", { firstName: personFirstName })}
                disabledBirthdateTypeHint={t("TypeDisabledBirthdateHint", {
                  firstName: personFirstName,
                })}
                disabledNamedateTypeHint={t("TypeDisabledNamedateHint", {
                  firstName: personFirstName,
                })}
                noteMaxLength={INPUT_MAX_LENGTHS.dateName}
                datePlaceholder={t("DatePlaceholder")}
                notePlaceholder={t("NotePlaceholder")}
                typePlaceholder={t("TypePlaceholder")}
                deleteLabel={t("DeleteAction")}
                onDateChange={(value) => handleDateChange(index, value)}
                onTypeChange={(value) =>
                  value ? handleTypeChange(index, value as ImportantDateType) : undefined
                }
                onNoteChange={(value) => handleNoteChange(index, value)}
                onNoteCommit={() => handleSaveCurrentDates(index)}
                onNotifyChange={(value) => handleNotifyChange(index, value)}
                onDelete={() => handleRemoveDate(index)}
              />
            ))}

        {!isLimitReached ? (
          <ImportantDateRowCard
            type={draftDate.type}
            date={draftDate.date}
            note={draftDate.note}
            notifyDaysBefore={draftDate.notifyDaysBefore}
            disabled={savingField === "importantDates"}
            loading={false}
            typeOptions={getTypeOptionsFor(draftDate.type)}
            notifyOptions={notifyOptions}
            disabledTypeHint={t("TypeDisabledHint", { firstName: personFirstName })}
            disabledBirthdateTypeHint={t("TypeDisabledBirthdateHint", {
              firstName: personFirstName,
            })}
            disabledNamedateTypeHint={t("TypeDisabledNamedateHint", {
              firstName: personFirstName,
            })}
            noteMaxLength={INPUT_MAX_LENGTHS.dateName}
            datePlaceholder={t("DatePlaceholder")}
            notePlaceholder={t("NotePlaceholder")}
            typePlaceholder={t("TypePlaceholder")}
            deleteLabel={t("DeleteAction")}
            onDateChange={handleDraftDateSelect}
            onTypeChange={(value) =>
              (() => {
                const nextDraft: ImportantDateDraft = {
                  ...draftDate,
                  type: (value as ImportantDateType) || null,
                };
                setDraftDate(nextDraft);
                tryCreateDraftDate(nextDraft);
              })()
            }
            onNoteChange={(value) =>
              setDraftDate((previous) => ({
                ...previous,
                note: value,
              }))
            }
            onNotifyChange={(value) =>
              setDraftDate((previous) => ({
                ...previous,
                notifyDaysBefore: parseNotifyValue(value),
              }))
            }
            onDelete={() => undefined}
            hideDeleteIcon
            leftAction={
              <Tooltip label={t("AddHint")} withArrow>
                <ActionIcon variant="light" color="green" aria-label={t("AddAction")}>
                  <IconPlus size={16} />
                </ActionIcon>
              </Tooltip>
            }
          />
        ) : null}
      </Stack>
    </div>
  );
}
