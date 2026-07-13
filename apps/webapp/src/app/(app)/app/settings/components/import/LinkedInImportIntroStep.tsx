"use client";

import { ModalFooter } from "@bondery/mantine-next";
import { Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowRight, IconBrandLinkedin, IconCircleCheck } from "@tabler/icons-react";

interface LinkedInImportIntroStepProps {
  cancelLabel: string;
  continueLabel: string;
  descriptions: [string, string, string];
  introTitle: string;
  onCancel: () => void;
  onContinue: () => void;
}

export function LinkedInImportIntroStep({
  introTitle,
  descriptions,
  continueLabel,
  cancelLabel,
  onContinue,
  onCancel,
}: LinkedInImportIntroStepProps) {
  return (
    <Stack gap="xl">
      <Stack align="center" gap="md" pt="sm">
        <ThemeIcon color="blue" radius="xl" size={110} variant="light">
          <IconBrandLinkedin size={64} />
        </ThemeIcon>
        <Title order={4} ta="center">
          {introTitle}
        </Title>
      </Stack>

      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          {descriptions.map((description) => (
            <Group align="flex-start" gap="sm" key={description} wrap="nowrap">
              <IconCircleCheck
                size={18}
                style={{
                  color: "var(--mantine-color-blue-6)",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <Text size="sm">{description}</Text>
            </Group>
          ))}
        </Stack>
      </Paper>

      <ModalFooter
        actionLabel={continueLabel}
        actionRightSection={<IconArrowRight size={16} />}
        cancelLabel={cancelLabel}
        onAction={onContinue}
        onCancel={onCancel}
      />
    </Stack>
  );
}
