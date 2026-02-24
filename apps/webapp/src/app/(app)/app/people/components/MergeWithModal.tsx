"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft, IconArrowMerge, IconArrowRight } from "@tabler/icons-react";
import {
  ModalFooter,
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type {
  Contact,
  MergeConflictChoice,
  MergeConflictField,
  MergeContactsResponse,
} from "@bondery/types";
import { PersonChip } from "@/app/(app)/app/components/shared/PersonChip";
import { revalidateAll } from "../../actions";

interface OpenMergeWithModalParams {
  contacts: Contact[];
  leftPersonId: string;
  rightPersonId?: string;
  disableLeftPicker?: boolean;
  disableRightPicker?: boolean;
  redirectToMergedPerson?: boolean;
  titleText: string;
  texts: MergeWithModalTexts;
}

type Step = "pick" | "resolve" | "processing";

export const MERGE_CONFLICT_FIELDS: MergeConflictField[] = [
  "firstName",
  "middleName",
  "lastName",
  "avatar",
  "title",
  "place",
  "notes",
  "lastInteraction",
  "connections",
  "phones",
  "emails",
  "importantEvents",
  "position",
  "gender",
  "language",
  "timezone",
  "nickname",
  "pgpPublicKey",
  "location",
  "latitude",
  "longitude",
  "linkedin",
  "instagram",
  "whatsapp",
  "facebook",
  "website",
  "signal",
];

export interface MergeWithModalTexts {
  errorTitle: string;
  successTitle: string;
  selectBothPeopleError: string;
  differentPeopleError: string;
  mergingTitle: string;
  mergingDescription: string;
  mergeSuccess: string;
  mergeFailed: string;
  mergeWithLabel: string;
  selectLeftPerson: string;
  selectRightPerson: string;
  searchPeople: string;
  noPeopleFound: string;
  cancel: string;
  continue: string;
  back: string;
  merge: string;
  noConflicts: string;
  processing: string;
  steps: {
    pick: string;
    resolve: string;
    process: string;
  };
  fields: Record<MergeConflictField, string>;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return true;
}

function normalizePhoneSet(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return "";
      }

      const row = entry as { prefix?: unknown; value?: unknown; type?: unknown };
      const prefix = String(row.prefix || "").trim();
      const phone = String(row.value || "").trim();
      const type = String(row.type || "home")
        .trim()
        .toLowerCase();
      if (!phone) {
        return "";
      }

      return `${prefix}|${phone}|${type}`;
    })
    .filter(Boolean)
    .sort();
}

function normalizeEmailSet(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return "";
      }

      const row = entry as { value?: unknown; type?: unknown };
      const email = String(row.value || "")
        .trim()
        .toLowerCase();
      const type = String(row.type || "home")
        .trim()
        .toLowerCase();
      if (!email) {
        return "";
      }

      return `${email}|${type}`;
    })
    .filter(Boolean)
    .sort();
}

function normalizeImportantEventsSet(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return "";
      }

      const row = entry as { eventType?: unknown; eventDate?: unknown; note?: unknown };
      const eventType = String(row.eventType || "")
        .trim()
        .toLowerCase();
      const eventDate = String(row.eventDate || "")
        .trim()
        .slice(0, 10);
      const note = String(row.note || "").trim();
      if (!eventType || !eventDate) {
        return "";
      }

      return `${eventType}|${eventDate}|${note}`;
    })
    .filter(Boolean)
    .sort();
}

function areValuesEquivalent(field: MergeConflictField, left: unknown, right: unknown): boolean {
  if (field === "phones") {
    return JSON.stringify(normalizePhoneSet(left)) === JSON.stringify(normalizePhoneSet(right));
  }

  if (field === "emails") {
    return JSON.stringify(normalizeEmailSet(left)) === JSON.stringify(normalizeEmailSet(right));
  }

  if (field === "importantEvents") {
    return (
      JSON.stringify(normalizeImportantEventsSet(left)) ===
      JSON.stringify(normalizeImportantEventsSet(right))
    );
  }

  if (typeof left === "string" && typeof right === "string") {
    return left.trim() === right.trim();
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

function formatConflictValue(field: MergeConflictField, value: unknown): string {
  if (field === "phones") {
    const normalized = normalizePhoneSet(value);
    return normalized.length > 0 ? normalized.join(", ") : "—";
  }

  if (field === "emails") {
    const normalized = normalizeEmailSet(value);
    return normalized.length > 0 ? normalized.join(", ") : "—";
  }

  if (field === "importantEvents") {
    const normalized = normalizeImportantEventsSet(value);
    return normalized.length > 0 ? normalized.join(", ") : "—";
  }

  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value.trim() || "—";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "—";
    }

    return value.join(", ");
  }

  return JSON.stringify(value);
}

