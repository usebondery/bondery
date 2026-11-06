import { PressableCard } from "@bondery/mantine-next";
import { Box, Divider, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export interface DocsFooterLink {
  title: string;
  url: string;
}

interface DocsFooterNavProps {
  next?: DocsFooterLink | null;
  previous?: DocsFooterLink | null;
}

/**
 * Two equal columns on desktop, so a lone "Next" card keeps the same width as
 * it has when a "Previous" card exists. One column on narrow screens.
 *
 * The divider belongs here, so it is hidden together with the navigation.
 */
export function DocsFooterNav({ next, previous }: DocsFooterNavProps) {
  if (!previous && !next) {
    return null;
  }

  return (
    <>
      <Divider />
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" style={{ alignItems: "stretch" }}>
        {previous ? (
          <PressableCard grow href={previous.url}>
            <Stack gap={4}>
              <Box component="span" style={{ alignItems: "center", display: "flex", gap: 6 }}>
                <IconChevronLeft size={16} />
                <Text component="span" size="sm">
                  Previous
                </Text>
              </Box>
              <Text fw={600}>{previous.title}</Text>
            </Stack>
          </PressableCard>
        ) : (
          <Box visibleFrom="sm" />
        )}
        {next ? (
          <PressableCard grow href={next.url}>
            <Stack gap={4} style={{ textAlign: "right" }}>
              <Box
                component="span"
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: 6,
                  justifyContent: "flex-end",
                }}
              >
                <Text component="span" size="sm">
                  Next
                </Text>
                <IconChevronRight size={16} />
              </Box>
              <Text fw={600}>{next.title}</Text>
            </Stack>
          </PressableCard>
        ) : (
          <Box visibleFrom="sm" />
        )}
      </SimpleGrid>
    </>
  );
}
