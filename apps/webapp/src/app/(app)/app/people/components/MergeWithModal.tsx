"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Center,
  Divider,
  Group,
  Input,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconArrowMerge,
  IconArrowRight,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandWhatsapp,
  IconCheck,
  IconMail,
  IconMessageCircle,
  IconPhone,
  IconWorld,
} from "@tabler/icons-react";
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
  EmailEntry,
  MergeConflictChoice,
  MergeConflictField,
  MergeContactsResponse,
  PhoneEntry,
} from "@bondery/types";
import { IMaskInput } from "react-imask";
import { getTelephoneReactMaskExpression } from "@/lib/phoneHelpers";
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
  onSuccess?: () => void;
  initialConflictChoices?: Partial<Record<MergeConflictField, MergeConflictChoice>>;
}

type Step = "pick" | "resolve" | "processing";

export const MERGE_CONFLICT_FIELDS: MergeConflictField[] = [
  "firstName",
  "middleName",
  "lastName",
  "avatar",
  "headline",
  "place",
  "notes",
  "lastInteraction",
  "phones",
  "emails",
  "importantEvents",
  "language",
  "timezone",
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

type SocialConflictField = Extract<
  MergeConflictField,
  "linkedin" | "instagram" | "facebook" | "website" | "whatsapp" | "signal"
>;

const SOCIAL_FIELD_CONFIG: Record<
  SocialConflictField,
  {
    label: string;
    icon: React.ReactNode;
  }
> = {
  linkedin: {
    label: "LinkedIn",
    icon: <IconBrandLinkedin size={14} />,
  },
  instagram: {
    label: "Instagram",
    icon: <IconBrandInstagram size={14} />,
  },
  facebook: {
    label: "Facebook",
    icon: <IconBrandFacebook size={14} />,
  },
  website: {
    label: "Website",
    icon: <IconWorld size={14} />,
  },
  whatsapp: {
    label: "WhatsApp",
    icon: <IconBrandWhatsapp size={14} />,
  },
  signal: {
    label: "Signal",
    icon: <IconMessageCircle size={14} />,
  },
};

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

function getPhoneEntries(value: unknown): PhoneEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const row = entry as Partial<PhoneEntry>;
      const prefix = String(row.prefix || "").trim();
      const number = String(row.value || "").trim();
      if (!number) {
        return null;
      }

      return {
        prefix,
        value: number,
        type: row.type === "work" ? "work" : "home",
        preferred: Boolean(row.preferred),
      } satisfies PhoneEntry;
    })
    .filter((entry): entry is PhoneEntry => Boolean(entry));
}

function getEmailEntries(value: unknown): EmailEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const row = entry as Partial<EmailEntry>;
      const email = String(row.value || "").trim();
      if (!email) {
        return null;
      }

      return {
        value: email,
        type: row.type === "work" ? "work" : "home",
        preferred: Boolean(row.preferred),
      } satisfies EmailEntry;
    })
    .filter((entry): entry is EmailEntry => Boolean(entry));
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

interface ConflictOptionCardProps {
  selected: boolean;
  fieldLabel: string;
  onSelect: () => void;
  children: ReactNode;
}

function ConflictOptionCard({ selected, fieldLabel, onSelect, children }: ConflictOptionCardProps) {
  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      className="input-scale-effect"
      style={{
        borderColor: selected ? "var(--mantine-primary-color-filled)" : undefined,
        backgroundColor: selected ? "var(--mantine-primary-color-light-hover)" : undefined,
      }}
    >
      <UnstyledButton
        w="100%"
        onClick={onSelect}
        style={{ textAlign: "left" }}
        aria-pressed={selected}
      >
        <Stack gap="xs">
          <Group justify="space-between" wrap="nowrap">
            <Text fw={"bold"}>{fieldLabel}</Text>
            {selected ? <IconCheck size={14} /> : null}
          </Group>
          <div style={{ pointerEvents: "none" }}>{children}</div>
        </Stack>
      </UnstyledButton>
    </Paper>
  );
}

