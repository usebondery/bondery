"use client";

import { useMemo } from "react";
import { Divider, Stack, Text } from "@mantine/core";
import { useTranslations, useFormatter } from "next-intl";
import type { WorkHistoryEntry, EducationEntry } from "@bondery/types";
import { WorkHistoryCard } from "./WorkHistoryCard";
import { EducationCard } from "./EducationCard";
import { LinkedInBioSection } from "./LinkedInBioSection";

interface LinkedInTabProps {
  workHistory: WorkHistoryEntry[];
  education: EducationEntry[];
  linkedinBio?: string | null;
}

/**
 * Tab content for the LinkedIn section.
 * Displays the bio, work history and education lists using their respective card components.
 *
 * @param workHistory Array of work history entries to display.
 * @param education Array of education entries to display.
 * @param linkedinBio Optional bio text scraped from the LinkedIn About section.
 */
export function LinkedInTab({ workHistory, education, linkedinBio }: LinkedInTabProps) {
  const t = useTranslations("LinkedInData");
  const format = useFormatter();

  const lastUpdated = useMemo(() => {
    const allDates = [...workHistory, ...education].map((e) => e.updatedAt).filter(Boolean);
    if (allDates.length === 0) return null;
    return new Date(Math.max(...allDates.map((d) => new Date(d).getTime())));
  }, [workHistory, education]);

  return (
    <Stack gap="lg">
      {/* Last data update timestamp */}
      {lastUpdated && (
        <Text size="xs" c="dimmed">
          {t("LastDataUpdate", {
            date: format.dateTime(lastUpdated, { dateStyle: "medium" }),
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
        <Text size="sm" fw={500}>
          {t("WorkHistory")}
        </Text>
        {workHistory.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t("NoWorkHistory")}
          </Text>
        ) : (
          <Stack gap="md">
            {workHistory.map((entry) => (
              <WorkHistoryCard key={entry.id} entry={entry} />
            ))}
          </Stack>
        )}
      </Stack>

      <Divider />

      {/* Education section */}
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          {t("Education")}
        </Text>
        {education.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t("NoEducation")}
          </Text>
        ) : (
          <Stack gap="md">
            {education.map((entry) => (
              <EducationCard key={entry.id} entry={entry} />
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
