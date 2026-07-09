import { SimpleGrid } from "@mantine/core";
import { IconMessageCircle, IconUser, IconUserPlus } from "@tabler/icons-react";
import { StatsCard } from "@/app/(app)/app/people/components/chrome/StatsCard";

interface HomeStatsGridProps {
  labels: {
    totalContactsTitle: string;
    totalContactsTooltip: string;
    interactionsTitle: string;
    interactionsTooltip: string;
    newContactsTitle: string;
    newContactsTooltip: string;
  };
  stats: {
    totalContacts: number;
    thisMonthInteractions: number;
    newContactsThisYear: number;
  };
}

export function HomeStatsGrid({ stats, labels }: HomeStatsGridProps) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
      <StatsCard
        color="blue"
        href="/app/people"
        icon={<IconUser size={32} stroke={1.5} />}
        title={labels.totalContactsTitle}
        tooltip={labels.totalContactsTooltip}
        value={stats.totalContacts}
      />
      <StatsCard
        color="green"
        href="/app/interactions"
        icon={<IconMessageCircle size={32} stroke={1.5} />}
        title={labels.interactionsTitle}
        tooltip={labels.interactionsTooltip}
        value={stats.thisMonthInteractions}
      />
      <StatsCard
        color="violet"
        href="/app/people"
        icon={<IconUserPlus size={32} stroke={1.5} />}
        title={labels.newContactsTitle}
        tooltip={labels.newContactsTooltip}
        value={stats.newContactsThisYear}
      />
    </SimpleGrid>
  );
}
