"use client";

import { useMemo, useState } from "react";
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
  Stepper,
  Text,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconGitMerge, IconUsers } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import {
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
  titleText?: string;
}

type Step = "pick" | "resolve" | "processing";

const CONFLICT_FIELDS: MergeConflictField[] = [
  "firstName",
  "middleName",
  "lastName",
  "title",
  "place",
  "notes",
  "lastInteraction",
  "connections",
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

function areValuesEquivalent(left: unknown, right: unknown): boolean {
  if (typeof left === "string" && typeof right === "string") {
    return left.trim() === right.trim();
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

function formatConflictValue(value: unknown): string {
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
  titleText,
}: OpenMergeWithModalParams) {
  modals.open({
    trapFocus: true,
    size: "48rem",
    title: <ModalTitle text={titleText || "Merge with"} icon={<IconGitMerge size={22} />} />,
    children: (
      <MergeWithModal
        contacts={contacts}
        initialLeftPersonId={leftPersonId}
        initialRightPersonId={rightPersonId}
        disableLeftPicker={disableLeftPicker}
        disableRightPicker={disableRightPicker}
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
}

function MergeWithModal({
  contacts,
  initialLeftPersonId,
  initialRightPersonId,
  disableLeftPicker,
  disableRightPicker,
}: MergeWithModalProps) {
  const router = useRouter();
  const t = useTranslations("MergeWithModal");

  const [step, setStep] = useState<Step>("pick");
  const [leftPersonId, setLeftPersonId] = useState(initialLeftPersonId);
  const [rightPersonId, setRightPersonId] = useState(initialRightPersonId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictChoices, setConflictChoices] = useState<
    Partial<Record<MergeConflictField, MergeConflictChoice>>
  >({});

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

    return CONFLICT_FIELDS.map((field) => ({
      field,
      leftValue: leftContact[field],
      rightValue: rightContact[field],
    })).filter(
      (entry) =>
        hasMeaningfulValue(entry.leftValue) &&
        hasMeaningfulValue(entry.rightValue) &&
        !areValuesEquivalent(entry.leftValue, entry.rightValue),
    );
  }, [leftContact, rightContact]);

  const activeStep = step === "pick" ? 0 : step === "resolve" ? 1 : 2;

  const goToResolve = () => {
    if (!leftPersonId || !rightPersonId) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: t("SelectBothPeopleError"),
        }),
      );
      return;
    }

    if (leftPersonId === rightPersonId) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: t("DifferentPeopleError"),
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
        title: t("MergingTitle"),
        description: t("MergingDescription"),
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
        throw new Error((result as { error?: string }).error || t("MergeFailed"));
      }

      notifications.hide(loadingNotificationId);
      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description: t("MergeSuccess"),
        }),
      );

      modals.closeAll();
      await revalidateAll();
      router.push(`${WEBAPP_ROUTES.PERSON}/${result.personId}`);
      router.refresh();
    } catch (error) {
      notifications.hide(loadingNotificationId);
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: error instanceof Error ? error.message : t("MergeFailed"),
        }),
      );
      setStep("resolve");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack gap="md">
      <Stepper active={activeStep} allowNextStepsSelect={false} iconSize={26}>
        <Stepper.Step label={t("Steps.Pick")} />
        <Stepper.Step label={t("Steps.Resolve")} />
        <Stepper.Step label={t("Steps.Process")} />
      </Stepper>

      {step === "pick" ? (
        <Paper withBorder radius="md" p="md">
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
                placeholder={t("SelectLeftPerson")}
                searchPlaceholder={t("SearchPeople")}
                noResultsLabel={t("NoPeopleFound")}
              />

              <Text c="dimmed" size="sm" fw={500}>
                {t("MergeWithLabel")}
              </Text>

              <PersonChip
                person={toPersonPreview(rightContact)}
                isSelectable
                people={rightSelectablePeople}
                onSelectPerson={(personId) => setRightPersonId(personId)}
                disabled={disableRightPicker}
                placeholder={t("SelectRightPerson")}
                searchPlaceholder={t("SearchPeople")}
                noResultsLabel={t("NoPeopleFound")}
              />
            </Group>

            <Group justify="flex-end">
              <Button variant="default" onClick={() => modals.closeAll()}>
                {t("Cancel")}
              </Button>
              <Button leftSection={<IconUsers size={16} />} onClick={goToResolve}>
                {t("Continue")}
              </Button>
            </Group>
          </Stack>
        </Paper>
      ) : null}

      {step === "resolve" ? (
        <Stack gap="sm">
          {conflicts.length === 0 ? (
            <Paper withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                {t("NoConflicts")}
              </Text>
            </Paper>
          ) : (
            conflicts.map((conflict) => {
              const selectedChoice = conflictChoices[conflict.field] || "left";

              return (
                <Paper key={conflict.field} withBorder radius="md" p="md">
                  <Stack gap="sm">
                    <Text size="sm" fw={600}>
                      {t(`Fields.${conflict.field}`)}
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
                        {formatConflictValue(conflict.leftValue)}
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
                        {formatConflictValue(conflict.rightValue)}
                      </Button>
                    </SimpleGrid>
                  </Stack>
                </Paper>
              );
            })
          )}

          <Divider />

          <Group justify="space-between">
            <Button variant="default" onClick={() => setStep("pick")}>
              {t("Back")}
            </Button>
            <Group>
              <Button variant="default" onClick={() => modals.closeAll()}>
                {t("Cancel")}
              </Button>
              <Button
                color="red"
                leftSection={<IconGitMerge size={16} />}
                onClick={handleMerge}
                loading={isSubmitting}
              >
                {t("Merge")}
              </Button>
            </Group>
          </Group>
        </Stack>
      ) : null}

      {step === "processing" ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <Loader />
            <Text size="sm" c="dimmed">
              {t("Processing")}
            </Text>
          </Stack>
        </Center>
      ) : null}
    </Stack>
  );
}
