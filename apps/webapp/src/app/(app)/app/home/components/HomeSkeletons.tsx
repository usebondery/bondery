import { Box, Group, Paper, SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { GettingStartedRailSkeleton } from "@/components/home/GettingStartedRailSkeleton";
import { PageHeaderSkeleton } from "@/components/shell/PageHeaderSkeleton";

/**
 * Skeleton for a single StatsCard (icon + label + value, Paper withBorder).
 * Mirrors: Group justify="space-between" → left (label+value) / right (ThemeIcon 60×60).
 */
function StatCardSkeleton() {
  return (
    <Paper p="md" shadow="none" withBorder>
      <Group align="flex-start" justify="space-between">
        <Stack gap="xs">
          <Skeleton height={12} radius="sm" width={90} />
          <Skeleton height={28} mt={4} radius="sm" width={60} />
        </Stack>
        <Skeleton height={60} radius="md" width={60} />
      </Group>
    </Paper>
  );
}

/**
 * Skeleton for a single interaction/activity row in the timeline preview.
 * Mirrors InteractionsList row: avatar group + title line + date line.
 */
function ActivityRowSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <Group
      gap="sm"
      py="sm"
      style={{
        borderBottom: "1px solid var(--mantine-color-default-border)",
        opacity,
      }}
    >
      <Skeleton height={32} radius="xl" width={32} />
      <Stack gap={4} style={{ flex: 1 }}>
        <Skeleton height={14} radius="sm" width="60%" />
        <Skeleton height={12} radius="sm" width="35%" />
      </Stack>
    </Group>
  );
}

/**
 * Skeleton for a single person row (PersonChip shape) used in "Recently Added"
 * and "Recently Interacted" lists.
 */
function PersonRowSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <Group gap="xs" py="xs" style={{ opacity }}>
      <Skeleton height={32} radius="xl" width={32} />
      <Skeleton height={14} radius="sm" width={120} />
    </Group>
  );
}

/**
 * Full-page skeleton for the Home page.
 * Mirrors: PageHeader + StatsGrid (3 cards) + 2-col grid (Timeline | Reminders+Recent).
 */
export function HomePageSkeleton() {
  return (
    <Box p="xl">
      {/* Header: Add Person (outline, ~110px) + Log Interaction (~140px) */}
      <PageHeaderSkeleton primaryActionWidth={140} secondaryActionWidth={110} />

      <Stack gap="xl">
        <GettingStartedRailSkeleton />

        {/* Stats row: 3 equal-width cards */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </SimpleGrid>

        {/* Two-column section */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" verticalSpacing="xl">
          {/* Left: Recent interactions timeline */}
          <Stack gap="md">
            <Skeleton height={28} radius="sm" width={180} />
            <Stack
              gap={0}
              style={{
                maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
              }}
            >
              {[1, 0.85, 0.65, 0.45, 0.25].map((opacity) => (
                <ActivityRowSkeleton key={opacity} opacity={opacity} />
              ))}
            </Stack>
          </Stack>

          {/* Right: Upcoming reminders + recently added */}
          <Stack gap="xl">
            <Stack gap="md">
              <Skeleton height={28} radius="sm" width={200} />
              {[1, 0.8, 0.6].map((opacity) => (
                <Paper key={opacity} p="sm" radius="md" style={{ opacity }} withBorder>
                  <Group gap="sm">
                    <Skeleton height={36} radius="xl" width={36} />
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Skeleton height={14} radius="sm" width="55%" />
                      <Skeleton height={12} radius="sm" width="35%" />
                    </Stack>
                  </Group>
                </Paper>
              ))}
            </Stack>

            <Stack gap="md">
              <Skeleton height={28} radius="sm" width={160} />
              {[1, 0.8, 0.6].map((opacity) => (
                <PersonRowSkeleton key={opacity} opacity={opacity} />
              ))}
            </Stack>
          </Stack>
        </SimpleGrid>
      </Stack>
    </Box>
  );
}
