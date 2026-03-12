"use client";

import { Button, Group, Paper, Text, Tooltip } from "@mantine/core";
import { IconBrandLinkedin } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

interface EnrichRecommendationCardProps {
  onEnrich: () => void;
}

/**
 * Recommendation card displayed on the person detail page when the contact
 * has a LinkedIn handle but has never been enriched. Matches the visual style
 * of MergeRecommendationCard but with blue accent.
 */
export function EnrichRecommendationCard({ onEnrich }: EnrichRecommendationCardProps) {
  const t = useTranslations("EnrichRecommendationCard");

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      style={{ borderLeft: "2px solid var(--mantine-color-blue-6)" }}
    >
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group align="center" wrap="nowrap">
          <Tooltip label={t("Tooltip")} multiline maw={280} withArrow>
            <Group gap={4} align="center" wrap="nowrap" style={{ cursor: "default" }}>
              <IconBrandLinkedin size={14} color="var(--mantine-color-blue-6)" />
              <Text size="sm" fw={600} c="blue.6">
                {t("Badge")}
              </Text>
            </Group>
          </Tooltip>
          <Text size="sm" fw={500}>
            {t("PersonEligibleLabel")}
          </Text>
        </Group>

        <Button color="blue" leftSection={<IconBrandLinkedin size={16} />} onClick={onEnrich}>
          {t("Enrich")}
        </Button>
      </Group>
    </Paper>
  );
}