function toPersonPreview(contact: Contact | null) {
  if (!contact) {
    return null;
  }

  return {
    id: contact.id,
    firstName: contact.firstName,
    middleName: contact.middleName,
    lastName: contact.lastName,
    avatar: contact.avatar,
  };
}

export function openMergeWithModal({
  contacts,
  leftPersonId,
  rightPersonId,
  disableLeftPicker = true,
  disableRightPicker = false,
  redirectToMergedPerson = true,
  titleText,
  texts,
}: OpenMergeWithModalParams) {
  const modalId = `merge-with-${Math.random().toString(36).slice(2)}`;

  modals.open({
    modalId,
    trapFocus: true,
    className: "min-h-80",
    size: "lg",
    title: <ModalTitle text={titleText} icon={<IconArrowMerge size={22} />} />,
    children: (
      <MergeWithModal
        contacts={contacts}
        initialLeftPersonId={leftPersonId}
        initialRightPersonId={rightPersonId}
        disableLeftPicker={disableLeftPicker}
        disableRightPicker={disableRightPicker}
        redirectToMergedPerson={redirectToMergedPerson}
        modalId={modalId}
        texts={texts}
      />
    ),
  });
}

interface MergeWithModalProps {
  contacts: Contact[];
  initialLeftPersonId: string;
  initialRightPersonId?: string;
  disableLeftPicker: boolean;
  disableRightPicker: boolean;
  redirectToMergedPerson: boolean;
  modalId: string;
  texts: MergeWithModalTexts;
}

