import { SimpleGrid } from "@mantine/core";
import { IconMessageCircle, IconUserPlus, IconUsers } from "@tabler/icons-react";
import { StatsCard } from "@/app/(app)/app/people/components/StatsCard";

interface HomeStatsGridProps {
  stats: {
    totalContacts: number;
    thisMonthInteractions: number;
    newContactsThisYear: number;
  };
  labels: {
    totalContactsTitle: string;
    totalContactsTooltip: string;
    interactionsTitle: string;
    interactionsTooltip: string;
    newContactsTitle: string;
    newContactsTooltip: string;
  };
}

export function HomeStatsGrid({ stats, labels }: HomeStatsGridProps) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
      <StatsCard
        title={labels.totalContactsTitle}
        value={stats.totalContacts}
        tooltip={labels.totalContactsTooltip}
        icon={<IconUsers size={32} stroke={1.5} />}
        color="blue"
        href="/app/people"
      />
      <StatsCard
        title={labels.interactionsTitle}
        value={stats.thisMonthInteractions}
        tooltip={labels.interactionsTooltip}
        icon={<IconMessageCircle size={32} stroke={1.5} />}
        color="green"
        href="/app/interactions"
      />
      <StatsCard
        title={labels.newContactsTitle}
        value={stats.newContactsThisYear}
        tooltip={labels.newContactsTooltip}
        icon={<IconUserPlus size={32} stroke={1.5} />}
        color="violet"
        href="/app/people"
      />
    </SimpleGrid>
  );
}
