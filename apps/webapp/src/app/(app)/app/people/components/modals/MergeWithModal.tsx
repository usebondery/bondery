"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type {
  Contact,
  ContactPreview,
  MergeConflictChoice,
  MergeConflictField,
} from "@bondery/schemas";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconArrowMerge } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { createModalId, useModalDismiss } from "@/lib/modals";
import { useMergeContactsMutation } from "@/lib/query/hooks/useContacts";
import {
  areValuesEquivalent,
  getAutoLastInteractionChoice,
  hasMeaningfulValue,
  MERGE_CONFLICT_FIELDS,
} from "../../utils/merge-conflict-helpers";
import { MergeWithPickStep } from "../merge/MergeWithPickStep";
import { MergeWithResolveStep } from "../merge/MergeWithResolveStep";

interface OpenMergeWithModalParams {
  contacts: Contact[];
  disableLeftPicker?: boolean;
  disableRightPicker?: boolean;
  initialConflictChoices?: Partial<Record<MergeConflictField, MergeConflictChoice>>;
  leftPersonId: string;
  onSearch?: (query: string) => Promise<ContactPreview[]>;
  onSuccess?: () => void;
  redirectToMergedPerson?: boolean;
  rightPersonId?: string;
}

type Step = "pick" | "resolve" | "processing";

function MergeWithModalTitle() {
  const t = useWebTranslations("MergeWithModal");
  return <ModalTitle icon={<IconArrowMerge size={22} />} text={t("ModalTitle")} />;
}

export function openMergeWithModal({
  contacts,
  leftPersonId,
  rightPersonId,
  disableLeftPicker = true,
  disableRightPicker = false,
  redirectToMergedPerson = true,
  onSearch,
  onSuccess,
  initialConflictChoices,
}: OpenMergeWithModalParams) {
  const modalId = createModalId("merge-with");

  modals.open({
    children: (
      <MergeWithModal
        contacts={contacts}
        disableLeftPicker={disableLeftPicker}
        disableRightPicker={disableRightPicker}
        initialConflictChoices={initialConflictChoices}
        initialLeftPersonId={leftPersonId}
        initialRightPersonId={rightPersonId}
        modalId={modalId}
        onSearch={onSearch}
        onSuccess={onSuccess}
        redirectToMergedPerson={redirectToMergedPerson}
      />
    ),
    className: "min-h-80",
    modalId,
    size: "lg",
    title: <MergeWithModalTitle />,
    trapFocus: true,
  });
}

interface MergeWithModalProps {
  contacts: Contact[];
  disableLeftPicker: boolean;
  disableRightPicker: boolean;
  initialConflictChoices?: Partial<Record<MergeConflictField, MergeConflictChoice>>;
  initialLeftPersonId: string;
  initialRightPersonId?: string;
  modalId: string;
  onSearch?: (query: string) => Promise<ContactPreview[]>;
  onSuccess?: () => void;
  redirectToMergedPerson: boolean;
}

