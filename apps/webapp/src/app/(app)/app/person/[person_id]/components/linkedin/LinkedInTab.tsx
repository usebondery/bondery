"use client";

import type { EducationEntry, WorkHistoryEntry } from "@bondery/schemas";
import { Button, Divider, Stack, Text } from "@mantine/core";
import { IconBrandLinkedin } from "@tabler/icons-react";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { EducationCard } from "./EducationCard";
import { LinkedInBioSection } from "./LinkedInBioSection";
import { WorkHistoryCard } from "./WorkHistoryCard";

interface LinkedInTabProps {
  education: EducationEntry[];
  enrichLabel: string;
  linkedinBio?: string | null;
  onEnrich: () => void;
  syncedAt?: string | null;
  workHistory: WorkHistoryEntry[];
}

/**
 * Tab content for the LinkedIn section.
 * Displays the bio, work history and education lists using their respective card components.
 * When no LinkedIn data exists, shows a centered enrich button.
 *
 * @param workHistory Array of work history entries to display.
 * @param education Array of education entries to display.
 * @param linkedinBio Optional bio text scraped from the LinkedIn About section.
 * @param onEnrich Callback to trigger LinkedIn enrichment.
 * @param enrichLabel Label for the enrich button.
 */
export function LinkedInTab({
  workHistory,
  education,
  linkedinBio,
  syncedAt,
  onEnrich,
  enrichLabel,
}: LinkedInTabProps) {
  const t = useWebTranslations("LinkedInData");
  const format = useFormatter();

  const isEmpty = workHistory.length === 0 && education.length === 0 && !linkedinBio;

  const lastSynced = syncedAt ? new Date(syncedAt) : null;

  if (isEmpty) {
    return (
      <Stack align="center" justify="center" py="xl">
        <Button leftSection={<IconBrandLinkedin size={18} />} onClick={onEnrich} variant="light">
          {enrichLabel}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      {/* Last synced timestamp */}
      {lastSynced && (
        <Text c="dimmed" size="xs">
          {t("LastDataUpdate", {
            date: format.dateTime(lastSynced, { dateStyle: "medium" }),
          })}
        </Text>
      )}
      {/* Bio / About section */}
      {linkedinBio && (
        <>
          <LinkedInBioSection bio={linkedinBio} />
          <Divider />
        </>
      )}

      {/* Work history section */}
      <Stack gap="xs">
        <Text fw={500} size="sm">
          {t("WorkHistory")}
        </Text>
        {workHistory.length === 0 ? (
          <Text c="dimmed" size="sm">
            {t("NoWorkHistory")}
          </Text>
        ) : (
          <Stack gap="md">
            {workHistory.map((entry) => (
              <WorkHistoryCard entry={entry} key={entry.id} />
            ))}
          </Stack>
        )}
      </Stack>

      <Divider />

      {/* Education section */}
      <Stack gap="xs">
        <Text fw={500} size="sm">
          {t("Education")}
        </Text>
        {education.length === 0 ? (
          <Text c="dimmed" size="sm">
            {t("NoEducation")}
          </Text>
        ) : (
          <Stack gap="md">
            {education.map((entry) => (
              <EducationCard entry={entry} key={entry.id} />
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
