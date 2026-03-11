"use client";

import { Avatar, Group, Spoiler, Stack, Text } from "@mantine/core";
import { IconBriefcase } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { WorkHistoryEntry } from "@bondery/types";
import { formatDateRange, formatDuration } from "@bondery/helpers";
import { AnchorLink } from "@bondery/mantine-next";

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
  const t = useTranslations("LinkedInData");

  const dateRange = formatDateRange(entry.startDate, entry.endDate, t("Present"));
  const duration = formatDuration(entry.startDate, entry.endDate);

  const companyNameElement = entry.companyLinkedinUrl ? (
    <AnchorLink href={entry.companyLinkedinUrl} target="_blank" fw={500} size="sm">
      {entry.companyName}
    </AnchorLink>
  ) : (
    <Text fw={500} size="sm">
      {entry.companyName}
    </Text>
  );

  return (
    <Group align="flex-start" wrap="nowrap" gap="md">
      <Avatar
        src={entry.companyLogoUrl}
        name={entry.companyName}
        radius="md"
        size={44}
        color="initials"
      >
        <IconBriefcase size={20} />
      </Avatar>

      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        {entry.title && (
          <Text size="sm" fw={600} lineClamp={1}>
            {entry.title}
          </Text>
        )}
        {companyNameElement}
        {dateRange && (
          <Text size="xs" c="dimmed">
            {dateRange}
            {duration ? ` (${duration})` : ""}
          </Text>
        )}
        {(entry.employmentType || entry.location) && (
          <Text size="xs" c="dimmed">
            {[entry.employmentType, entry.location].filter(Boolean).join(" · ")}
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
