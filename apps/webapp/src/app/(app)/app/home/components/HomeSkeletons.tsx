import { Box, Group, Paper, SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/app/(app)/app/components/PageHeaderSkeleton";

/**
 * Skeleton for a single StatsCard (icon + label + value, Paper withBorder).
 * Mirrors: Group justify="space-between" → left (label+value) / right (ThemeIcon 60×60).
 */
function StatCardSkeleton() {
  return (
    <Paper withBorder p="md" shadow="none">
      <Group justify="space-between" align="flex-start">
        <Stack gap="xs">
          <Skeleton height={12} width={90} radius="sm" />
          <Skeleton height={28} width={60} radius="sm" mt={4} />
        </Stack>
        <Skeleton height={60} width={60} radius="md" />
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
      <Skeleton height={32} width={32} radius="xl" />
      <Stack gap={4} style={{ flex: 1 }}>
        <Skeleton height={14} width="60%" radius="sm" />
        <Skeleton height={12} width="35%" radius="sm" />
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
      <Skeleton height={32} width={32} radius="xl" />
      <Skeleton height={14} width={120} radius="sm" />
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
      <PageHeaderSkeleton secondaryActionWidth={110} primaryActionWidth={140} />

      <Stack gap="xl">
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
            <Skeleton height={28} width={180} radius="sm" />
            <Stack
              gap={0}
              style={{
                maskImage:
                  "linear-gradient(to bottom, black 60%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 60%, transparent 100%)",
              }}
            >
              {[1, 0.85, 0.65, 0.45, 0.25].map((opacity, i) => (
                <ActivityRowSkeleton key={i} opacity={opacity} />
              ))}
            </Stack>
          </Stack>

          {/* Right: Upcoming reminders + recently added */}
          <Stack gap="xl">
            <Stack gap="md">
              <Skeleton height={28} width={200} radius="sm" />
              {[1, 0.8, 0.6].map((opacity, i) => (
                <Paper
                  key={i}
                  withBorder
                  p="sm"
                  radius="md"
                  style={{ opacity }}
                >
                  <Group gap="sm">
                    <Skeleton height={36} width={36} radius="xl" />
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Skeleton height={14} width="55%" radius="sm" />
                      <Skeleton height={12} width="35%" radius="sm" />
                    </Stack>
                  </Group>
                </Paper>
              ))}
            </Stack>

            <Stack gap="md">
              <Skeleton height={28} width={160} radius="sm" />
              {[1, 0.8, 0.6].map((opacity, i) => (
                <PersonRowSkeleton key={i} opacity={opacity} />
              ))}
            </Stack>
          </Stack>
        </SimpleGrid>
      </Stack>
    </Box>
  );
}
