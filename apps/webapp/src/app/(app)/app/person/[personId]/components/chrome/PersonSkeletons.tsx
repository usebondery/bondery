import { Box, Group, Paper, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/components/shell/PageHeaderSkeleton";

/**
 * Full-page skeleton for the person detail page (and myself alias).
 * Mirrors: PageHeader + optional recommendation strip + identity/notes/tabs card.
 */
export function PersonPageSkeleton() {
  return (
    <Box p="xl">
      <PageHeaderSkeleton primaryActionWidth={40} />

      <Stack gap="xl">
        <Skeleton height={72} radius="md" width="100%" />

        <Paper p="xl" radius="md" shadow="sm" withBorder>
          <Stack gap="lg">
            <Group align="flex-start" gap="lg" wrap="nowrap">
              <Skeleton height={96} radius="xl" width={96} />
              <Stack gap="sm" style={{ flex: 1 }}>
                <Skeleton height={28} radius="sm" width="45%" />
                <Skeleton height={16} radius="sm" width="60%" />
                <Skeleton height={16} radius="sm" width="40%" />
              </Stack>
            </Group>

            <Stack gap="xs">
              <Skeleton height={14} radius="sm" width={80} />
              <Skeleton height={120} radius="md" width="100%" />
            </Stack>

            <Group gap="sm">
              {["info", "social", "dates", "linkedin"].map((tab) => (
                <Skeleton height={32} key={tab} radius="sm" width={88} />
              ))}
            </Group>

            <Stack gap="sm">
              <Skeleton height={16} radius="sm" width="35%" />
              <Skeleton height={16} radius="sm" width="55%" />
              <Skeleton height={16} radius="sm" width="45%" />
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
