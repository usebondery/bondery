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
import type { ImportantEvent, ImportantEventType } from "@bondery/types";
import { DatePickerWithPresets } from "../../../components/timeline/DatePickerWithPresets";
import {
  IMPORTANT_EVENT_NOTIFY_OPTIONS,
  IMPORTANT_EVENT_TYPE_OPTIONS,
  INPUT_MAX_LENGTHS,
  LIMITS,
} from "@/lib/config";

interface ImportantEventDraft {
  eventType: ImportantEventType | null;
  eventDate: Date | null;
  note: string;
  notifyDaysBefore: 1 | 3 | 7 | null;
}

interface ContactImportantDatesSectionProps {
  events: ImportantEvent[];
  personFirstName: string;
  savingField: string | null;
  onEventsChange: (events: ImportantEvent[]) => void;
  onSave: (events: ImportantEvent[]) => void;
}

export type EventTypeOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export interface ImportantEventRowCardProps {
  eventType: ImportantEventType | null;
  eventDate: Date | null;
  note: string;
  notifyDaysBefore: 1 | 3 | 7 | null;
  disabled: boolean;
  loading: boolean;
  typeOptions: EventTypeOption[];
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

function createDraftEvent(): ImportantEventDraft {
  return {
    eventType: null,
    eventDate: null,
    note: "",
    notifyDaysBefore: null,
  };
}

function formatEventDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseEventDate(date: string): Date | null {
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

function areEventsEqual(first: ImportantEvent[], second: ImportantEvent[]): boolean {
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
      firstEvent.eventType === secondEvent.eventType &&
      firstEvent.eventDate === secondEvent.eventDate &&
      (firstEvent.note ?? "") === (secondEvent.note ?? "") &&
      (firstEvent.notifyDaysBefore ?? null) === (secondEvent.notifyDaysBefore ?? null)
    );
  });
}

