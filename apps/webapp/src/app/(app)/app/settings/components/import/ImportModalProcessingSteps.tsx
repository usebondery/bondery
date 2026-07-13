"use client";

import { Center, Loader, Progress, Stack, Text } from "@mantine/core";

interface ImportProcessingStepProps {
  message: string;
}

export function ImportProcessingStep({ message }: ImportProcessingStepProps) {
  return (
    <Stack gap="lg" py="md">
      <Center>
        <Stack align="center" gap="sm">
          <Loader size="md" />
          <Text>{message}</Text>
        </Stack>
      </Center>
    </Stack>
  );
}

interface ImportProgressStepProps {
  current: number;
  importingProgressLabel: string;
  importingTitle: string;
  total: number;
}

export function ImportProgressStep({
  importingTitle,
  importingProgressLabel,
  current,
  total,
}: ImportProgressStepProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <Stack gap="lg" py="md">
      <Center>
        <Stack align="center" gap="md" maw={400} w="100%">
          <Text fw={600}>{importingTitle}</Text>
          <Progress size="lg" value={percentage} w="100%" />
          <Text c="dimmed" size="sm">
            {importingProgressLabel}
          </Text>
        </Stack>
      </Center>
    </Stack>
  );
}
