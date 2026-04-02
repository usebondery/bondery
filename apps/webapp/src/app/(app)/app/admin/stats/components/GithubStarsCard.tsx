import { Card, Text, Group, ThemeIcon } from "@mantine/core";
import { IconStar } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import type { GithubStarsData } from "../getStatsData";

interface GithubStarsCardProps {
  data: GithubStarsData;
}

export async function GithubStarsCard({ data }: GithubStarsCardProps) {
  const t = await getTranslations("StatsPage");

  return (
    <Card withBorder padding="lg">
      <Group gap="sm" mb="xs">
        <ThemeIcon variant="light" color="yellow" size="md" radius="md">
          <IconStar size={16} />
        </ThemeIcon>
        <Text fw={500}>{t("GithubStars")}</Text>
      </Group>
      <Text size="xs" c="dimmed" mb="md">
        {t("GithubStarsDescription", { repo: data.repo })}
      </Text>
      <Text fz={48} fw={700} lh={1}>
        {data.stars.toLocaleString()}
      </Text>
    </Card>
  );
}
