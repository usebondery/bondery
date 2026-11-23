"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { detachPromise } from "@bondery/helpers/async";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import type {
  Contact,
  MergeConflictChoice,
  MergeConflictField,
  MergeRecommendation,
} from "@bondery/schemas";
import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { openMergeWithModal } from "@/app/(app)/app/(shell)/people/components/modals/MergeWithModal";
import {
  getAutoLastInteractionChoice,
  listMergeFieldConflicts,
} from "@/app/(app)/app/(shell)/people/utils/merge-conflict-helpers";
import {
  useCommonTranslations,
  useFixContactsPageTranslations,
  useMergeWithModalTranslations,
} from "@/lib/i18n/generated/hooks";
import { orientMergePair } from "@/lib/merge/orientMergePair";
import { showMergeSuccessNotification } from "@/lib/merge/showMergeSuccessNotification";
import { routePerson } from "@/lib/navigation/route/person";
import { useMergeContactsMutation } from "@/lib/query/hooks/useContactMutations";
import { useDeclineMergeRecommendationMutation } from "@/lib/query/hooks/useMergeRecommendations";
import { RecommendationCard } from "./RecommendationCard";

interface MergeRecommendationCardProps {
  contacts: Contact[];
  onAccepted?: () => void;
  onDeclined?: () => void;
  recommendation: MergeRecommendation;
  redirectAfterMerge?: boolean;
  /** When set, this contact is kept as the merge survivor (left). */
  survivorPersonId?: string;
}

/**
 * Returns true if the string contains diacritical marks (e.g. á, č, š, ě, ř).
 */
function hasDiacritics(value: string): boolean {
  return value !== value.normalize("NFD").replace(/\p{Mn}/gu, "");
}

/**
 * When two name values differ only by diacritics, returns the side that has
 * the localized (diacritic-bearing) variant. Returns null when both or neither
 * side has diacritics (no preference).
 */
function preferLocalizedName(
  left: string | null | undefined,
  right: string | null | undefined,
): MergeConflictChoice | null {
  const l = left?.trim() ?? "";
  const r = right?.trim() ?? "";
  if (!l || !r) {
    return null;
  }
  const leftHas = hasDiacritics(l);
  const rightHas = hasDiacritics(r);
  if (leftHas && !rightHas) {
    return "left";
  }
  if (!leftHas && rightHas) {
    return "right";
  }
  return null;
}

const NAME_FIELDS = ["firstName", "middleName", "lastName"] as const;

/**
 * Computes initial conflict choices for name fields, pre-selecting the side
 * that carries diacritical characters (localized name) over the plain ASCII variant.
 */
function computeNameConflictChoices(
  left: Contact,
  right: Contact,
): Partial<Record<MergeConflictField, MergeConflictChoice>> {
  const choices: Partial<Record<MergeConflictField, MergeConflictChoice>> = {};
  for (const field of NAME_FIELDS) {
    const preference = preferLocalizedName(left[field], right[field]);
    if (preference) {
      choices[field] = preference;
    }
  }
  return choices;
}

/**
 * Displays a single merge recommendation as a card with Accept and Decline actions.
 * Used in both the Fix & Merge page and the person detail view.
 */
export function MergeRecommendationCard({
  recommendation,
  contacts,
  onAccepted,
  onDeclined,
  redirectAfterMerge = false,
  survivorPersonId,
}: MergeRecommendationCardProps) {
  const tCommon = useCommonTranslations();
  const t = useFixContactsPageTranslations();
  const tMerge = useMergeWithModalTranslations();
  const router = useRouter();
  const [isDeclining, setIsDeclining] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const declineMutation = useDeclineMergeRecommendationMutation();
  const mergeContactsMutation = useMergeContactsMutation();

  const handleAccept = async () => {
    const oriented = orientMergePair({
      conflictChoices: computeNameConflictChoices(
        recommendation.leftPerson,
        recommendation.rightPerson,
      ),
      leftPersonId: recommendation.leftPerson.id,
      rightPersonId: recommendation.rightPerson.id,
      survivorPersonId,
    });
    const leftContact =
      contacts.find((contact) => contact.id === oriented.leftPersonId) ?? recommendation.leftPerson;
    const rightContact =
      contacts.find((contact) => contact.id === oriented.rightPersonId) ??
      recommendation.rightPerson;
    const hasConflicts = listMergeFieldConflicts(leftContact, rightContact).length > 0;

    if (hasConflicts) {
      openMergeWithModal({
        contacts,
        disableLeftPicker: true,
        disableRightPicker: true,
        initialConflictChoices: oriented.conflictChoices,
        leftPersonId: oriented.leftPersonId,
        onSuccess: onAccepted,
        redirectToMergedPerson: redirectAfterMerge,
        rightPersonId: oriented.rightPersonId,
      });
      return;
    }

    const autoLastInteractionChoice = getAutoLastInteractionChoice(
      leftContact.lastInteraction,
      rightContact.lastInteraction,
    );

    setIsAccepting(true);
    try {
      const result = await mergeContactsMutation.mutateAsync({
        conflictResolutions: {
          ...oriented.conflictChoices,
          ...(autoLastInteractionChoice ? { lastInteraction: autoLastInteractionChoice } : {}),
        },
        leftPersonId: oriented.leftPersonId,
        rightPersonId: oriented.rightPersonId,
      });

      if (!("personId" in result)) {
        throw new Error(tMerge("MergeFailed"));
      }

      onAccepted?.();
      if (redirectAfterMerge) {
        router.push(routePerson(result.personId));
        return;
      }

      showMergeSuccessNotification({
        actionLabel: tCommon("actions.viewMergedContact"),
        description: tMerge("MergeSuccess"),
        navigate: (personId) => router.push(routePerson(personId)),
        personId: result.personId,
        title: t("SuccessTitle"),
      });
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: t("ErrorTitle"),
        }),
      );
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      await declineMutation.mutateAsync(recommendation.id);
      notifications.show(
        successNotificationTemplate({
          description: t("DeclineSuccess"),
          title: t("SuccessTitle"),
        }),
      );
      onDeclined?.();
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: t("ErrorTitle"),
        }),
      );
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <RecommendationCard
      accent="yellow"
      actions={
        <>
          <Button
            disabled={isAccepting}
            leftSection={<IconX size={16} />}
            loading={isDeclining}
            onClick={handleDecline}
            variant="default"
          >
            {t("DeclineMerge")}
          </Button>
          <Button
            disabled={isDeclining}
            leftSection={<IconCheck size={16} />}
            loading={isAccepting}
            onClick={() => detachPromise(handleAccept())}
          >
            {tMerge("Merge")}
          </Button>
        </>
      }
      recommendation={recommendation}
    />
  );
}
