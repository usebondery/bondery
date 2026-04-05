"use client";

import {
  Button,
  TextInput,
  Select,
  Group,
  Stack,
  Textarea,
  Text,
  Avatar,
  Modal,
  getDefaultZIndex,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCalendarPlus, IconCheck, IconUserPlus } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { modals } from "@mantine/modals";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact, Activity } from "@bondery/types";
import { revalidateInteractions } from "../../actions";
import { AddContactForm } from "../../people/components/AddContactModal";
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
import { captureEvent } from "@/lib/analytics/client";
import { DEBOUNCE_MS } from "@/lib/config";
import { searchContacts } from "@/lib/searchContacts";

type ModalTranslationsFn = (key: string, values?: Record<string, string | number>) => string;

interface OpenNewActivityModalParams {
  contacts: Contact[];
  activity?: Activity | null;
  initialParticipantIds?: string[];
  titleText?: string;
  onCreated?: (activityId: string) => void;
  t: ModalTranslationsFn;
}

interface NewActivityFormProps {
  modalId: string;
  contacts: Contact[];
  activity: Activity | null;
  initialParticipantIds?: string[];
  onCreated?: (activityId: string) => void;
  t: ModalTranslationsFn;
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
 * GET /interactions API. The API embeds participant data (snake_case) directly
 * on each activity so that chips can resolve to a name even when the participant
 * is not present in the caller's `contacts` prop (e.g. contacts are paginated,
 * or the modal was opened from a narrow contacts subset like PersonInteractionsSection).
 */
function buildParticipantSeed(p: unknown): Contact | null {
  if (!p || typeof p === "string") return null;
  const raw = p as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) return null;
  return {
    id,
    userId: "",
    firstName: (raw.firstName ?? raw.first_name ?? "") as string,
    middleName: (raw.middleName ?? raw.middle_name ?? null) as string | null,
    lastName: (raw.lastName ?? raw.last_name ?? null) as string | null,
    headline: null,
    location: null,
    notes: null,
    avatar: (raw.avatar ?? null) as string | null,
    lastInteraction: null,
    lastInteractionActivityId: null,
    keepFrequencyDays: null,
    createdAt: (raw.updated_at ?? raw.updatedAt ?? "") as string,
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

function NewActivityForm({
  modalId,
  contacts,
  activity,
  initialParticipantIds,
  onCreated,
  t,
}: NewActivityFormProps) {
  const router = useRouter();
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
  const [createPersonOpened, setCreatePersonOpened] = useState(false);
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
        throw new Error(errorData.error || errorData.message || "Failed to create activity");
      }

      const data = (await res.json()) as { id: string };

      captureEvent(activity ? "interaction_updated" : "interaction_created", {
        activity_type: values.type,
        participant_count: values.participantIds.length,
      });

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: activity ? t("ActivityUpdated") : t("ActivityCreated"),
        }),
      );

      modals.close(modalId);
      await revalidateInteractions();
      if (onCreated && !isEditMode) {
        onCreated(data.id);
      } else {
        router.refresh();
      }
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to create activity. Please try again.",
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
              searchingLabel="Searching…"
              inputRef={participantsInputRef}
              error={form.errors.participantIds}
              disabled={loading}
            />

            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                setCreatePersonOpened(true);
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

      <Modal
        opened={createPersonOpened}
        onClose={() => setCreatePersonOpened(false)}
        title={<ModalTitle text="Create person" icon={<IconUserPlus size={24} />} />}
        trapFocus
        closeOnEscape
        closeOnClickOutside
        zIndex={getDefaultZIndex("modal") + 2}
      >
        <AddContactForm
          onClose={() => setCreatePersonOpened(false)}
          onCreated={(contact) => {
            setCreatePersonOpened(false);
            handleContactCreated(contact);
          }}
        />
      </Modal>
    </>
  );
}

export function openNewActivityModal({
  contacts,
  activity = null,
  initialParticipantIds,
  titleText,
  onCreated,
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
        onCreated={onCreated}
        t={t}
      />
    ),
  });
}
