"use client";

import { Card, Group, Text, ThemeIcon } from "@mantine/core";
import { IconStar } from "@tabler/icons-react";
import type { GithubStarsData } from "@/lib/api/resources/stats";
import { useStatsPageTranslations } from "@/lib/i18n/generated/hooks";

interface GithubStarsCardProps {
  data: GithubStarsData;
}

export function GithubStarsCard({ data }: GithubStarsCardProps) {
  const t = useStatsPageTranslations();

  return (
    <Card padding="lg" withBorder>
      <Group gap="sm" mb="xs">
        <ThemeIcon color="yellow" radius="md" size="md" variant="light">
          <IconStar size={16} />
        </ThemeIcon>
        <Text fw={500}>{t("GithubStars")}</Text>
      </Group>
      <Text c="dimmed" mb="md" size="xs">
        {t("GithubStarsDescription", { repo: data.repo })}
      </Text>
      <Text fw={700} fz={48} lh={1}>
        {data.stars.toLocaleString()}
      </Text>
    </Card>
  );
}
