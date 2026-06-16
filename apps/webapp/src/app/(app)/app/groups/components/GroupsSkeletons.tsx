import { Box, Group, Paper, SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/app/(app)/app/components/PageHeaderSkeleton";

/**
 * Skeleton for a single GroupCard.
 * Mirrors: Paper withBorder → header (label + count badge) + avatar preview row + member count text.
 */
function GroupCardSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <Paper withBorder p="md" radius="md" style={{ opacity }}>
      <Stack gap="sm">
        <Group justify="space-between">
          <Skeleton height={18} width={110} radius="sm" />
          <Skeleton height={22} width={40} radius="xl" />
        </Group>
        {/* 3 avatar previews */}
        <Group gap={-8}>
          <Skeleton height={28} width={28} radius="xl" />
          <Skeleton height={28} width={28} radius="xl" />
          <Skeleton height={28} width={28} radius="xl" />
        </Group>
        <Skeleton height={12} width={80} radius="sm" />
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

      <Paper withBorder shadow="sm" radius="md" p="md">
        <Stack gap="md">
          {/* Toolbar: count + sort menu */}
          <Group justify="space-between">
            <Skeleton height={14} width={60} radius="sm" />
            <Skeleton height={36} width={110} radius="sm" />
          </Group>

          <SimpleGrid
            cols={{ base: 1, sm: 2, md: 3 }}
            spacing="md"
            style={{
              maskImage:
                "linear-gradient(to bottom, black 55%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 55%, transparent 100%)",
            }}
          >
            {cards.map((opacity, i) => (
              <GroupCardSkeleton key={i} opacity={opacity} />
            ))}
          </SimpleGrid>
        </Stack>
      </Paper>
    </Box>
  );
}
