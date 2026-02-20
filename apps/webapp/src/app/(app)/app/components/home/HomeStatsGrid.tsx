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
    totalContactsDescription: string;
    interactionsTitle: string;
    interactionsDescription: string;
    newContactsTitle: string;
    newContactsDescription: string;
  };
}

export function HomeStatsGrid({ stats, labels }: HomeStatsGridProps) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
      <StatsCard
        title={labels.totalContactsTitle}
        value={stats.totalContacts}
        description={labels.totalContactsDescription}
        icon={<IconUsers size={32} stroke={1.5} />}
        color="blue"
      />
      <StatsCard
        title={labels.interactionsTitle}
        value={stats.thisMonthInteractions}
        description={labels.interactionsDescription}
        icon={<IconMessageCircle size={32} stroke={1.5} />}
        color="green"
      />
      <StatsCard
        title={labels.newContactsTitle}
        value={stats.newContactsThisYear}
        description={labels.newContactsDescription}
        icon={<IconUserPlus size={32} stroke={1.5} />}
        color="violet"
      />
    </SimpleGrid>
  );
}
