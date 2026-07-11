"use client";

import {
  errorNotificationTemplate,
  ModalFooter,
  ModalTitle,
  PeopleMultiPickerInput,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { type Activity, type ContactSelectable, interactionFormSchema } from "@bondery/schemas";

type ActivityParticipantRef = string | { id: string };

import { getUserFacingError } from "@bondery/helpers/api";
import { Avatar, Button, Group, Select, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCalendarPlus, IconCheck } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DatePickerWithPresets } from "@/components/interactions/DatePickerWithPresets";
import { captureEvent } from "@/lib/analytics/client";
import { ACTIVITY_TYPE_OPTIONS, getActivityTypeConfig } from "@/lib/contacts/activityTypes";
import { searchContacts } from "@/lib/contacts/searchContacts";
import { useInteractionTypeLabel } from "@/lib/i18n/useInteractionTypeLabel";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { createModalId, useModalDismiss } from "@/lib/modals";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import {
  useCreateInteractionMutation,
  useUpdateInteractionMutation,
} from "@/lib/query/hooks/useInteractions";
import { openAddContactModal } from "../../people/components/modals/AddContactModal";

interface OpenNewActivityModalParams {
  activity?: Activity | null;
  contacts: ContactSelectable[];
  initialParticipantIds?: string[];
  onCreated?: (activityId: string) => void;
}

