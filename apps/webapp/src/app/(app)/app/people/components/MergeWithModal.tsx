"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Center,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Avatar,
  UnstyledButton,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft, IconArrowMerge, IconArrowRight, IconCheck } from "@tabler/icons-react";
import {
  ModalFooter,
  PersonChip,
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
import { revalidateAll } from "../../actions";
import { SelectableCard } from "@/app/(app)/app/components/SelectableCard";
import { getAvatarColorFromName } from "@/lib/avatarColor";

interface OpenMergeWithModalParams {
  contacts: Contact[];
  leftPersonId: string;
  rightPersonId?: string;
  disableLeftPicker?: boolean;
  disableRightPicker?: boolean;
  redirectToMergedPerson?: boolean;
  titleText: string;
  texts: MergeWithModalTexts;
  onSuccess?: () => void;
  initialConflictChoices?: Partial<Record<MergeConflictField, MergeConflictChoice>>;
}

type Step = "pick" | "resolve" | "processing";

export const MERGE_CONFLICT_FIELDS: MergeConflictField[] = [
  "avatar",
  "firstName",
  "middleName",
  "lastName",
  "headline",
  "location",
  "notes",
  "lastInteraction",
  "phones",
  "emails",
  "importantDates",
  "language",
  "timezone",
  "gisPoint",
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
  conflictHint: string;
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

function normalizeImportantDatesSet(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return "";
      }

      const row = entry as { type?: unknown; date?: unknown; note?: unknown };
      const dateType = String(row.type || "")
        .trim()
        .toLowerCase();
      const dateValue = String(row.date || "")
        .trim()
        .slice(0, 10);
      const note = String(row.note || "").trim();
      if (!dateType || !dateValue) {
        return "";
      }

      return `${dateType}|${dateValue}|${note}`;
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

  if (field === "importantDates") {
    return (
      JSON.stringify(normalizeImportantDatesSet(left)) ===
      JSON.stringify(normalizeImportantDatesSet(right))
    );
  }

  if (typeof left === "string" && typeof right === "string") {
    return left.trim() === right.trim();
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeDisplayText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  return "";
}

function parseTimestampValue(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const raw = typeof value === "string" ? value.trim() : String(value);
  if (!raw) {
    return null;
  }

  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
}

function getAutoLastInteractionChoice(
  leftValue: unknown,
  rightValue: unknown,
): MergeConflictChoice | null {
  const leftTimestamp = parseTimestampValue(leftValue);
  const rightTimestamp = parseTimestampValue(rightValue);

  if (leftTimestamp === null && rightTimestamp === null) {
    return null;
  }

  if (leftTimestamp === null) {
    return "right";
  }

  if (rightTimestamp === null) {
    return "left";
  }

  if (leftTimestamp === rightTimestamp) {
    return null;
  }

  return leftTimestamp > rightTimestamp ? "left" : "right";
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

function formatConflictDisplayValue(field: MergeConflictField, value: unknown): string {
  if (field === "importantDates") {
    const count = normalizeImportantDatesSet(value).length;
    return count > 0 ? `${count}` : "";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? `${value.length}` : "";
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return normalizeDisplayText(value);
}

interface AvatarConflictPickerProps {
  leftContact: Contact;
  rightContact: Contact;
  choice: MergeConflictChoice;
  label: string;
  onChange: (side: MergeConflictChoice) => void;
}

function AvatarConflictPicker({
  leftContact,
  rightContact,
  choice,
  label,
  onChange,
}: AvatarConflictPickerProps) {
  const sides: Array<{ side: MergeConflictChoice; contact: Contact }> = [
    { side: "left", contact: leftContact },
    { side: "right", contact: rightContact },
  ];

  return (
    <Stack gap="sm">
      <SimpleGrid cols={2} spacing="sm">
        {sides.map(({ side, contact }) => {
          const selected = choice === side;
          const avatarColor = getAvatarColorFromName(contact.firstName, contact.lastName);
          const fullName = `${contact.firstName} ${contact.lastName ?? ""}`.trim();
          return (
            <UnstyledButton
              key={side}
              onClick={() => onChange(side)}
              w="100%"
              h="100%"
              style={{ textAlign: "left" }}
              aria-pressed={selected}
            >
              <Paper
                p="xs"
                radius="md"
                withBorder
                h="100%"
                style={{
                  borderColor: selected ? "var(--mantine-primary-color-filled)" : undefined,
                  backgroundColor: selected
                    ? "var(--mantine-primary-color-light-hover)"
                    : undefined,
                  cursor: "pointer",
                }}
              >
                <Stack gap={6} align="center">
                  <Group justify="space-between" wrap="nowrap" w="100%">
                    <Text size="sm" fw={500}>
                      {label}
                    </Text>
                    {selected && <IconCheck size={14} />}
                  </Group>
                  <Avatar
                    src={contact.avatar ?? undefined}
                    size={48}
                    radius="xl"
                    color={avatarColor}
                    name={fullName}
                  />
                </Stack>
              </Paper>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
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
  onSuccess,
  initialConflictChoices,
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
        onSuccess={onSuccess}
        initialConflictChoices={initialConflictChoices}
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
  onSuccess?: () => void;
  initialConflictChoices?: Partial<Record<MergeConflictField, MergeConflictChoice>>;
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
  onSuccess,
  initialConflictChoices,
}: MergeWithModalProps) {
  const router = useRouter();
  const shouldSkipPickStep =
    disableLeftPicker && disableRightPicker && Boolean(initialRightPersonId);

  const [step, setStep] = useState<Step>(shouldSkipPickStep ? "resolve" : "pick");
  const [leftPersonId, setLeftPersonId] = useState(initialLeftPersonId);
  const [rightPersonId, setRightPersonId] = useState(initialRightPersonId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autoMergeRef = useRef(false);
  const [conflictChoices, setConflictChoices] = useState<
    Partial<Record<MergeConflictField, MergeConflictChoice>>
  >(initialConflictChoices ?? {});

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
      contacts
        .filter((contact) => !contact.myself)
        .map((contact) => ({
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
        entry.field !== "lastInteraction" &&
        entry.field !== "avatar" &&
        !areValuesEquivalent(entry.field, entry.leftValue, entry.rightValue),
    );
  }, [leftContact, rightContact]);

  const autoLastInteractionChoice = useMemo(
    () => getAutoLastInteractionChoice(leftContact?.lastInteraction, rightContact?.lastInteraction),
    [leftContact?.lastInteraction, rightContact?.lastInteraction],
  );

  const conflictResolutions = useMemo(() => {
    return {
      ...conflictChoices,
      ...(autoLastInteractionChoice ? { lastInteraction: autoLastInteractionChoice } : {}),
    };
  }, [autoLastInteractionChoice, conflictChoices]);

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

    if (conflicts.length === 0) {
      void handleMerge();
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
          conflictResolutions,
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
      onSuccess?.();
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

  useEffect(() => {
    if (
      shouldSkipPickStep &&
      step === "resolve" &&
      leftPersonId &&
      rightPersonId &&
      conflicts.length === 0 &&
      !isSubmitting &&
      !autoMergeRef.current
    ) {
      autoMergeRef.current = true;
      void handleMerge();
    }
  }, [shouldSkipPickStep, step, leftPersonId, rightPersonId, conflicts.length, isSubmitting]);

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
          {(() => {
            // Show avatar picker when the user is explicitly in the resolve step
            // (not the auto-merge fast path where shouldSkipPickStep && no field conflicts)
            const showAvatarPicker =
              Boolean(leftContact && rightContact) && (!shouldSkipPickStep || conflicts.length > 0);

            if (conflicts.length === 0) {
              return (
                <>
                  {showAvatarPicker && leftContact && rightContact ? (
                    <AvatarConflictPicker
                      leftContact={leftContact}
                      rightContact={rightContact}
                      choice={conflictChoices.avatar ?? "left"}
                      label={texts.fields.avatar}
                      onChange={(side) => setConflictChoices((prev) => ({ ...prev, avatar: side }))}
                    />
                  ) : (
                    <Paper withBorder radius="md" p="md">
                      <Text size="sm" c="dimmed">
                        {texts.noConflicts}
                      </Text>
                    </Paper>
                  )}
                </>
              );
            }

            return (
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  {texts.conflictHint}
                </Text>
                <SimpleGrid cols={2} spacing="sm" mt={"md"} mb="xs">
                  <Center>
                    <PersonChip person={toPersonPreview(leftContact)} isClickable />
                  </Center>
                  <Center>
                    <PersonChip person={toPersonPreview(rightContact)} isClickable />
                  </Center>
                </SimpleGrid>
                {/* Avatar conflict picker alongside field conflicts */}
                {leftContact && rightContact ? (
                  <AvatarConflictPicker
                    leftContact={leftContact}
                    rightContact={rightContact}
                    choice={conflictChoices.avatar ?? "left"}
                    label={texts.fields.avatar}
                    onChange={(side) => setConflictChoices((prev) => ({ ...prev, avatar: side }))}
                  />
                ) : null}
                {(() => {
                  const hasLatLngPair =
                    conflicts.some((c) => c.field === "latitude") &&
                    conflicts.some((c) => c.field === "longitude");
                  const lngConflict = conflicts.find((c) => c.field === "longitude");

                  return conflicts
                    .filter((c) => !(c.field === "longitude" && hasLatLngPair))
                    .map((conflict) => {
                      const isLatLng = conflict.field === "latitude" && hasLatLngPair;
                      const selectedChoice = conflictChoices[conflict.field] || "left";

                      const label = isLatLng
                        ? `${texts.fields.latitude} / ${texts.fields.longitude}`
                        : texts.fields[conflict.field];

                      const leftDesc = isLatLng
                        ? `${normalizeDisplayText(conflict.leftValue)}, ${normalizeDisplayText(lngConflict?.leftValue)}`
                        : formatConflictDisplayValue(conflict.field, conflict.leftValue) ||
                          undefined;

                      const rightDesc = isLatLng
                        ? `${normalizeDisplayText(conflict.rightValue)}, ${normalizeDisplayText(lngConflict?.rightValue)}`
                        : formatConflictDisplayValue(conflict.field, conflict.rightValue) ||
                          undefined;

                      const handleSelect = (side: MergeConflictChoice) => {
                        setConflictChoices((prev) => {
                          const next = { ...prev, [conflict.field]: side };
                          if (isLatLng) next.longitude = side;
                          return next;
                        });
                      };

                      return (
                        <Stack key={conflict.field} gap="sm">
                          <SimpleGrid cols={2} spacing="sm">
                            <SelectableCard
                              selected={selectedChoice === "left"}
                              label={label}
                              description={leftDesc || undefined}
                              onClick={() => handleSelect("left")}
                            />
                            <SelectableCard
                              selected={selectedChoice === "right"}
                              label={label}
                              description={rightDesc || undefined}
                              onClick={() => handleSelect("right")}
                            />
                          </SimpleGrid>
                        </Stack>
                      );
                    });
                })()}
              </Stack>
            );
          })()}

          <ModalFooter
            {...(shouldSkipPickStep
              ? {}
              : {
                  backLabel: texts.back,
                  backLeftSection: <IconArrowLeft size={16} />,
                  onBack: () => setStep("pick"),
                  backDisabled: isSubmitting,
                })}
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