function MergeWithModal({
  contacts,
  initialLeftPersonId,
  initialRightPersonId,
  disableLeftPicker,
  disableRightPicker,
  redirectToMergedPerson,
  modalId,
  texts,
}: MergeWithModalProps) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("pick");
  const [leftPersonId, setLeftPersonId] = useState(initialLeftPersonId);
  const [rightPersonId, setRightPersonId] = useState(initialRightPersonId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictChoices, setConflictChoices] = useState<
    Partial<Record<MergeConflictField, MergeConflictChoice>>
  >({});

  useEffect(() => {
    modals.updateModal({
      modalId,
      closeOnEscape: !isSubmitting,
      closeOnClickOutside: !isSubmitting,
      withCloseButton: !isSubmitting,
    });
  }, [isSubmitting, modalId]);

  const peopleOptions = useMemo(
    () =>
      contacts.map((contact) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        avatar: contact.avatar,
      })),
    [contacts],
  );

  const leftContact = useMemo(
    () => contacts.find((candidate) => candidate.id === leftPersonId) || null,
    [contacts, leftPersonId],
  );

  const rightContact = useMemo(
    () => contacts.find((candidate) => candidate.id === rightPersonId) || null,
    [contacts, rightPersonId],
  );

  const leftSelectablePeople = useMemo(
    () => peopleOptions.filter((candidate) => candidate.id !== rightPersonId),
    [peopleOptions, rightPersonId],
  );

  const rightSelectablePeople = useMemo(
    () => peopleOptions.filter((candidate) => candidate.id !== leftPersonId),
    [peopleOptions, leftPersonId],
  );

  const conflicts = useMemo(() => {
    if (!leftContact || !rightContact) {
      return [] as Array<{ field: MergeConflictField; leftValue: unknown; rightValue: unknown }>;
    }

    return MERGE_CONFLICT_FIELDS.map((field) => ({
      field,
      leftValue: leftContact[field],
      rightValue: rightContact[field],
    })).filter(
      (entry) =>
        hasMeaningfulValue(entry.leftValue) &&
        hasMeaningfulValue(entry.rightValue) &&
        !areValuesEquivalent(entry.field, entry.leftValue, entry.rightValue),
    );
  }, [leftContact, rightContact]);

  const goToResolve = () => {
    if (!leftPersonId || !rightPersonId) {
      notifications.show(
        errorNotificationTemplate({
          title: texts.errorTitle,
          description: texts.selectBothPeopleError,
        }),
      );
      return;
    }

    if (leftPersonId === rightPersonId) {
      notifications.show(
        errorNotificationTemplate({
          title: texts.errorTitle,
          description: texts.differentPeopleError,
        }),
      );
      return;
    }

    setStep("resolve");
  };

  const handleMerge = async () => {
    if (!leftPersonId || !rightPersonId) {
      return;
    }

    setStep("processing");
    setIsSubmitting(true);

    const loadingNotificationId = notifications.show({
      ...loadingNotificationTemplate({
        title: texts.mergingTitle,
        description: texts.mergingDescription,
      }),
    });

    try {
      const response = await fetch(API_ROUTES.CONTACTS_MERGE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leftPersonId,
          rightPersonId,
          conflictResolutions: conflictChoices,
        }),
      });

      const result = (await response.json()) as MergeContactsResponse | { error?: string };

      if (!response.ok || !("personId" in result)) {
        throw new Error((result as { error?: string }).error || texts.mergeFailed);
      }

      notifications.hide(loadingNotificationId);
      notifications.show(
        successNotificationTemplate({
          title: texts.successTitle,
          description: texts.mergeSuccess,
        }),
      );

      modals.close(modalId);
      await revalidateAll();
      if (redirectToMergedPerson) {
        router.push(`${WEBAPP_ROUTES.PERSON}/${result.personId}`);
      }
      router.refresh();
    } catch (error) {
      notifications.hide(loadingNotificationId);
      notifications.show(
        errorNotificationTemplate({
          title: texts.errorTitle,
          description: error instanceof Error ? error.message : texts.mergeFailed,
        }),
      );
      setStep("resolve");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack gap="md">
      {step === "pick" ? (
        <Stack gap="md">
          <Group align="center" justify="space-between" wrap="nowrap">
            <PersonChip
              person={toPersonPreview(leftContact)}
              isSelectable
              people={leftSelectablePeople}
              onSelectPerson={(personId) => {
                setLeftPersonId(personId);
                if (personId === rightPersonId) {
                  setRightPersonId("");
                }
              }}
              disabled={disableLeftPicker}
              placeholder={texts.selectLeftPerson}
              searchPlaceholder={texts.searchPeople}
              noResultsLabel={texts.noPeopleFound}
            />

            <Text c="dimmed" size="sm" fw={500}>
              {texts.mergeWithLabel}
            </Text>

            <PersonChip
              person={toPersonPreview(rightContact)}
              isSelectable
              people={rightSelectablePeople}
              onSelectPerson={(personId) => setRightPersonId(personId)}
              disabled={disableRightPicker}
              placeholder={texts.selectRightPerson}
              searchPlaceholder={texts.searchPeople}
              noResultsLabel={texts.noPeopleFound}
            />
          </Group>

          <ModalFooter
            cancelLabel={texts.cancel}
            onCancel={() => modals.close(modalId)}
            cancelDisabled={isSubmitting}
            actionLabel={texts.continue}
            onAction={goToResolve}
            actionRightSection={<IconArrowRight size={16} />}
            actionDisabled={isSubmitting}
          />
        </Stack>
      ) : null}

      {step === "resolve" ? (
        <Stack gap="sm">
          {conflicts.length === 0 ? (
            <Paper withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                {texts.noConflicts}
              </Text>
            </Paper>
          ) : (
            conflicts.map((conflict) => {
              const selectedChoice = conflictChoices[conflict.field] || "left";

              return (
                <Paper key={conflict.field} withBorder radius="md" p="md">
                  <Stack gap="sm">
                    <Text size="sm" fw={600}>
                      {texts.fields[conflict.field]}
                    </Text>
                    <SimpleGrid cols={2} spacing="sm">
                      <Button
                        variant={selectedChoice === "left" ? "filled" : "light"}
                        onClick={() =>
                          setConflictChoices((prev) => ({
                            ...prev,
                            [conflict.field]: "left",
                          }))
                        }
                      >
                        {formatConflictValue(conflict.field, conflict.leftValue)}
                      </Button>
                      <Button
                        variant={selectedChoice === "right" ? "filled" : "light"}
                        onClick={() =>
                          setConflictChoices((prev) => ({
                            ...prev,
                            [conflict.field]: "right",
                          }))
                        }
                      >
                        {formatConflictValue(conflict.field, conflict.rightValue)}
                      </Button>
                    </SimpleGrid>
                  </Stack>
                </Paper>
              );
            })
          )}

          <Divider />

          <ModalFooter
            backLabel={texts.back}
            backLeftSection={<IconArrowLeft size={16} />}
            onBack={() => setStep("pick")}
            backDisabled={isSubmitting}
            cancelLabel={texts.cancel}
            onCancel={() => modals.close(modalId)}
            cancelDisabled={isSubmitting}
            actionLabel={texts.merge}
            onAction={() => {
              void handleMerge();
            }}
            actionLeftSection={<IconArrowMerge size={16} />}
            actionLoading={isSubmitting}
            actionDisabled={isSubmitting}
          />
        </Stack>
      ) : null}

      {step === "processing" ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <Loader />
            <Text size="sm" c="dimmed">
              {texts.processing}
            </Text>
          </Stack>
        </Center>
      ) : null}
    </Stack>
  );
}
