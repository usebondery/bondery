"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import {
  errorNotificationTemplate,
  PersonChip,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type {
  Contact,
  MergeConflictChoice,
  MergeConflictField,
  MergeRecommendation,
} from "@bondery/schemas";
import { Button, Group, Paper, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconUsers, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useDeclineMergeRecommendationMutation } from "@/lib/query/hooks/useMergeRecommendations";
import { openMergeWithModal } from "../../people/components/MergeWithModal";

interface MergeRecommendationCardProps {
  contacts: Contact[];
  onAccepted?: () => void;
  onDeclined?: () => void;
  recommendation: MergeRecommendation;
  redirectAfterMerge?: boolean;
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
}: MergeRecommendationCardProps) {
  const tCommon = useCommonTranslations();
  const t = useWebTranslations("FixContactsPage");
  const tMerge = useWebTranslations("MergeWithModal");
  const [isDeclining, setIsDeclining] = useState(false);
  const declineMutation = useDeclineMergeRecommendationMutation();

  const handleAccept = () => {
    const initialConflictChoices = computeNameConflictChoices(
      recommendation.leftPerson,
      recommendation.rightPerson,
    );
    openMergeWithModal({
      contacts,
      disableLeftPicker: true,
      disableRightPicker: true,
      initialConflictChoices,
      leftPersonId: recommendation.leftPerson.id,
      onSuccess: onAccepted,
      redirectToMergedPerson: redirectAfterMerge,
      rightPersonId: recommendation.rightPerson.id,
    });
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
    <Paper
      p="md"
      radius="md"
      style={{ borderLeft: "2px solid var(--mantine-color-yellow-6)" }}
      withBorder
    >
      <Group align="center" justify="space-between" wrap="nowrap">
        <Group align="center" wrap="nowrap">
          <Tooltip label={t("PossibleDuplicateTooltip")} maw={280} multiline withArrow>
            <Group align="center" gap={4} style={{ cursor: "default" }} wrap="nowrap">
              <IconUsers color="var(--mantine-color-yellow-6)" size={14} />
              <Text c="yellow.6" fw={600} size="sm">
                {t("PossibleDuplicateBadge")}
              </Text>
            </Group>
          </Tooltip>
          <PersonChip isClickable person={recommendation.leftPerson} />
          <Text c="dimmed" fw={500} size="sm">
            {tMerge("MergeWithLabel")}
          </Text>
          <PersonChip isClickable person={recommendation.rightPerson} />
        </Group>
        <Group>
          <Button
            leftSection={<IconX size={16} />}
            loading={isDeclining}
            onClick={handleDecline}
            variant="default"
          >
            {t("DeclineMerge")}
          </Button>
          <Button leftSection={<IconCheck size={16} />} onClick={handleAccept}>
            {t("AcceptMerge")}
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
