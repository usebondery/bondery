"use client";

import { PersonChip } from "@bondery/mantine-next";
import type { MergeRecommendation } from "@bondery/schemas";
import { Paper, Text, Tooltip } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import type { ReactNode } from "react";
import {
  useFixContactsPageTranslations,
  useMergeWithModalTranslations,
} from "@/lib/i18n/generated/hooks";
import { cardStyles as styles } from "./recommendationCardLayout";

type RecommendationAccent = "blue" | "yellow";

interface RecommendationCardProps {
  /** Accent for the left border and badge text. */
  accent: RecommendationAccent;
  /** Action buttons. Share the row with the content on a wide card. */
  actions: ReactNode;
  /** Icon beside the badge label. Defaults to the duplicate icon. */
  badgeIcon?: ReactNode;
  /** Badge label above the people. Defaults to the duplicate badge. */
  badgeLabel?: string;
  /** Tooltip for the badge. Defaults to the duplicate tooltip. */
  badgeTooltip?: string;
  /** Extra content between the people and the actions, such as a progress bar. */
  children?: ReactNode;
  /** The people pair, rendered with "merge with" between them. */
  recommendation?: MergeRecommendation;
}

const ACCENT_COLOR: Record<RecommendationAccent, string> = {
  blue: "var(--mantine-color-blue-6)",
  yellow: "var(--mantine-color-yellow-6)",
};

/**
 * Shared shell for every Fix & merge card: a badge, the two people with
 * "merge with" between them, optional extra content, and the actions.
 *
 * Mobile stacks and centres the people between the badge and a half-width
 * button pair. Desktop puts the people and the actions on one row. The switch
 * is a viewport query, matching the pre-redesign card.
 *
 * Each person chip shows the shared hover card with the headline and location.
 */
export function RecommendationCard({
  accent,
  actions,
  badgeIcon,
  badgeLabel,
  badgeTooltip,
  children,
  recommendation,
}: RecommendationCardProps) {
  const t = useFixContactsPageTranslations();
  const tMerge = useMergeWithModalTranslations();
  const accentColor = ACCENT_COLOR[accent];
  const resolvedBadgeLabel = badgeLabel ?? t("PossibleDuplicateBadge");
  const resolvedBadgeTooltip = badgeTooltip ?? t("PossibleDuplicateTooltip");

  return (
    <Paper p="md" radius="md" style={{ borderLeft: `2px solid ${accentColor}` }} withBorder>
      <div className={styles.layout}>
        <div className={styles.content}>
          <Tooltip label={resolvedBadgeTooltip} position="top-start">
            <div style={{ alignItems: "center", display: "flex", gap: 4, width: "fit-content" }}>
              {badgeIcon ?? <IconUsers color={accentColor} size={14} />}
              <Text c={accentColor} fw={600} size="sm">
                {resolvedBadgeLabel}
              </Text>
            </div>
          </Tooltip>
          {recommendation ? (
            <div className={styles.people}>
              <PersonChip
                isClickable
                person={recommendation.leftPerson}
                prefetch={false}
                showHoverCard
              />
              <Text c="dimmed" fw={500} size="sm">
                {tMerge("MergeWithLabel")}
              </Text>
              <PersonChip
                isClickable
                person={recommendation.rightPerson}
                prefetch={false}
                showHoverCard
              />
            </div>
          ) : null}
          {children}
        </div>
        <div className={styles.actions}>{actions}</div>
      </div>
    </Paper>
  );
}
