"use client";

import { formatDateRange, formatDuration } from "@bondery/helpers";
import { AnchorLink } from "@bondery/mantine-next";
import type { EducationEntry } from "@bondery/schemas";
import { Avatar, Group, Spoiler, Stack, Text } from "@mantine/core";
import { IconSchool } from "@tabler/icons-react";
import { useLinkedInDataTranslations } from "@/lib/i18n/generated/hooks";

interface EducationCardProps {
  entry: EducationEntry;
}

/**
 * Displays a single education entry as a card with school logo,
 * clickable school name, degree, date range, and description.
 *
 * @param entry The education entry to display.
 */
export function EducationCard({ entry }: EducationCardProps) {
  const t = useLinkedInDataTranslations();

  const dateRange = formatDateRange(entry.startDate, entry.endDate, t("Present"));
  const duration = formatDuration(entry.startDate, entry.endDate);

  const schoolNameElement = entry.schoolLinkedinUrl ? (
    <AnchorLink fw={500} href={entry.schoolLinkedinUrl} size="sm" target="_blank">
      {entry.schoolName}
    </AnchorLink>
  ) : (
    <Text fw={500} size="sm">
      {entry.schoolName}
    </Text>
  );

  return (
    <Group align="flex-start" gap="md" wrap="nowrap">
      <Avatar
        color="initials"
        name={entry.schoolName}
        radius="md"
        size={44}
        src={entry.schoolLogoUrl}
      >
        <IconSchool size={20} />
      </Avatar>

      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        {schoolNameElement}
        {entry.degree && (
          <Text fw={600} lineClamp={1} size="sm">
            {entry.degree}
          </Text>
        )}
        {dateRange && (
          <Text c="dimmed" size="xs">
            {dateRange}
            {duration ? ` (${duration})` : ""}
          </Text>
        )}
        {entry.description && (
          <Spoiler hideLabel={t("ShowLess")} maxHeight={60} mt={4} showLabel={t("ShowMore")}>
            <Text c="dimmed" size="xs" style={{ whiteSpace: "pre-wrap" }}>
              {entry.description}
            </Text>
          </Spoiler>
        )}
      </Stack>
    </Group>
  );
}
