"use client";

import { formatDateRange, formatDuration } from "@bondery/helpers";
import { AnchorLink } from "@bondery/mantine-next";
import type { WorkHistoryEntry } from "@bondery/schemas";
import { Avatar, Group, Spoiler, Stack, Text } from "@mantine/core";
import { IconBriefcase } from "@tabler/icons-react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

interface WorkHistoryCardProps {
  entry: WorkHistoryEntry;
}

/**
 * Displays a single work history entry as a card with company logo,
 * clickable company name, job title, date range, and description.
 *
 * @param entry The work history entry to display.
 */
export function WorkHistoryCard({ entry }: WorkHistoryCardProps) {
  const t = useWebTranslations("LinkedInData");

  const dateRange = formatDateRange(entry.startDate, entry.endDate, t("Present"));
  const duration = formatDuration(entry.startDate, entry.endDate);

  const companyNameElement = entry.companyLinkedinUrl ? (
    <AnchorLink fw={500} href={entry.companyLinkedinUrl} size="sm" target="_blank">
      {entry.companyName}
    </AnchorLink>
  ) : (
    <Text fw={500} size="sm">
      {entry.companyName}
    </Text>
  );

  return (
    <Group align="flex-start" gap="md" wrap="nowrap">
      <Avatar
        color="initials"
        name={entry.companyName}
        radius="md"
        size={44}
        src={entry.companyLogoUrl}
      >
        <IconBriefcase size={20} />
      </Avatar>

      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        {entry.title && (
          <Text fw={600} lineClamp={1} size="sm">
            {entry.title}
          </Text>
        )}
        {companyNameElement}
        {dateRange && (
          <Text c="dimmed" size="xs">
            {dateRange}
            {duration ? ` (${duration})` : ""}
          </Text>
        )}
        {(entry.employmentType || entry.location) && (
          <Text c="dimmed" size="xs">
            {[entry.employmentType, entry.location].filter(Boolean).join(" · ")}
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