function MergeWithModal({
  contacts,
  initialLeftPersonId,
  initialRightPersonId,
  disableLeftPicker,
  disableRightPicker,
  redirectToMergedPerson,
  modalId,
  onSearch,
  onSuccess,
  initialConflictChoices,
}: MergeWithModalProps) {
  const tCommon = useCommonTranslations();
  const router = useRouter();
  const mergeContactsMutation = useMergeContactsMutation();
  const t = useWebTranslations("MergeWithModal");
  const shouldSkipPickStep =
    disableLeftPicker && disableRightPicker && Boolean(initialRightPersonId);

  const [step, setStep] = useState<Step>(shouldSkipPickStep ? "resolve" : "pick");
  const [leftPersonId, setLeftPersonId] = useState(initialLeftPersonId);
  const [rightPersonId, setRightPersonId] = useState(initialRightPersonId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autoMergeRef = useRef(false);
  const knownContactsRef = useRef<Map<string, Contact>>(new Map());
  const [conflictChoices, setConflictChoices] = useState<
    Partial<Record<MergeConflictField, MergeConflictChoice>>
  >(initialConflictChoices ?? {});

  const { closeModal, closeModalSync } = useModalDismiss(modalId, isSubmitting);

  useEffect(() => {
    for (const c of contacts) {
      knownContactsRef.current.set(c.id, c);
    }
  }, [contacts]);

  const handleRightSearch = useCallback(
    async (query: string): Promise<ContactPreview[]> => {
      if (!onSearch) {
        return [];
      }
      const results = await onSearch(query);
      for (const c of results) {
        knownContactsRef.current.set(c.id, c);
      }
      return results
        .filter((c) => !c.myself && c.id !== leftPersonId)
        .map((c) => ({
          avatar: c.avatar,
          firstName: c.firstName,
          id: c.id,
          lastName: c.lastName,
        }));
    },
    [onSearch, leftPersonId],
  );

  const peopleOptions = useMemo(
    () =>
      contacts
        .filter((contact) => !contact.myself)
        .map((contact) => ({
          avatar: contact.avatar,
          firstName: contact.firstName,
          id: contact.id,
          lastName: contact.lastName,
        })),
    [contacts],
  );

  const leftContact = useMemo(
    () => contacts.find((candidate) => candidate.id === leftPersonId) || null,
    [contacts, leftPersonId],
  );

  const rightContact = useMemo(
    () =>
      contacts.find((candidate) => candidate.id === rightPersonId) ??
      (rightPersonId ? (knownContactsRef.current.get(rightPersonId) ?? null) : null),
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
      return [] as Array<{
        field: MergeConflictField;
        leftValue: unknown;
        rightValue: unknown;
      }>;
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
          description: t("SelectBothPeopleError"),
          title: t("ErrorTitle"),
        }),
      );
      return;
    }

    if (leftPersonId === rightPersonId) {
      notifications.show(
        errorNotificationTemplate({
          description: t("DifferentPeopleError"),
          title: t("ErrorTitle"),
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

  const handleMerge = useCallback(async () => {
    if (!leftPersonId || !rightPersonId) {
      return;
    }

    setStep("processing");
    setIsSubmitting(true);

    const loadingNotificationId = notifications.show({
      ...loadingNotificationTemplate({
        description: t("MergingDescription"),
        title: t("MergingTitle"),
      }),
    });

    try {
      const result = await mergeContactsMutation.mutateAsync({
        conflictResolutions,
        leftPersonId,
        rightPersonId,
      });

      if (!("personId" in result)) {
        throw new Error(t("MergeFailed"));
      }

      notifications.hide(loadingNotificationId);
      notifications.show(
        successNotificationTemplate({
          description: t("MergeSuccess"),
          title: t("SuccessTitle"),
        }),
      );

      closeModalSync();
      onSuccess?.();
      if (redirectToMergedPerson) {
        router.push(`${WEBAPP_ROUTES.PERSON}/${result.personId}`);
      }
    } catch (error) {
      notifications.hide(loadingNotificationId);
      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: t("ErrorTitle"),
        }),
      );
      setStep("resolve");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    closeModalSync,
    conflictResolutions,
    leftPersonId,
    mergeContactsMutation,
    onSuccess,
    redirectToMergedPerson,
    rightPersonId,
    router,
    t,
    tCommon,
  ]);

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
  }, [
    shouldSkipPickStep,
    step,
    leftPersonId,
    rightPersonId,
    conflicts.length,
    isSubmitting,
    handleMerge,
  ]);

  const fieldLabel = useCallback(
    (field: MergeConflictField | "latLng") => t(`Fields.${field}`),
    [t],
  );

  const showAvatarPicker =
    Boolean(leftContact && rightContact) && (!shouldSkipPickStep || conflicts.length > 0);

  return (
    <Stack gap="md">
      {step === "pick" ? (
        <MergeWithPickStep
          cancelLabel={t("Cancel")}
          continueLabel={t("Continue")}
          disableLeftPicker={disableLeftPicker}
          disableRightPicker={disableRightPicker}
          isSubmitting={isSubmitting}
          leftContact={leftContact}
          leftSelectablePeople={leftSelectablePeople}
          mergeWithLabel={t("MergeWithLabel")}
          noPeopleFoundLabel={t("NoPeopleFound")}
          onCancel={closeModal}
          onContinue={goToResolve}
          onRightSearch={onSearch ? handleRightSearch : undefined}
          onSelectLeft={(personId) => {
            setLeftPersonId(personId);
            if (personId === rightPersonId) {
              setRightPersonId("");
            }
          }}
          onSelectRight={setRightPersonId}
          rightContact={rightContact}
          rightSelectablePeople={rightSelectablePeople}
          searchPeopleLabel={t("SearchPeople")}
          selectLeftPersonLabel={t("SelectLeftPerson")}
          selectRightPersonLabel={t("SelectRightPerson")}
        />
      ) : null}

      {step === "resolve" ? (
        <MergeWithResolveStep
          backLabel={t("Back")}
          cancelLabel={t("Cancel")}
          conflictChoices={conflictChoices}
          conflictHint={t("ConflictHint")}
          conflicts={conflicts}
          fieldLabel={fieldLabel}
          isSubmitting={isSubmitting}
          leftContact={leftContact}
          mergeLabel={t("Merge")}
          noConflictsLabel={t("NoConflicts")}
          onBack={shouldSkipPickStep ? undefined : () => setStep("pick")}
          onCancel={closeModal}
          onChangeChoice={setConflictChoices}
          onMerge={() => {
            void handleMerge();
          }}
          rightContact={rightContact}
          showAvatarPicker={showAvatarPicker}
          showBackButton={!shouldSkipPickStep}
        />
      ) : null}

      {step === "processing" ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <Loader />
            <Text c="dimmed" size="sm">
              {t("Processing")}
            </Text>
          </Stack>
        </Center>
      ) : null}
    </Stack>
  );
}
