import { Box, Group, Paper, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/components/shell/PageHeaderSkeleton";

/**
 * Skeleton for the chat suggested-prompts grid shown on an empty chat.
 * Mirrors: SimpleGrid of prompt chips.
 */
function SuggestedPromptsSkeleton() {
  return (
    <Group gap="sm" justify="center" wrap="wrap">
      {[160, 140, 180, 150, 170, 145].map((w) => (
        <Skeleton height={36} key={w} radius="xl" width={w} />
      ))}
    </Group>
  );
}

/**
 * Full-page skeleton for the AI Assistant (Chat) page.
 * Mirrors: PageHeader + centered empty-state prompt area + input bar pinned to bottom.
 */
export function ChatPageSkeleton() {
  return (
    <Box
      p="xl"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100vh - 60px)",
      }}
    >
      {/* Header: no action buttons */}
      <PageHeaderSkeleton />

      {/* Empty chat area: centered logo + suggested prompts */}
      <Stack align="center" gap="xl" justify="center" style={{ flex: 1, paddingBottom: 80 }}>
        <Skeleton height={48} radius="xl" width={48} />
        <Stack align="center" gap="xs">
          <Skeleton height={24} radius="sm" width={220} />
          <Skeleton height={16} radius="sm" width={300} />
        </Stack>
        <SuggestedPromptsSkeleton />
      </Stack>

      {/* Input bar pinned to bottom */}
      <Paper p="sm" radius="md" style={{ bottom: 16, position: "sticky" }} withBorder>
        <Group gap="sm">
          <Skeleton height={40} radius="sm" style={{ flex: 1 }} />
          <Skeleton height={40} radius="sm" width={40} />
        </Group>
      </Paper>
    </Box>
  );
}