function formatConflictDisplayValue(field: MergeConflictField, value: unknown): string {
  if (field === "importantEvents") {
    const count = normalizeImportantEventsSet(value).length;
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

function renderPhonesPreview(value: unknown): ReactNode {
  const entries = getPhoneEntries(value);

  if (entries.length === 0) {
    return <Input value="" type="tel" disabled readOnly leftSection={<IconPhone size={14} />} />;
  }

  return (
    <Stack gap="xs">
      {entries.map((entry, index) => (
        <Group key={`${entry.prefix}-${entry.value}-${entry.type}-${index}`} gap="xs" wrap="nowrap">
          <Input
            component={IMaskInput}
            mask={getTelephoneReactMaskExpression(entry.prefix || "+1")}
            unmask
            value={entry.value}
            disabled
            readOnly
            leftSection={<IconPhone size={14} />}
            rightSection={
              <Text size="xs" c="dimmed">
                {entry.prefix}
              </Text>
            }
            style={{ flex: 1 }}
          />
        </Group>
      ))}
    </Stack>
  );
}

function renderEmailsPreview(value: unknown): ReactNode {
  const entries = getEmailEntries(value);

  if (entries.length === 0) {
    return <Input value="" disabled readOnly leftSection={<IconMail size={14} />} />;
  }

  return (
    <Stack gap="xs">
      {entries.map((entry, index) => (
        <Group key={`${entry.value}-${entry.type}-${index}`} gap="xs" wrap="nowrap">
          <Input
            type="text"
            value={entry.value}
            disabled
            readOnly
            leftSection={<IconMail size={14} />}
            style={{ flex: 1 }}
          />
        </Group>
      ))}
    </Stack>
  );
}

function renderSocialPreview(field: SocialConflictField, value: unknown): ReactNode {
  const config = SOCIAL_FIELD_CONFIG[field];

  return (
    <Input
      value={normalizeDisplayText(value)}
      disabled
      readOnly
      leftSection={config.icon}
      style={{ flex: 1 }}
    />
  );
}

function renderConflictPreview(
  field: MergeConflictField,
  value: unknown,
  contact: Contact | null,
): ReactNode {
  if (field === "avatar") {
    return <PersonChip person={toPersonPreview(contact)} size="sm" color="gray" />;
  }

  if (field === "firstName" || field === "middleName" || field === "lastName") {
    const fieldValue = normalizeDisplayText(value);

    return (
      <PersonChip
        person={{
          id: contact?.id || `${field}-${fieldValue || "value"}`,
          firstName: field === "firstName" ? fieldValue : "",
          middleName: field === "middleName" ? fieldValue : "",
          lastName: field === "lastName" ? fieldValue : "",
          avatar: null,
        }}
        size="sm"
        color="gray"
      />
    );
  }

  if (field === "phones") {
    return renderPhonesPreview(value);
  }

  if (field === "emails") {
    return renderEmailsPreview(value);
  }

  if (
    field === "linkedin" ||
    field === "instagram" ||
    field === "facebook" ||
    field === "website" ||
    field === "whatsapp" ||
    field === "signal"
  ) {
    return renderSocialPreview(field, value);
  }

  if (field === "language") {
    return (
      <Input
        value={normalizeDisplayText(value)}
        disabled
        readOnly
        leftSection={<IconMessageCircle size={14} />}
      />
    );
  }

  if (field === "timezone") {
    return (
      <Input
        value={normalizeDisplayText(value)}
        disabled
        readOnly
        leftSection={<IconWorld size={14} />}
      />
    );
  }

  if (field === "latitude" || field === "longitude") {
    return (
      <Input
        type="number"
        value={normalizeDisplayText(value)}
        disabled
        readOnly
        leftSection={<IconWorld size={14} />}
      />
    );
  }

  return (
    <Input
      type="text"
      value={formatConflictDisplayValue(field, value)}
      disabled
      readOnly
      leftSection={<IconMessageCircle size={14} />}
    />
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
        entry.field !== "lastInteraction" &&
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
          {conflicts.length === 0 ? (
            <Paper withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                {texts.noConflicts}
              </Text>
            </Paper>
          ) : (
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
              {conflicts.map((conflict) => {
                const selectedChoice = conflictChoices[conflict.field] || "left";

                return (
                  <Stack key={conflict.field} gap="sm">
                    <SimpleGrid cols={2} spacing="sm">
                      <ConflictOptionCard
                        selected={selectedChoice === "left"}
                        fieldLabel={texts.fields[conflict.field]}
                        onSelect={() =>
                          setConflictChoices((prev) => ({
                            ...prev,
                            [conflict.field]: "left",
                          }))
                        }
                      >
                        {renderConflictPreview(conflict.field, conflict.leftValue, leftContact)}
                      </ConflictOptionCard>
                      <ConflictOptionCard
                        selected={selectedChoice === "right"}
                        fieldLabel={texts.fields[conflict.field]}
                        onSelect={() =>
                          setConflictChoices((prev) => ({
                            ...prev,
                            [conflict.field]: "right",
                          }))
                        }
                      >
                        {renderConflictPreview(conflict.field, conflict.rightValue, rightContact)}
                      </ConflictOptionCard>
                    </SimpleGrid>
                  </Stack>
                );
              })}
            </Stack>
          )}

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
