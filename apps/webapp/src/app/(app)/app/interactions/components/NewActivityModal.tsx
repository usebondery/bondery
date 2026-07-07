"use client";

import { Button, TextInput, Select, Group, Stack, Textarea, Text, Avatar } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCalendarPlus, IconCheck } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { modals } from "@mantine/modals";
import { interactionFormSchema, type Contact, type Activity } from "@bondery/schemas";
import { openAddContactModal } from "../../people/components/AddContactModal";
import { createModalId, useModalBlocking } from "@/lib/modals";
import {
  ModalFooter,
  PeopleMultiPickerInput,
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { DatePickerWithPresets } from "../../components/interactions/DatePickerWithPresets";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/activityTypes";
import { getActivityTypeConfig } from "@/lib/activityTypes";
import { useInteractionTypeLabel } from "@/lib/i18n/useInteractionTypeLabel";
import { captureEvent } from "@/lib/analytics/client";
import { DEBOUNCE_MS } from "@/lib/config";
import { searchContacts } from "@/lib/searchContacts";
import {
  useCreateInteractionMutation,
  useUpdateInteractionMutation,
} from "@/lib/query/hooks/useInteractions";

interface OpenNewActivityModalParams {
  contacts: Contact[];
  activity?: Activity | null;
  initialParticipantIds?: string[];
  onCreated?: (activityId: string) => void;
}

interface NewActivityFormProps {
  modalId: string;
  contacts: Contact[];
  activity: Activity | null;
  initialParticipantIds?: string[];
  onCreated?: (activityId: string) => void;
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

/**
 * Build a minimal Contact stub from a raw participant object returned by the
 * GET /interactions API. The API embeds participant data directly on each
 * activity so chips can resolve to a name even when the participant is not in
 * the caller's `contacts` prop.
 */
function buildParticipantSeed(p: unknown): Contact | null {
  if (!p || typeof p === "string") return null;
  const raw = p as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) return null;
  return {
    id,
    userId: "",
    firstName: (raw.firstName ?? "") as string,
    middleName: (raw.middleName ?? null) as string | null,
    lastName: (raw.lastName ?? null) as string | null,
    headline: null,
    location: null,
    notes: null,
    avatar: (raw.avatar ?? null) as string | null,
    lastInteraction: null,
    lastInteractionActivityId: null,
    keepFrequencyDays: null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "1970-01-01T00:00:00.000Z",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "1970-01-01T00:00:00.000Z",
    phones: null,
    emails: null,
    linkedin: null,
    instagram: null,
    whatsapp: null,
    facebook: null,
    website: null,
    signal: null,
    myself: null,
    language: null,
    timezone: null,
    gisPoint: null,
    latitude: null,
    longitude: null,
  };
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

function NewActivityModalTitle() {
  const t = useTranslations("InteractionsPage");
  return <ModalTitle text={t("WhoAreYouMeeting")} icon={<IconCalendarPlus size={24} />} />;
}

function NewActivityForm({
  modalId,
  contacts,
  activity,
  initialParticipantIds,
  onCreated,
}: NewActivityFormProps) {
  const t = useTranslations("InteractionsPage");
  const getInteractionTypeLabel = useInteractionTypeLabel();
  const createInteractionMutation = useCreateInteractionMutation();
  const updateInteractionMutation = useUpdateInteractionMutation(activity?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>(() => {
    if (!activity?.participants?.length) return contacts;
    // Seed the pool with participant data embedded in the activity so that chips
    // for already-selected contacts always resolve to a name, even when those
    // contacts aren't in the caller's `contacts` prop.
    const pool = new Map(contacts.map((c) => [c.id, c]));
    for (const p of activity.participants as unknown[]) {
      const seed = buildParticipantSeed(p);
      if (seed && !pool.has(seed.id)) pool.set(seed.id, seed);
    }
    return Array.from(pool.values());
  });
  const participantsInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = Boolean(activity?.id);

  useEffect(() => {
    // Merge incoming contacts into the pool rather than replacing it, so that
    // participant seeds added during initialization are not lost.
    setAvailableContacts((prev) => {
      const pool = new Map(prev.map((c) => [c.id, c]));
      for (const c of contacts) pool.set(c.id, c);
      return Array.from(pool.values());
    });
  }, [contacts]);

  useModalBlocking(modalId, loading);

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
    validate: schemaResolver(interactionFormSchema, { sync: true }),
  });

  const activityTypeSelectOptions = useMemo(
    () =>
      ACTIVITY_TYPE_OPTIONS.map((type) => ({
        value: type,
        label: getInteractionTypeLabel(type),
      })),
    [getInteractionTypeLabel],
  );

  const selectedTypeConfig = getActivityTypeConfig(form.values.type);

  const handleContactCreated = (createdContact: Contact) => {
    setAvailableContacts((currentContacts) => {
      if (currentContacts.some((contact) => contact.id === createdContact.id)) {
        return currentContacts;
      }

      return [...currentContacts, createdContact];
    });

    const nextParticipantIds = Array.from(
      new Set([...form.getValues().participantIds, createdContact.id]),
    );

    form.setFieldValue("participantIds", nextParticipantIds);
    form.validateField("participantIds");

    setTimeout(() => {
      participantsInputRef.current?.focus();
    }, 0);
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);

    try {
      const dateValue = parseLocalDateInputValue(values.date);
      const fallbackTime = activity ? new Date(activity.date) : new Date();
      const normalizedDate = withFallbackTime(dateValue, fallbackTime);

      const payload = {
        ...values,
        date: normalizedDate.toISOString(),
      };

      const data = activity
        ? await updateInteractionMutation.mutateAsync(payload)
        : await createInteractionMutation.mutateAsync(payload);

      captureEvent(activity ? "interaction_updated" : "interaction_created", {
        activity_type: values.type,
        participant_count: values.participantIds.length,
      });

      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description: activity ? t("ActivityUpdated") : t("ActivityCreated"),
        }),
      );

      modals.close(modalId);
      if (onCreated && !isEditMode && data.interaction?.id) {
        onCreated(data.interaction.id);
      }
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description:
            error instanceof Error ? error.message : t("CreateActivityFailed"),
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
            autoFocus
            data-autofocus
            {...form.getInputProps("title")}
          />

          <Stack gap={4}>
            <PeopleMultiPickerInput
              contacts={availableContacts}
              selectedIds={form.values.participantIds}
              onChange={(ids) => {
                form.setFieldValue("participantIds", ids);
                form.validateField("participantIds");
              }}
              onSearch={searchContacts}
              searchDebounceMs={DEBOUNCE_MS.contactPicker}
              placeholder={t("AddParticipantsPlaceholder")}
              noResultsLabel={t("NoContactsFound")}
              searchingLabel={t("SearchingLabel")}
              inputRef={participantsInputRef}
              error={form.errors.participantIds}
              disabled={loading}
            />

            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                openAddContactModal({ onCreated: handleContactCreated });
              }}
              disabled={loading}
              style={{ alignSelf: "flex-start", paddingLeft: 0 }}
            >
              {t("CreateNewPersonFallback")}
            </Button>
          </Stack>

          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="sm" fw={500}>
                {t("Note")}
              </Text>
            </Group>
            <Textarea
              placeholder={t("DescriptionPlaceholder")}
              minRows={6}
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
              isEditMode ? <IconCheck size={16} /> : <IconCalendarPlus size={16} />
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
  onCreated,
}: OpenNewActivityModalParams): void {
  const modalId = createModalId("activity");

  modals.open({
    modalId,
    title: <NewActivityModalTitle />,
    size: "lg",
    children: (
      <NewActivityForm
        modalId={modalId}
        contacts={contacts}
        activity={activity}
        initialParticipantIds={initialParticipantIds}
        onCreated={onCreated}
      />
    ),
  });
}
