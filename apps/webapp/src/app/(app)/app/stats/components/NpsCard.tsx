"use client";

import { Card, Text, Group, SimpleGrid, RingProgress, Stack, ThemeIcon } from "@mantine/core";
import { IconMoodSmile, IconMoodNeutral, IconMoodSad } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { NpsData } from "../getStatsData";

interface NpsCardProps {
  data: NpsData;
}

export function NpsCard({ data }: NpsCardProps) {
  const t = useTranslations("StatsPage");

  const total = data.promoters + data.passives + data.detractors;
  const promoterPct = total > 0 ? Math.round((data.promoters / total) * 100) : 0;
  const passivePct = total > 0 ? Math.round((data.passives / total) * 100) : 0;
  const detractorPct = total > 0 ? Math.round((data.detractors / total) * 100) : 0;

  return (
    <Card withBorder padding="lg">
      <Text fw={500} mb="md">
        {t("NPS")}
      </Text>

      <Group align="flex-start" gap="xl">
        <Stack align="center" gap={4}>
          <RingProgress
            size={120}
            thickness={12}
            roundCaps
            sections={[
              { value: promoterPct, color: "teal" },
              { value: passivePct, color: "yellow" },
              { value: detractorPct, color: "red" },
            ]}
            label={
              <Text ta="center" fw={700} size="lg">
                {data.score !== null ? data.score : "–"}
              </Text>
            }
          />
          <Text size="xs" c="dimmed">
            {t("NPSScore")}
          </Text>
        </Stack>

        <SimpleGrid cols={1} spacing="xs">
          <Group gap="xs">
            <ThemeIcon variant="light" color="teal" size="sm">
              <IconMoodSmile size={14} />
            </ThemeIcon>
            <Text size="sm">
              {t("Promoters")}: {data.promoters} ({promoterPct}%)
            </Text>
          </Group>
          <Group gap="xs">
            <ThemeIcon variant="light" color="yellow" size="sm">
              <IconMoodNeutral size={14} />
            </ThemeIcon>
            <Text size="sm">
              {t("Passives")}: {data.passives} ({passivePct}%)
            </Text>
          </Group>
          <Group gap="xs">
            <ThemeIcon variant="light" color="red" size="sm">
              <IconMoodSad size={14} />
            </ThemeIcon>
            <Text size="sm">
              {t("Detractors")}: {data.detractors} ({detractorPct}%)
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            {t("Responses")}: {data.responses}
          </Text>
        </SimpleGrid>
      </Group>
    </Card>
  );
}
