"use client";

import { Alert, Center, Loader, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useAdminStatsDashboardQuery } from "@/lib/query/hooks/useAdminStats";
import { PageWrapper } from "../../components/PageWrapper";
import { ActiveUsersChart } from "./components/ActiveUsersCards";
import { FunnelChart } from "./components/FunnelChart";
import { GithubStarsCard } from "./components/GithubStarsCard";
import { NpsCard } from "./components/NpsCard";
import { TotalUsersChart } from "./components/TotalUsersChart";

export function StatsClient() {
  const t = useWebTranslations("StatsPage");
  const { data, isLoading } = useAdminStatsDashboardQuery();

  if (isLoading && !data) {
    return (
      <PageWrapper>
        <Center py="xl">
          <Loader />
        </Center>
      </PageWrapper>
    );
  }

  const activeUsers = data?.activeUsers ?? null;
  const funnel = data?.funnel ?? null;
  const nps = data?.nps ?? null;
  const totalUsers = data?.totalUsers ?? null;
  const githubStars = data?.githubStars ?? null;

  if (!activeUsers && !funnel && !nps && !totalUsers && !githubStars) {
    return (
      <PageWrapper>
        <Alert color="red" icon={<IconChartBar size={16} />}>
          {t("Forbidden")}
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Stack gap="xl">
        <div>
          <Title order={2}>{t("Title")}</Title>
          <Text c="dimmed" size="sm">
            {t("Description")}
          </Text>
        </div>

        {(totalUsers || githubStars) && (
          <SimpleGrid cols={{ base: 1, sm: githubStars ? 2 : 1 }}>
            {totalUsers && <TotalUsersChart data={totalUsers} />}
            {githubStars && <GithubStarsCard data={githubStars} />}
          </SimpleGrid>
        )}

        {activeUsers && <ActiveUsersChart data={activeUsers} />}

        {funnel && <FunnelChart data={funnel} />}

        {nps && <NpsCard data={nps} />}
      </Stack>
    </PageWrapper>
  );
}
