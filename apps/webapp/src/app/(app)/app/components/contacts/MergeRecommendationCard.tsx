"use client";

import { useState } from "react";
import { Button, Group, Paper, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconCopy, IconUser, IconUsers, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type {
  Contact,
  MergeConflictChoice,
  MergeConflictField,
  MergeRecommendation,
} from "@bondery/types";
import {
  PersonChip,
  errorNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import {
  MERGE_CONFLICT_FIELDS,
  openMergeWithModal,
  type MergeWithModalTexts,
} from "../../people/components/MergeWithModal";

interface MergeRecommendationCardProps {
  recommendation: MergeRecommendation;
  contacts: Contact[];
  mergeTexts: MergeWithModalTexts;
  onAccepted: () => void;
  onDeclined: () => void;
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
  if (!l || !r) return null;
  const leftHas = hasDiacritics(l);
  const rightHas = hasDiacritics(r);
  if (leftHas && !rightHas) return "left";
  if (!leftHas && rightHas) return "right";
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
    if (preference) choices[field] = preference;
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
  mergeTexts,
  onAccepted,
  onDeclined,
  redirectAfterMerge = false,
}: MergeRecommendationCardProps) {
  const t = useTranslations("FixContactsPage");
  const tMerge = useTranslations("MergeWithModal");
  const [isDeclining, setIsDeclining] = useState(false);

  const handleAccept = () => {
    const initialConflictChoices = computeNameConflictChoices(
      recommendation.leftPerson,
      recommendation.rightPerson,
    );
    openMergeWithModal({
      contacts,
      leftPersonId: recommendation.leftPerson.id,
      rightPersonId: recommendation.rightPerson.id,
      disableLeftPicker: true,
      disableRightPicker: true,
      redirectToMergedPerson: redirectAfterMerge,
      titleText: tMerge("ModalTitle"),
      texts: mergeTexts,
      onSuccess: onAccepted,
      initialConflictChoices,
    });
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      const response = await fetch(
        `${API_ROUTES.CONTACTS}/merge-recommendations/${recommendation.id}/decline`,
        { method: "PATCH" },
      );
      if (!response.ok) {
        throw new Error(t("DeclineError"));
      }
      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description: t("DeclineSuccess"),
        }),
      );
      onDeclined();
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: error instanceof Error ? error.message : t("DeclineError"),
        }),
      );
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      style={{ borderLeft: "2px solid var(--mantine-color-yellow-6)" }}
    >
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group align="center" wrap="nowrap">
          <Tooltip label={t("PossibleDuplicateTooltip")} multiline maw={280} withArrow>
            <Group gap={4} align="center" wrap="nowrap" style={{ cursor: "default" }}>
              <IconUsers size={14} color="var(--mantine-color-yellow-6)" />
              <Text size="sm" fw={600} c="yellow.6">
                {t("PossibleDuplicateBadge")}
              </Text>
            </Group>
          </Tooltip>
          <PersonChip person={recommendation.leftPerson} isClickable />
          <Text c="dimmed" size="sm" fw={500}>
            {tMerge("MergeWithLabel")}
          </Text>
          <PersonChip person={recommendation.rightPerson} isClickable />
        </Group>
        <Group>
          <Button
            variant="default"
            leftSection={<IconX size={16} />}
            onClick={handleDecline}
            loading={isDeclining}
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
