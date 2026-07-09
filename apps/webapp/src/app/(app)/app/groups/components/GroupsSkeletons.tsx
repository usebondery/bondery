import { Box, Group, Paper, SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/app/(app)/app/components/PageHeaderSkeleton";

/**
 * Skeleton for a single GroupCard.
 * Mirrors: Paper withBorder → header (label + count badge) + avatar preview row + member count text.
 */
function GroupCardSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <Paper p="md" radius="md" style={{ opacity }} withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Skeleton height={18} radius="sm" width={110} />
          <Skeleton height={22} radius="xl" width={40} />
        </Group>
        {/* 3 avatar previews */}
        <Group gap={-8}>
          <Skeleton height={28} radius="xl" width={28} />
          <Skeleton height={28} radius="xl" width={28} />
          <Skeleton height={28} radius="xl" width={28} />
        </Group>
        <Skeleton height={12} radius="sm" width={80} />
      </Stack>
    </Paper>
  );
}

/**
 * Full-page skeleton for the Groups page.
 * Mirrors: PageHeader (New Group button) + Paper (count + sort) + SimpleGrid of cards.
 */
export function GroupsPageSkeleton() {
  const cards = [1, 1, 0.9, 0.85, 0.75, 0.65];

  return (
    <Box p="xl">
      {/* Header: Create New Group button (~155px) */}
      <PageHeaderSkeleton primaryActionWidth={155} />

      <Paper p="md" radius="md" shadow="sm" withBorder>
        <Stack gap="md">
          {/* Toolbar: count + sort menu */}
          <Group justify="space-between">
            <Skeleton height={14} radius="sm" width={60} />
            <Skeleton height={36} radius="sm" width={110} />
          </Group>

          <SimpleGrid
            cols={{ base: 1, md: 3, sm: 2 }}
            spacing="md"
            style={{
              maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
            }}
          >
            {cards.map((opacity) => (
              <GroupCardSkeleton key={opacity} opacity={opacity} />
            ))}
          </SimpleGrid>
        </Stack>
      </Paper>
    </Box>
  );
}
