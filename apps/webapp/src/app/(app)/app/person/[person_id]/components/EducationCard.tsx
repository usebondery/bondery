"use client";

import { Avatar, Group, Spoiler, Stack, Text } from "@mantine/core";
import { IconSchool } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { EducationEntry } from "@bondery/types";
import { formatDateRange, formatDuration } from "@bondery/helpers";
import { AnchorLink } from "@bondery/mantine-next";

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
  const t = useTranslations("LinkedInData");

  const dateRange = formatDateRange(entry.startDate, entry.endDate, t("Present"));
  const duration = formatDuration(entry.startDate, entry.endDate);

  const schoolNameElement = entry.schoolLinkedinUrl ? (
    <AnchorLink href={entry.schoolLinkedinUrl} target="_blank" fw={500} size="sm">
      {entry.schoolName}
    </AnchorLink>
  ) : (
    <Text fw={500} size="sm">
      {entry.schoolName}
    </Text>
  );

  return (
    <Group align="flex-start" wrap="nowrap" gap="md">
      <Avatar
        src={entry.schoolLogoUrl}
        name={entry.schoolName}
        radius="md"
        size={44}
        color="initials"
      >
        <IconSchool size={20} />
      </Avatar>

      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        {schoolNameElement}
        {entry.degree && (
          <Text size="sm" fw={600} lineClamp={1}>
            {entry.degree}
          </Text>
        )}
        {dateRange && (
          <Text size="xs" c="dimmed">
            {dateRange}
            {duration ? ` (${duration})` : ""}
          </Text>
        )}
        {entry.description && (
          <Spoiler maxHeight={60} showLabel={t("ShowMore")} hideLabel={t("ShowLess")} mt={4}>
            <Text size="xs" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
              {entry.description}
            </Text>
          </Spoiler>
        )}
      </Stack>
    </Group>
  );
}
