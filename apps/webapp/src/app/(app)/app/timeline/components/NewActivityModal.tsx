"use client";

import { Button, TextInput, Select, Group, Stack, Textarea, Text, Avatar } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCalendarPlus, IconDeviceFloppy } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { modals } from "@mantine/modals";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact, Activity } from "@bondery/types";
import { revalidateInteractions } from "../../actions";
import {
  ModalFooter,
  PeopleMultiPickerInput,
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { DatePickerWithPresets } from "../../components/timeline/DatePickerWithPresets";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/activityTypes";
import { getActivityTypeConfig } from "@/lib/activityTypes";

interface OpenNewActivityModalParams {
  contacts: Contact[];
  activity?: Activity | null;
  initialParticipantIds?: string[];
  titleText?: string;
  t: (key: string) => string;
}

interface NewActivityFormProps {
  modalId: string;
  contacts: Contact[];
  activity: Activity | null;
  initialParticipantIds?: string[];
  t: (key: string) => string;
}

function toLocalDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function withFallbackTime(date: Date, fallback: Date): Date {
  const hasTime =
    date.getHours() !== 0 ||
    date.getMinutes() !== 0 ||
    date.getSeconds() !== 0 ||
    date.getMilliseconds() !== 0;

  if (hasTime) {
    return date;
  }

  const normalizedDate = new Date(date);
  normalizedDate.setHours(
    fallback.getHours(),
    fallback.getMinutes(),
    fallback.getSeconds(),
    fallback.getMilliseconds(),
  );
  return normalizedDate;
}

function NewActivityForm({
  modalId,
  contacts,
  activity,
  initialParticipantIds,
  t,
}: NewActivityFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEditMode = Boolean(activity?.id);

  useEffect(() => {
    modals.updateModal({
      modalId,
      closeOnEscape: !loading,
      closeOnClickOutside: !loading,
      withCloseButton: !loading,
    });
  }, [loading, modalId]);

  const resolvedInitialParticipantIds = useMemo(
    () =>
      (activity?.participants || initialParticipantIds || [])
        .map((participant: any) => (typeof participant === "string" ? participant : participant.id))
        .filter((id): id is string => Boolean(id)),
    [activity, initialParticipantIds],
  );

  const form = useForm({
    initialValues: {
      title: activity?.title || "",
      participantIds: resolvedInitialParticipantIds,
      date: toLocalDateInputValue(activity ? new Date(activity.date) : new Date()),
      type: activity?.type || "Call",
      description: activity?.description || "",
    },
    validate: {
      title: (value) => (value.trim().length > 0 ? null : t("TitleRequired")),
      participantIds: (value) => (value.length > 0 ? null : "Please select at least one contact"),
      date: (value) => (value ? null : "Please select a date"),
      type: (value) => (value ? null : "Please select a type"),
    },
  });

  const activityTypeSelectOptions = useMemo(
    () => ACTIVITY_TYPE_OPTIONS.map((type) => ({ value: type, label: type })),
    [],
  );

  const selectedTypeConfig = getActivityTypeConfig(form.values.type);

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);

    try {
      const dateValue = parseLocalDateInputValue(values.date);
      const fallbackTime = activity ? new Date(activity.date) : new Date();
      const normalizedDate = withFallbackTime(dateValue, fallbackTime);

      const endpoint = activity
        ? `${API_ROUTES.INTERACTIONS}/${activity.id}`
        : API_ROUTES.INTERACTIONS;
      const method = activity ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          date: normalizedDate.toISOString(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to create event");
      }

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: activity ? t("ActivityUpdated") : t("ActivityCreated"),
        }),
      );

      modals.close(modalId);
      await revalidateInteractions();
      router.refresh();
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to create event. Please try again.",
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label={t("Title")}
          placeholder={t("TitlePlaceholder")}
          {...form.getInputProps("title")}
        />

        <PeopleMultiPickerInput
          contacts={contacts}
          selectedIds={form.values.participantIds}
          onChange={(ids) => {
            form.setFieldValue("participantIds", ids);
            form.validateField("participantIds");
          }}
          placeholder={t("AddParticipantsPlaceholder")}
          noResultsLabel={t("NoContactsFound")}
          error={form.errors.participantIds}
          disabled={loading}
        />

        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={500}>
              {t("Note")}
            </Text>
          </Group>
          <Textarea
            placeholder={t("DescriptionPlaceholder")}
            minRows={6}
            autoFocus
            data-autofocus
            {...form.getInputProps("description")}
            styles={{
              input: {
                resize: "vertical",
              },
            }}
          />
        </Stack>

        <Group mt="md">
          <Group grow w="100%">
            <DatePickerWithPresets
              placeholder={t("PickDate")}
              {...form.getInputProps("date")}
              w="100%"
            />
            <Select
              data={activityTypeSelectOptions}
              placeholder={t("Type")}
              {...form.getInputProps("type")}
              w="100%"
              allowDeselect={false}
              searchable
              leftSection={
                <Avatar color={selectedTypeConfig.color} size={20} radius="xl">
                  {selectedTypeConfig.emoji}
                </Avatar>
              }
              renderOption={({ option }) => {
                const typeConfig = getActivityTypeConfig(option.value);
                return (
                  <Group gap="sm" wrap="nowrap">
                    <Avatar color={typeConfig.color} size={20} radius="xl">
                      {typeConfig.emoji}
                    </Avatar>
                    <Text size="sm">{option.label}</Text>
                  </Group>
                );
              }}
            />
          </Group>
        </Group>

        <ModalFooter
          cancelLabel={t("Cancel")}
          onCancel={() => modals.close(modalId)}
          cancelDisabled={loading}
          actionLabel={isEditMode ? t("SaveChanges") : t("AddActivity")}
          actionType="submit"
          actionLoading={loading}
          actionDisabled={loading}
          actionLeftSection={
            isEditMode ? <IconDeviceFloppy size={16} /> : <IconCalendarPlus size={16} />
          }
        />
      </Stack>
    </form>
  );
}

export function openNewActivityModal({
  contacts,
  activity = null,
  initialParticipantIds,
  titleText,
  t,
}: OpenNewActivityModalParams): void {
  const modalId = `activity-${Math.random().toString(36).slice(2)}`;
  const modalTitle = titleText || t("WhoAreYouMeeting");

  modals.open({
    modalId,
    title: <ModalTitle text={modalTitle} icon={<IconCalendarPlus size={24} />} />,
    size: "lg",
    children: (
      <NewActivityForm
        modalId={modalId}
        contacts={contacts}
        activity={activity}
        initialParticipantIds={initialParticipantIds}
        t={t}
      />
    ),
  });
}
