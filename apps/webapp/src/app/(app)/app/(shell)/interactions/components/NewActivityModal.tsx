// biome-ignore-all lint/nursery/useReactCompiler: intentional ref sync and controlled local state for React Compiler
"use client";

import {
  DescribedSelect,
  errorNotificationTemplate,
  ModalFooter,
  ModalTitle,
  PeopleMultiPickerInput,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import {
  type Activity,
  type ContactSelectable,
  type InteractionParticipant,
  type InteractionType,
  interactionFormSchema,
} from "@bondery/schemas";
import { useCommonTranslations, useInteractionsPageTranslations } from "@/lib/i18n/generated/hooks";

type ActivityParticipantRef = string | { id: string };

import { getUserFacingError } from "@bondery/helpers/api";
import { Avatar, Button, Flex, SimpleGrid, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCalendarPlus, IconCheck } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { DatePickerWithPresets } from "@/components/interactions/DatePickerWithPresets";
import { captureEvent } from "@/lib/analytics/client";
import { ACTIVITY_TYPE_OPTIONS, getActivityTypeConfig } from "@/lib/contacts/activityTypes";
import { searchContactsPage } from "@/lib/contacts/searchContacts";
import { useInteractionTypeLabel } from "@/lib/i18n/useInteractionTypeLabel";
import {
  createModalId,
  forgetActivityModalState,
  getActivityFormDraft,
  getCreatedContactsForModal,
  lockActivityFormDraft,
  saveActivityFormDraft,
  unlockActivityFormDraft,
  useCreatedContactsForModal,
  useCreateMore,
  useModalDismiss,
} from "@/lib/modals";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import {
  useCreateInteractionMutation,
  useUpdateInteractionMutation,
} from "@/lib/query/hooks/useInteractions";
import { openAddContactModal } from "../../people/components/modals/AddContactModal";
import classes from "./NewActivityModal.module.css";

interface OpenNewActivityModalParams {
  activity?: Activity | null;
  contacts: ContactSelectable[];
  contactsHasMore?: boolean;
  initialParticipantIds?: string[];
  onCreated?: (activityId: string) => void;
}

interface NewActivityFormProps {
  activity: Activity | null;
  contacts: ContactSelectable[];
  contactsHasMore?: boolean;
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
 * Build a ContactSelectable stub from a participant object returned by the
 * GET /interactions API. The API embeds participant data directly on each
 * activity so chips can resolve to a name even when the participant is not in
 * the caller's `contacts` prop.
 */
function buildParticipantSeed(participant: InteractionParticipant): ContactSelectable | null {
  if (!participant.id) {
    return null;
  }
  return {
    avatar: participant.avatar ?? null,
    firstName: participant.firstName || "",
    headline: participant.headline ?? null,
    id: participant.id,
    lastName: participant.lastName ?? null,
    location: participant.location ?? null,
    middleName: participant.middleName ?? null,
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
  const t = useInteractionsPageTranslations();
  return <ModalTitle icon={<IconCalendarPlus size={24} />} text={t("WhoAreYouMeeting")} />;
}

function NewActivityForm({
  modalId,
  contacts,
  contactsHasMore = false,
  activity,
  initialParticipantIds,
  onCreated,
}: NewActivityFormProps) {
  const tCommon = useCommonTranslations();
  const t = useInteractionsPageTranslations();
  const getInteractionTypeLabel = useInteractionTypeLabel();
  const createInteractionMutation = useCreateInteractionMutation();
  const updateInteractionMutation = useUpdateInteractionMutation(activity?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBlocking = isSubmitting;
  const [availableContacts, setAvailableContacts] = useState<ContactSelectable[]>(() => {
    const pool = new Map(contacts.map((c) => [c.id, c]));
    if (activity?.participants?.length) {
      // Seed the pool with participant data embedded in the activity so that chips
      // for already-selected contacts always resolve to a name, even when those
      // contacts aren't in the caller's `contacts` prop.
      for (const participant of activity.participants) {
        if (typeof participant === "string") {
          continue;
        }
        const seed = buildParticipantSeed(participant);
        if (seed && !pool.has(seed.id)) {
          pool.set(seed.id, seed);
        }
      }
    }
    for (const created of getCreatedContactsForModal(modalId)) {
      pool.set(created.id, created);
    }
    return Array.from(pool.values());
  });
  const participantsInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const appliedCreatedIdsRef = useRef(new Set<string>());
  const isEditMode = Boolean(activity?.id);
  const { createMore, setCreateMore } = useCreateMore({ enabled: !isEditMode });
  const createdContacts = useCreatedContactsForModal(modalId);

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

  const { closeModal: dismissModal } = useModalDismiss(modalId, isBlocking);

  function closeModal() {
    forgetActivityModalState(modalId);
    dismissModal();
  }

  const resolvedInitialParticipantIds = (activity?.participants || initialParticipantIds || [])
    .map((participant: ActivityParticipantRef) =>
      typeof participant === "string" ? participant : participant.id,
    )
    .filter((id): id is string => Boolean(id));

  const form = useForm({
    initialValues: (() => {
      const draft = getActivityFormDraft(modalId);
      return {
        date: draft?.date ?? toLocalDateInputValue(activity ? new Date(activity.date) : new Date()),
        description: draft?.description ?? activity?.description ?? "",
        participantIds: Array.from(
          new Set([
            ...(draft?.participantIds ?? resolvedInitialParticipantIds),
            ...getCreatedContactsForModal(modalId).map((contact) => contact.id),
          ]),
        ),
        title: draft?.title ?? activity?.title ?? "",
        type: draft?.type ?? activity?.type ?? "Call",
      };
    })(),
    mode: "controlled",
    onValuesChange: (values) => {
      saveActivityFormDraft(modalId, values);
    },
    validate: schemaResolver(interactionFormSchema, { sync: true }),
  });

  const pickerContacts = (() => {
    const pool = new Map(availableContacts.map((contact) => [contact.id, contact]));
    for (const contact of createdContacts) {
      pool.set(contact.id, contact);
    }
    return Array.from(pool.values());
  })();

  useEffect(() => {
    const pending = createdContacts.filter(
      (contact) => !appliedCreatedIdsRef.current.has(contact.id),
    );
    if (pending.length === 0) {
      return;
    }

    for (const contact of pending) {
      appliedCreatedIdsRef.current.add(contact.id);
    }

    const nextParticipantIds = Array.from(
      new Set([...form.getValues().participantIds, ...pending.map((contact) => contact.id)]),
    );
    form.setFieldValue("participantIds", nextParticipantIds);
    form.validateField("participantIds");
    queueMicrotask(() => participantsInputRef.current?.focus());
  }, [createdContacts, form]);

  const activityTypeSelectOptions = ACTIVITY_TYPE_OPTIONS.map((type) => {
    const typeConfig = getActivityTypeConfig(type);
    return {
      label: getInteractionTypeLabel(type),
      leftSection: (
        <Avatar color={typeConfig.color} radius="xl" size={20}>
          {typeConfig.emoji}
        </Avatar>
      ),
      value: type,
    };
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

    try {
      const dateValue = parseLocalDateInputValue(values.date);
      const fallbackTime = activity ? new Date(activity.date) : new Date();
      const normalizedDate = withFallbackTime(dateValue, fallbackTime);

      const payload = {
        date: normalizedDate.toISOString(),
        description: values.description,
        participantIds: values.participantIds,
        title: values.title,
        type: values.type as InteractionType,
      };

      let createdId: string | undefined;
      if (activity) {
        await updateInteractionMutation.mutateAsync(payload);
      } else {
        const created = await createInteractionMutation.mutateAsync(payload);
        createdId = created.id;
      }

      captureEvent(
        activity ? "interactions:interaction_update" : "interactions:interaction_create",
        {
          activity_type: values.type,
          participant_count: values.participantIds.length,
        },
      );

      notifications.show(
        successNotificationTemplate({
          description: activity ? t("ActivityUpdated") : t("ActivityCreated"),
          title: t("SuccessTitle"),
        }),
      );

      if (!isEditMode && createMore) {
        form.setFieldValue("title", "");
        form.setFieldValue("description", "");
        form.setFieldValue("participantIds", resolvedInitialParticipantIds);
        form.clearErrors();
        setIsSubmitting(false);
        queueMicrotask(() => titleInputRef.current?.focus());
        return;
      }

      closeModal();
      if (onCreated && createdId) {
        onCreated(createdId);
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
          ref={titleInputRef}
        />

        <Stack gap={4}>
          <PeopleMultiPickerInput
            contacts={pickerContacts}
            contactsHasMore={contactsHasMore}
            disabled={isBlocking}
            error={form.errors.participantIds}
            inputRef={participantsInputRef}
            loadingMoreLabel={t("LoadingMoreLabel")}
            loadMoreErrorLabel={t("LoadMorePickerError")}
            loadMoreRetryLabel={t("LoadMoreRetry")}
            noResultsLabel={t("NoContactsFound")}
            onChange={(ids) => {
              form.setFieldValue("participantIds", ids);
              form.validateField("participantIds");
            }}
            onSearch={searchContactsPage}
            placeholder={t("AddParticipantsPlaceholder")}
            searchDebounceMs={DEBOUNCE_MS.search}
            searchingLabel={t("SearchingLabel")}
            selectedIds={form.values.participantIds}
          />

          <Button
            disabled={isBlocking}
            onClick={() => {
              saveActivityFormDraft(modalId, form.getValues());
              lockActivityFormDraft(modalId);
              openAddContactModal({
                onClose: () => {
                  window.setTimeout(() => {
                    unlockActivityFormDraft(modalId);
                  }, 0);
                },
                parentModalId: modalId,
                repeatable: false,
              });
            }}
            size="xs"
            style={{ alignSelf: "flex-start", paddingLeft: 0 }}
            type="button"
            variant="subtle"
          >
            {t("CreateNewPersonFallback")}
          </Button>
        </Stack>

        <Flex className={classes.grid}>
          <Stack gap="xs" style={{ gridArea: "notes" }}>
            <Text fw={500} size="sm">
              {t("Note")}
            </Text>
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

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" style={{ gridArea: "meta" }}>
            <DatePickerWithPresets
              disabled={isBlocking}
              placeholder={t("PickDate")}
              {...form.getInputProps("date")}
              w="100%"
            />
            <DescribedSelect
              allowDeselect={false}
              data={activityTypeSelectOptions}
              disabled={isBlocking}
              placeholder={t("Type")}
              {...form.getInputProps("type")}
              value={form.values.type}
              w="100%"
            />
          </SimpleGrid>
        </Flex>

        <ModalFooter
          actionDisabled={isBlocking}
          actionLabel={isEditMode ? t("SaveChanges") : t("AddActivity")}
          actionLeftSection={isEditMode ? <IconCheck size={16} /> : <IconCalendarPlus size={16} />}
          actionLoading={isBlocking}
          actionType="submit"
          cancelDisabled={isBlocking}
          cancelLabel={t("Cancel")}
          onCancel={closeModal}
          {...(!isEditMode
            ? {
                createMoreAriaDescription: tCommon("a11y.createMore"),
                createMoreChecked: createMore,
                createMoreDisabled: isBlocking,
                createMoreLabel: tCommon("actions.createMore"),
                onCreateMoreChange: setCreateMore,
              }
            : {})}
        />
      </Stack>
    </form>
  );
}

export function openNewActivityModal({
  contacts,
  contactsHasMore = false,
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
        contactsHasMore={contactsHasMore}
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
