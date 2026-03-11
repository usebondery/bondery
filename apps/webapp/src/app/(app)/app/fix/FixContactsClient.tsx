"use client";

import { useMemo, useState } from "react";
import { Button, Group, Paper, SegmentedControl, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowMerge,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type {
  Contact,
  MergeConflictChoice,
  MergeConflictField,
  MergeRecommendation,
  MergeRecommendationsResponse,
  RefreshMergeRecommendationsResponse,
} from "@bondery/types";
import {
  PersonChip,
  errorNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { MERGE_CONFLICT_FIELDS, openMergeWithModal } from "../people/components/MergeWithModal";

interface FixContactsClientProps {
  initialRecommendations: MergeRecommendation[];
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

export function FixContactsClient({ initialRecommendations }: FixContactsClientProps) {
  const t = useTranslations("FixContactsPage");
  const tMerge = useTranslations("MergeWithModal");
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [decliningIds, setDecliningIds] = useState<Set<string>>(new Set());
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeclined, setShowDeclined] = useState(false);

  const fetchRecommendations = async (includeDeclined: boolean) => {
    const listResponse = await fetch(
      `${API_ROUTES.CONTACTS}/merge-recommendations${includeDeclined ? "?declined=true" : ""}`,
    );

    if (!listResponse.ok) {
      throw new Error(t("RefreshError"));
    }

    const payload = (await listResponse.json()) as MergeRecommendationsResponse;
    setRecommendations(payload.recommendations || []);
  };

  const mergeTexts = useMemo(
    () => ({
      errorTitle: tMerge("ErrorTitle"),
      successTitle: tMerge("SuccessTitle"),
      selectBothPeopleError: tMerge("SelectBothPeopleError"),
      differentPeopleError: tMerge("DifferentPeopleError"),
      mergingTitle: tMerge("MergingTitle"),
      mergingDescription: tMerge("MergingDescription"),
      mergeSuccess: tMerge("MergeSuccess"),
      mergeFailed: tMerge("MergeFailed"),
      mergeWithLabel: tMerge("MergeWithLabel"),
      selectLeftPerson: tMerge("SelectLeftPerson"),
      selectRightPerson: tMerge("SelectRightPerson"),
      searchPeople: tMerge("SearchPeople"),
      noPeopleFound: tMerge("NoPeopleFound"),
      cancel: tMerge("Cancel"),
      continue: tMerge("Continue"),
      back: tMerge("Back"),
      merge: tMerge("Merge"),
      noConflicts: tMerge("NoConflicts"),
      conflictHint: tMerge("ConflictHint"),
      processing: tMerge("Processing"),
      steps: {
        pick: tMerge("Steps.Pick"),
        resolve: tMerge("Steps.Resolve"),
        process: tMerge("Steps.Process"),
      },
      fields: Object.fromEntries(
        MERGE_CONFLICT_FIELDS.map((field) => [field, tMerge(`Fields.${field}`)]),
      ) as Record<MergeConflictField, string>,
    }),
    [tMerge],
  );

  const handleAccept = (recommendation: MergeRecommendation) => {
    const initialConflictChoices = computeNameConflictChoices(
      recommendation.leftPerson,
      recommendation.rightPerson,
    );
    openMergeWithModal({
      contacts: [recommendation.leftPerson, recommendation.rightPerson],
      leftPersonId: recommendation.leftPerson.id,
      rightPersonId: recommendation.rightPerson.id,
      disableLeftPicker: true,
      disableRightPicker: true,
      redirectToMergedPerson: false,
      titleText: tMerge("ModalTitle"),
      texts: mergeTexts,
      onSuccess: () => {
        setRecommendations((prev) => prev.filter((r) => r.id !== recommendation.id));
      },
      initialConflictChoices,
    });
  };

  const handleDecline = async (recommendationId: string) => {
    setDecliningIds((prev) => new Set(prev).add(recommendationId));

    try {
      const response = await fetch(
        `${API_ROUTES.CONTACTS}/merge-recommendations/${recommendationId}/decline`,
        {
          method: "PATCH",
        },
      );

      if (!response.ok) {
        throw new Error(t("DeclineError"));
      }

      setRecommendations((prev) => prev.filter((item) => item.id !== recommendationId));
      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description: t("DeclineSuccess"),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: error instanceof Error ? error.message : t("DeclineError"),
        }),
      );
    } finally {
      setDecliningIds((prev) => {
        const next = new Set(prev);
        next.delete(recommendationId);
        return next;
      });
    }
  };

  const handleRefreshSuggestions = async () => {
    setIsRefreshing(true);

    try {
      const refreshResponse = await fetch(`${API_ROUTES.CONTACTS}/merge-recommendations/refresh`, {
        method: "POST",
      });

      if (!refreshResponse.ok) {
        throw new Error(t("RefreshError"));
      }

      const refreshPayload = (await refreshResponse.json()) as RefreshMergeRecommendationsResponse;
      const recommendationsCount = Math.max(0, Number(refreshPayload.recommendationsCount) || 0);

      await fetchRecommendations(false);
      setShowDeclined(false);

      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description:
            recommendationsCount === 0
              ? t("NoNewSuggestionsFound")
              : t("NewSuggestionsFound", { count: recommendationsCount }),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: error instanceof Error ? error.message : t("RefreshError"),
        }),
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRecommendationViewChange = async (nextView: "active" | "hidden") => {
    const nextShowDeclined = nextView === "hidden";

    if (showDeclined === nextShowDeclined) {
      return;
    }

    setIsRefreshing(true);

    try {
      await fetchRecommendations(nextShowDeclined);
      setShowDeclined(nextShowDeclined);
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: error instanceof Error ? error.message : t("RefreshError"),
        }),
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRestore = async (recommendationId: string) => {
    setRestoringIds((prev) => new Set(prev).add(recommendationId));

    try {
      const response = await fetch(
        `${API_ROUTES.CONTACTS}/merge-recommendations/${recommendationId}/restore`,
        {
          method: "PATCH",
        },
      );

      if (!response.ok) {
        throw new Error(t("RestoreError"));
      }

      setRecommendations((prev) => prev.filter((item) => item.id !== recommendationId));
      notifications.show(
        successNotificationTemplate({
          title: t("SuccessTitle"),
          description: t("RestoreSuccess"),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: t("ErrorTitle"),
          description: error instanceof Error ? error.message : t("RestoreError"),
        }),
      );
    } finally {
      setRestoringIds((prev) => {
        const next = new Set(prev);
        next.delete(recommendationId);
        return next;
      });
    }
  };

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader
          icon={IconArrowMerge}
          title={t("Title")}
          secondaryAction={
            <SegmentedControl
              value={showDeclined ? "hidden" : "active"}
              onChange={(value) => handleRecommendationViewChange(value as "active" | "hidden")}
              disabled={isRefreshing}
              data={[
                {
                  value: "active",
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconEye size={14} />
                      <span>{t("ActiveRecommendations")}</span>
                    </Group>
                  ),
                },
                {
                  value: "hidden",
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconEyeOff size={14} />
                      <span>{t("HiddenRecommendations")}</span>
                    </Group>
                  ),
                },
              ]}
            />
          }
          primaryAction={
            <Button
              size="md"
              leftSection={<IconRefresh size={16} />}
              onClick={handleRefreshSuggestions}
              loading={isRefreshing}
            >
              {t("RefreshSuggestions")}
            </Button>
          }
          description={t("Description")}
        />

        {recommendations.length === 0 ? (
          <Paper withBorder radius="md" p="md">
            <Text c="dimmed" size="sm">
              {showDeclined ? t("DeclinedEmpty") : t("Empty")}
            </Text>
          </Paper>
        ) : (
          <Stack gap="sm">
            {recommendations.map((recommendation) => (
              <Paper key={recommendation.id} withBorder radius="md" p="md">
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Group align="center" wrap="nowrap">
                    <PersonChip person={recommendation.leftPerson} isClickable />
                    <Text c="dimmed" size="sm" fw={500}>
                      {tMerge("MergeWithLabel")}
                    </Text>
                    <PersonChip person={recommendation.rightPerson} isClickable />
                  </Group>

                  <Group>
                    {showDeclined ? (
                      <Button
                        variant="default"
                        leftSection={<IconRefresh size={16} />}
                        onClick={() => handleRestore(recommendation.id)}
                        loading={restoringIds.has(recommendation.id)}
                      >
                        {t("RestoreSuggestion")}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="default"
                          leftSection={<IconX size={16} />}
                          onClick={() => handleDecline(recommendation.id)}
                          loading={decliningIds.has(recommendation.id)}
                        >
                          {t("DeclineMerge")}
                        </Button>
                        <Button
                          leftSection={<IconCheck size={16} />}
                          onClick={() => handleAccept(recommendation)}
                        >
                          {t("AcceptMerge")}
                        </Button>
                      </>
                    )}
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </PageWrapper>
  );
}
