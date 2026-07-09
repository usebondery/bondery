"use client";

import { Card, Group, RingProgress, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconMoodNeutral, IconMoodSad, IconMoodSmile } from "@tabler/icons-react";
import type { NpsData } from "@/lib/api/resources/stats";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

interface NpsCardProps {
  data: NpsData;
}

export function NpsCard({ data }: NpsCardProps) {
  const t = useWebTranslations("StatsPage");

  const total = data.promoters + data.passives + data.detractors;
  const promoterPct = total > 0 ? Math.round((data.promoters / total) * 100) : 0;
  const passivePct = total > 0 ? Math.round((data.passives / total) * 100) : 0;
  const detractorPct = total > 0 ? Math.round((data.detractors / total) * 100) : 0;

  return (
    <Card padding="lg" withBorder>
      <Text fw={500} mb="md">
        {t("NPS")}
      </Text>

      <Group align="flex-start" gap="xl">
        <Stack align="center" gap={4}>
          <RingProgress
            label={
              <Text fw={700} size="lg" ta="center">
                {data.score !== null ? data.score : "–"}
              </Text>
            }
            roundCaps
            sections={[
              { color: "teal", value: promoterPct },
              { color: "yellow", value: passivePct },
              { color: "red", value: detractorPct },
            ]}
            size={120}
          />
          <Text c="dimmed" size="xs">
            {t("NPSScore")}
          </Text>
        </Stack>

        <SimpleGrid cols={1} spacing="xs">
          <Group gap="xs">
            <ThemeIcon color="teal" size="sm" variant="light">
              <IconMoodSmile size={14} />
            </ThemeIcon>
            <Text size="sm">
              {t("Promoters")}: {data.promoters} ({promoterPct}%)
            </Text>
          </Group>
          <Group gap="xs">
            <ThemeIcon color="yellow" size="sm" variant="light">
              <IconMoodNeutral size={14} />
            </ThemeIcon>
            <Text size="sm">
              {t("Passives")}: {data.passives} ({passivePct}%)
            </Text>
          </Group>
          <Group gap="xs">
            <ThemeIcon color="red" size="sm" variant="light">
              <IconMoodSad size={14} />
            </ThemeIcon>
            <Text size="sm">
              {t("Detractors")}: {data.detractors} ({detractorPct}%)
            </Text>
          </Group>
          <Text c="dimmed" mt="xs" size="xs">
            {t("Responses")}: {data.responses}
          </Text>
        </SimpleGrid>
      </Group>
    </Card>
  );
}
