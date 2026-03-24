import type { Metadata } from "next";
import { Stack, Title, Text, Alert, SimpleGrid } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import { getAuthHeaders } from "@/lib/authHeaders";
import { PageWrapper } from "../components/PageWrapper";
import { getStatsData } from "./getStatsData";
import { ActiveUsersChart } from "./components/ActiveUsersCards";
import { FunnelChart } from "./components/FunnelChart";
import { NpsCard } from "./components/NpsCard";
import { TotalUsersChart } from "./components/TotalUsersChart";
import { GithubStarsCard } from "./components/GithubStarsCard";

export const metadata: Metadata = { title: "KPIs Dashboard" };

export default async function StatsPage() {
  const t = await getTranslations("StatsPage");
  const headers = await getAuthHeaders();

  const { activeUsers, funnel, nps, totalUsers, githubStars } = await getStatsData(headers);

  // If all sections failed it's likely a 403
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