interface NewActivityFormProps {
  activity: Activity | null;
  contacts: ContactSelectable[];
  initialParticipantIds?: string[];
  modalId: string;
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
function buildParticipantSeed(p: unknown): ContactSelectable | null {
  if (!p || typeof p === "string") {
    return null;
  }
  const raw = p as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) {
    return null;
  }
  return {
    avatar: (raw.avatar ?? null) as string | null,
    firstName: (raw.firstName ?? "") as string,
    headline: null,
    id,
    lastName: (raw.lastName ?? null) as string | null,
    location: null,
    middleName: (raw.middleName ?? null) as string | null,
    myself: null,
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
  const t = useWebTranslations("InteractionsPage");
  return <ModalTitle icon={<IconCalendarPlus size={24} />} text={t("WhoAreYouMeeting")} />;
}

function NewActivityForm({
  modalId,
  contacts,
  activity,
  initialParticipantIds,
  onCreated,
}: NewActivityFormProps) {
  const tCommon = useCommonTranslations();
  const t = useWebTranslations("InteractionsPage");
  const getInteractionTypeLabel = useInteractionTypeLabel();
  const createInteractionMutation = useCreateInteractionMutation();
  const updateInteractionMutation = useUpdateInteractionMutation(activity?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBlocking = isSubmitting;
  const [availableContacts, setAvailableContacts] = useState<ContactSelectable[]>(() => {
    if (!activity?.participants?.length) {
      return contacts;
    }
    // Seed the pool with participant data embedded in the activity so that chips
    // for already-selected contacts always resolve to a name, even when those
    // contacts aren't in the caller's `contacts` prop.
    const pool = new Map(contacts.map((c) => [c.id, c]));
    for (const p of activity.participants as unknown[]) {
      const seed = buildParticipantSeed(p);
      if (seed && !pool.has(seed.id)) {
        pool.set(seed.id, seed);
      }
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
      for (const c of contacts) {
        pool.set(c.id, c);
      }
      return Array.from(pool.values());
    });
  }, [contacts]);

  const { closeModal } = useModalDismiss(modalId, isBlocking);

  const resolvedInitialParticipantIds = useMemo(
    () =>
      (activity?.participants || initialParticipantIds || [])
        .map((participant: ActivityParticipantRef) =>
          typeof participant === "string" ? participant : participant.id,
        )
        .filter((id): id is string => Boolean(id)),
    [activity, initialParticipantIds],
  );

  const form = useForm({
    initialValues: {
      date: toLocalDateInputValue(activity ? new Date(activity.date) : new Date()),
      description: activity?.description || "",
      participantIds: resolvedInitialParticipantIds,
      title: activity?.title || "",
      type: activity?.type || "Call",
    },
    validate: schemaResolver(interactionFormSchema, { sync: true }),
  });

  const activityTypeSelectOptions = useMemo(
    () =>
      ACTIVITY_TYPE_OPTIONS.map((type) => ({
        label: getInteractionTypeLabel(type),
        value: type,
      })),
    [getInteractionTypeLabel],
  );

  const selectedTypeConfig = getActivityTypeConfig(form.values.type);

  const handleContactCreated = (createdContact: ContactSelectable) => {
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
    setIsSubmitting(true);

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
          description: activity ? t("ActivityUpdated") : t("ActivityCreated"),
          title: t("SuccessTitle"),
        }),
      );

      closeModal();
      if (onCreated && !isEditMode && data.interaction?.id) {
        onCreated(data.interaction.id);
      }
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: t("ErrorTitle"),
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          autoFocus
          data-autofocus
          disabled={isBlocking}
          label={t("Title")}
          placeholder={t("TitlePlaceholder")}
          {...form.getInputProps("title")}
        />

        <Stack gap={4}>
          <PeopleMultiPickerInput
            contacts={availableContacts}
            disabled={isBlocking}
            error={form.errors.participantIds}
            inputRef={participantsInputRef}
            noResultsLabel={t("NoContactsFound")}
            onChange={(ids) => {
              form.setFieldValue("participantIds", ids);
              form.validateField("participantIds");
            }}
            onSearch={searchContacts}
            placeholder={t("AddParticipantsPlaceholder")}
            searchDebounceMs={DEBOUNCE_MS.contactPicker}
            searchingLabel={t("SearchingLabel")}
            selectedIds={form.values.participantIds}
          />

          <Button
            disabled={isBlocking}
            onClick={() => {
              openAddContactModal({ onCreated: handleContactCreated });
            }}
            size="xs"
            style={{ alignSelf: "flex-start", paddingLeft: 0 }}
            variant="subtle"
          >
            {t("CreateNewPersonFallback")}
          </Button>
        </Stack>

        <Stack gap="xs">
          <Group align="center" justify="space-between">
            <Text fw={500} size="sm">
              {t("Note")}
            </Text>
          </Group>
          <Textarea
            disabled={isBlocking}
            minRows={6}
            placeholder={t("DescriptionPlaceholder")}
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
              disabled={isBlocking}
              placeholder={t("PickDate")}
              {...form.getInputProps("date")}
              w="100%"
            />
            <Select
              data={activityTypeSelectOptions}
              disabled={isBlocking}
              placeholder={t("Type")}
              {...form.getInputProps("type")}
              allowDeselect={false}
              leftSection={
                <Avatar color={selectedTypeConfig.color} radius="xl" size={20}>
                  {selectedTypeConfig.emoji}
                </Avatar>
              }
              renderOption={({ option }) => {
                const typeConfig = getActivityTypeConfig(option.value);
                return (
                  <Group gap="sm" wrap="nowrap">
                    <Avatar color={typeConfig.color} radius="xl" size={20}>
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
          actionDisabled={isBlocking}
          actionLabel={isEditMode ? t("SaveChanges") : t("AddActivity")}
          actionLeftSection={isEditMode ? <IconCheck size={16} /> : <IconCalendarPlus size={16} />}
          actionLoading={isBlocking}
          actionType="submit"
          cancelDisabled={isBlocking}
          cancelLabel={t("Cancel")}
          onCancel={closeModal}
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
    children: (
      <NewActivityForm
        activity={activity}
        contacts={contacts}
        initialParticipantIds={initialParticipantIds}
        modalId={modalId}
        onCreated={onCreated}
      />
    ),
    modalId,
    size: "lg",
    title: <NewActivityModalTitle />,
  });
}
