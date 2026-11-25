"use client";

import { Center, Loader, Progress, Stack, Text } from "@mantine/core";

interface ImportProcessingStepProps {
  description?: string;
  message: string;
}

interface ImportProgressStepProps {
  current: number;
  importingProgressLabel: string;
  importingTitle: string;
  total: number;
}

export function ImportProcessingStep({ description, message }: ImportProcessingStepProps) {
  return (
    <Stack gap="lg" py="md">
      <Center>
        <Stack align="center" gap="sm">
          <Loader size="md" />
          <Text>{message}</Text>
          {description ? (
            <Text c="dimmed" size="sm" ta="center">
              {description}
            </Text>
          ) : null}
        </Stack>
      </Center>
    </Stack>
  );
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