export function ImportantEventRowCard({
  eventType,
  eventDate,
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
}: ImportantEventRowCardProps) {
  return (
    <Card withBorder p="sm" radius="md">
      <Group gap="xs" align="center" wrap="nowrap">
        {leftAction}

        <DatePickerWithPresets
          placeholder={datePlaceholder}
          value={eventDate}
          onChange={(value) => onDateChange(normalizePickerDate(value as Date | string | null))}
          valueFormat="MMMM D, YYYY"
          leftSection={<IconCalendarEvent size={16} />}
          className="min-w-44"
          size="sm"
          disabled={disabled}
        />

        <Select
          value={eventType}
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
  events,
  personFirstName,
  savingField,
  onEventsChange,
  onSave,
}: ContactImportantDatesSectionProps) {
  const t = useTranslations("ContactImportantDates");

  const [localEvents, setLocalEvents] = useState<ImportantEvent[]>(events);
  const [draftEvent, setDraftEvent] = useState<ImportantEventDraft>(createDraftEvent());

  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  const typeOptions = IMPORTANT_EVENT_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: `${option.emoji} ${t(`Types.${option.value}`)}`,
  }));

  const getTypeOptionsFor = (currentType: ImportantEventType | null) =>
    typeOptions.map((option) => {
      const hasTypeAlready = localEvents.some((eventItem) => eventItem.eventType === option.value);
      const disableUniqueType =
        (option.value === "birthday" || option.value === "nameday") &&
        hasTypeAlready &&
        currentType !== option.value;

      return {
        ...option,
        disabled: disableUniqueType,
      };
    });

  const notifyOptions = IMPORTANT_EVENT_NOTIFY_OPTIONS.map((option) => ({
    value: option.value,
    label:
      option.value === "none"
        ? t("NotifyNone")
        : Number(option.value) === 1
          ? t("NotifyDayBefore", { count: Number(option.value) })
          : t("NotifyDaysBefore", { count: Number(option.value) }),
  }));

  const isLimitReached = localEvents.length >= LIMITS.maxImportantDates;

  const persistEvents = (nextEvents: ImportantEvent[]) => {
    if (areEventsEqual(nextEvents, localEvents)) {
      return;
    }

    setLocalEvents(nextEvents);
    onEventsChange(nextEvents);
    onSave(nextEvents);
  };

  const tryCreateDraftEvent = (nextDraftEvent: ImportantEventDraft) => {
    if (isLimitReached) {
      return;
    }

    if (!nextDraftEvent.eventDate || !nextDraftEvent.eventType) {
      return;
    }

    const formattedDate = formatEventDate(nextDraftEvent.eventDate);
    if (!formattedDate) {
      return;
    }

    if (
      (nextDraftEvent.eventType === "birthday" || nextDraftEvent.eventType === "nameday") &&
      localEvents.some((eventItem) => eventItem.eventType === nextDraftEvent.eventType)
    ) {
      notifications.show({
        color: "red",
        title: t("ErrorTitle"),
        message: t("UniqueTypeError", {
          type: t(`Types.${nextDraftEvent.eventType}`),
        }),
      });
      return;
    }

    const nextEvents: ImportantEvent[] = [
      ...localEvents,
      {
        id: crypto.randomUUID(),
        userId: "",
        personId: "",
        eventType: nextDraftEvent.eventType,
        eventDate: formattedDate,
        note: nextDraftEvent.note.trim() || null,
        notifyOn: null,
        notifyDaysBefore: nextDraftEvent.notifyDaysBefore,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    persistEvents(nextEvents);
    setDraftEvent(createDraftEvent());
  };

  const handleDraftDateSelect = (value: Date | null) => {
    const nextDraftEvent: ImportantEventDraft = {
      ...draftEvent,
      eventDate: value,
    };
    setDraftEvent(nextDraftEvent);
    tryCreateDraftEvent(nextDraftEvent);
  };

  const handleRemoveEvent = (index: number) => {
    const nextEvents = localEvents.filter((_, rowIndex) => rowIndex !== index);
    persistEvents(nextEvents);
  };

  const handleEventDateChange = (index: number, date: Date | null) => {
    const formattedDate = formatEventDate(date);
    if (!formattedDate) {
      return;
    }

    if (localEvents[index]?.eventDate === formattedDate) {
      return;
    }

    const nextEvents = [...localEvents];
    nextEvents[index] = {
      ...nextEvents[index],
      eventDate: formattedDate,
    };

    persistEvents(nextEvents);
  };

  const handleEventTypeChange = (index: number, eventType: ImportantEventType) => {
    if (localEvents[index]?.eventType === eventType) {
      return;
    }

    if (
      (eventType === "birthday" || eventType === "nameday") &&
      localEvents.some(
        (eventItem, rowIndex) => rowIndex !== index && eventItem.eventType === eventType,
      )
    ) {
      notifications.show({
        color: "red",
        title: t("ErrorTitle"),
        message: t("UniqueTypeError", {
          type: t(`Types.${eventType}`),
        }),
      });
      return;
    }

    const nextEvents = [...localEvents];
    nextEvents[index] = {
      ...nextEvents[index],
      eventType,
    };

    persistEvents(nextEvents);
  };

  const handleEventNotifyChange = (index: number, notifyValue: string | null) => {
    const parsedNotifyValue = parseNotifyValue(notifyValue);
    if ((localEvents[index]?.notifyDaysBefore ?? null) === parsedNotifyValue) {
      return;
    }

    const nextEvents = [...localEvents];
    nextEvents[index] = {
      ...nextEvents[index],
      notifyDaysBefore: parsedNotifyValue,
    };

    persistEvents(nextEvents);
  };

  const handleEventNoteChange = (index: number, note: string) => {
    if ((localEvents[index]?.note ?? "") === note) {
      return;
    }

    const nextEvents = [...localEvents];
    nextEvents[index] = {
      ...nextEvents[index],
      note,
    };

    setLocalEvents(nextEvents);
  };

  const handleSaveCurrentEvents = (index: number) => {
    const currentEvent = localEvents[index];
    if (!currentEvent) {
      return;
    }

    const originalEvent =
      events.find((eventItem) => eventItem.id === currentEvent.id) || events[index];

    if (!originalEvent) {
      onEventsChange(localEvents);
      onSave(localEvents);
      return;
    }

    if ((currentEvent.note ?? "") === (originalEvent.note ?? "")) {
      return;
    }

    onEventsChange(localEvents);
    onSave(localEvents);
  };

  return (
    <div>
      <Text size="sm" fw={600} mb="md">
        {t("Title")}
      </Text>

      <Stack gap="sm">
        {localEvents.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t("Empty")}
          </Text>
        ) : (
          localEvents.map((eventItem, index) => (
            <ImportantEventRowCard
              key={eventItem.id || index}
              eventType={eventItem.eventType}
              eventDate={parseEventDate(eventItem.eventDate)}
              note={eventItem.note || ""}
              notifyDaysBefore={eventItem.notifyDaysBefore}
              disabled={savingField === "importantEvents"}
              loading={savingField === "importantEvents"}
              typeOptions={getTypeOptionsFor(eventItem.eventType)}
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
              onDateChange={(value) => handleEventDateChange(index, value)}
              onTypeChange={(value) =>
                value ? handleEventTypeChange(index, value as ImportantEventType) : undefined
              }
              onNoteChange={(value) => handleEventNoteChange(index, value)}
              onNoteCommit={() => handleSaveCurrentEvents(index)}
              onNotifyChange={(value) => handleEventNotifyChange(index, value)}
              onDelete={() => handleRemoveEvent(index)}
            />
          ))
        )}

        {!isLimitReached ? (
          <ImportantEventRowCard
            eventType={draftEvent.eventType}
            eventDate={draftEvent.eventDate}
            note={draftEvent.note}
            notifyDaysBefore={draftEvent.notifyDaysBefore}
            disabled={savingField === "importantEvents"}
            loading={false}
            typeOptions={getTypeOptionsFor(draftEvent.eventType)}
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
                const nextDraftEvent: ImportantEventDraft = {
                  ...draftEvent,
                  eventType: (value as ImportantEventType) || null,
                };
                setDraftEvent(nextDraftEvent);
                tryCreateDraftEvent(nextDraftEvent);
              })()
            }
            onNoteChange={(value) =>
              setDraftEvent((previous) => ({
                ...previous,
                note: value,
              }))
            }
            onNotifyChange={(value) =>
              setDraftEvent((previous) => ({
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
