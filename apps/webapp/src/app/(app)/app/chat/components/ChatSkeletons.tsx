import { Box, Group, Paper, Skeleton, Stack } from "@mantine/core";
import { PageHeaderSkeleton } from "@/app/(app)/app/components/PageHeaderSkeleton";

/**
 * Skeleton for the chat suggested-prompts grid shown on an empty chat.
 * Mirrors: SimpleGrid of prompt chips.
 */
function SuggestedPromptsSkeleton() {
  return (
    <Group gap="sm" justify="center" wrap="wrap">
      {[160, 140, 180, 150, 170, 145].map((w, i) => (
        <Skeleton key={i} height={36} width={w} radius="xl" />
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
      <Stack
        gap="xl"
        align="center"
        justify="center"
        style={{ flex: 1, paddingBottom: 80 }}
      >
        <Skeleton height={48} width={48} radius="xl" />
        <Stack gap="xs" align="center">
          <Skeleton height={24} width={220} radius="sm" />
          <Skeleton height={16} width={300} radius="sm" />
        </Stack>
        <SuggestedPromptsSkeleton />
      </Stack>

      {/* Input bar pinned to bottom */}
      <Paper
        withBorder
        radius="md"
        p="sm"
        style={{ position: "sticky", bottom: 16 }}
      >
        <Group gap="sm">
          <Skeleton height={40} radius="sm" style={{ flex: 1 }} />
          <Skeleton height={40} width={40} radius="sm" />
        </Group>
      </Paper>
    </Box>
  );
}
