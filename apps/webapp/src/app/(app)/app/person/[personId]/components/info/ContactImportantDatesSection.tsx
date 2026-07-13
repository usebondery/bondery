"use client";

import { errorNotificationTemplate } from "@bondery/mantine-next";
import {
  CONTACT_FIELD_MAX_LENGTHS,
  CONTACT_LIMITS,
  firstZodErrorMessage,
  type ImportantDate,
  type ImportantDateType,
  replaceImportantDatesSchema,
} from "@bondery/schemas";
import { ActionIcon, Stack, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useContactImportantDatesTranslations } from "@/lib/i18n/generated/hooks";
import { IMPORTANT_DATE_NOTIFY_OPTIONS, IMPORTANT_DATE_TYPE_OPTIONS } from "@/lib/platform/config";
import {
  areDatesEqual,
  createDraftDate,
  formatDateString,
  type ImportantDateDraft,
  parseDateString,
  parseNotifyValue,
} from "../../utils/importantDateUtils";
import { ImportantDateRowCard } from "./ImportantDateRowCard";

interface ContactImportantDatesSectionProps {
  dates: ImportantDate[];
  onDatesChange: (dates: ImportantDate[]) => void;
  onSave: (dates: ImportantDate[]) => void;
  personFirstName: string;
  savingField: string | null;
}

export function ContactImportantDatesSection({
  dates,
  personFirstName,
  savingField,
  onDatesChange,
  onSave,
}: ContactImportantDatesSectionProps) {
  const t = useContactImportantDatesTranslations();

  const [localDates, setLocalDates] = useState<ImportantDate[]>(dates);
  const [draftDate, setDraftDate] = useState<ImportantDateDraft>(createDraftDate());

  useEffect(() => {
    setLocalDates(dates);
  }, [dates]);

  const typeOptions = IMPORTANT_DATE_TYPE_OPTIONS.map((option) => ({
    label: `${option.emoji} ${t(`Types.${option.value}`)}`,
    value: option.value,
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
    label:
      option.value === "none"
        ? t("NotifyNone")
        : Number(option.value) === 1
          ? t("NotifyDayBefore", { count: Number(option.value) })
          : t("NotifyDaysBefore", { count: Number(option.value) }),
    value: option.value,
  }));

  const isLimitReached = localDates.length >= CONTACT_LIMITS.maxImportantDates;

  const isValidDatesPayload = (nextDates: ImportantDate[]) => {
    const parsed = replaceImportantDatesSchema.safeParse(nextDates);
    if (!parsed.success) {
      notifications.show(
        errorNotificationTemplate({
          description: firstZodErrorMessage(parsed.error),
          title: t("ErrorTitle"),
        }),
      );
      return false;
    }

    return true;
  };

  const persistDates = (nextDates: ImportantDate[]) => {
    if (areDatesEqual(nextDates, localDates)) {
      return;
    }

    if (!isValidDatesPayload(nextDates)) {
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
          description: t("UniqueTypeError", {
            type: t(`Types.${nextDraft.type}`),
          }),
          title: t("ErrorTitle"),
        }),
      });
      return;
    }

    const nextDates: ImportantDate[] = [
      ...localDates,
      {
        createdAt: new Date().toISOString(),
        date: formattedDate,
        id: crypto.randomUUID(),
        note: nextDraft.note.trim() || null,
        notifyDaysBefore: nextDraft.notifyDaysBefore,
        notifyOn: null,
        personId: "",
        type: nextDraft.type,
        updatedAt: new Date().toISOString(),
        userId: "",
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
          description: t("UniqueTypeError", {
            type: t(`Types.${dateType}`),
          }),
          title: t("ErrorTitle"),
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
      if (!isValidDatesPayload(localDates)) {
        return;
      }
      onDatesChange(localDates);
      onSave(localDates);
      return;
    }

    if ((currentDate.note ?? "") === (originalDate.note ?? "")) {
      return;
    }

    if (!isValidDatesPayload(localDates)) {
      return;
    }

    onDatesChange(localDates);
    onSave(localDates);
  };

  const rowCardSharedProps = {
    datePlaceholder: t("DatePlaceholder"),
    deleteLabel: t("DeleteAction"),
    disabledBirthdateTypeHint: t("TypeDisabledBirthdateHint", { firstName: personFirstName }),
    disabledNamedateTypeHint: t("TypeDisabledNamedateHint", { firstName: personFirstName }),
    disabledTypeHint: t("TypeDisabledHint", { firstName: personFirstName }),
    noteMaxLength: CONTACT_FIELD_MAX_LENGTHS.dateName,
    notePlaceholder: t("NotePlaceholder"),
    notifyOptions,
    typePlaceholder: t("TypePlaceholder"),
  };

  return (
    <div>
      <Text fw={600} mb="md" size="sm">
        {t("Title")}
      </Text>

      <Stack gap="sm">
        {localDates.length === 0
          ? null
          : localDates.map((dateItem, index) => (
              <ImportantDateRowCard
                {...rowCardSharedProps}
                date={parseDateString(dateItem.date)}
                disabled={savingField === "importantDates"}
                key={dateItem.id || index}
                loading={savingField === "importantDates"}
                note={dateItem.note || ""}
                notifyDaysBefore={dateItem.notifyDaysBefore}
                onDateChange={(value) => handleDateChange(index, value)}
                onDelete={() => handleRemoveDate(index)}
                onNoteChange={(value) => handleNoteChange(index, value)}
                onNoteCommit={() => handleSaveCurrentDates(index)}
                onNotifyChange={(value) => handleNotifyChange(index, value)}
                onTypeChange={(value) =>
                  value ? handleTypeChange(index, value as ImportantDateType) : undefined
                }
                type={dateItem.type}
                typeOptions={getTypeOptionsFor(dateItem.type)}
              />
            ))}

        {!isLimitReached ? (
          <ImportantDateRowCard
            {...rowCardSharedProps}
            date={draftDate.date}
            disabled={savingField === "importantDates"}
            hideDeleteIcon
            leftAction={
              <Tooltip label={t("AddHint")} withArrow>
                <ActionIcon aria-label={t("AddAction")} color="green" variant="light">
                  <IconPlus size={16} />
                </ActionIcon>
              </Tooltip>
            }
            loading={false}
            note={draftDate.note}
            notifyDaysBefore={draftDate.notifyDaysBefore}
            onDateChange={handleDraftDateSelect}
            onDelete={() => undefined}
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
            onTypeChange={(value) => {
              const nextDraft: ImportantDateDraft = {
                ...draftDate,
                type: (value as ImportantDateType) || null,
              };
              setDraftDate(nextDraft);
              tryCreateDraftDate(nextDraft);
            }}
            type={draftDate.type}
            typeOptions={getTypeOptionsFor(draftDate.type)}
          />
        ) : null}
      </Stack>
    </div>
  );
}

// Re-export for consumers that imported from this module
export type { DateTypeOption, ImportantDateRowCardProps } from "./ImportantDateRowCard";
export { ImportantDateRowCard } from "./ImportantDateRowCard";
