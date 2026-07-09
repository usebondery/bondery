"use client";

import { ModalFooter } from "@bondery/mantine-next";
import { Alert, Anchor, Divider, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconArrowLeft, IconFileZip } from "@tabler/icons-react";

interface LinkedInImportInstructionsStepProps {
  actionLabel: string;
  backLabel: string;
  cancelLabel?: string;
  filesAlertDescriptionPrefix: string;
  filesAlertDescriptionSuffix: string;
  filesAlertFileConnectionsBold: string;
  filesAlertTitle: string;
  instructionStep1LinkHref: string;
  instructionStep1LinkLabel: string;
  instructionStep1Prefix: string;
  instructionsTitle: string;
  isOnboardingFlow: boolean;
  numberedSteps: Array<{ number: number; text: string }>;
  onAction: () => void;
  onBack: () => void;
  onCancel?: () => void;
}

export function LinkedInImportInstructionsStep({
  instructionsTitle,
  instructionStep1Prefix,
  instructionStep1LinkLabel,
  instructionStep1LinkHref,
  numberedSteps,
  filesAlertTitle,
  filesAlertDescriptionPrefix,
  filesAlertFileConnectionsBold,
  filesAlertDescriptionSuffix,
  backLabel,
  actionLabel,
  cancelLabel,
  isOnboardingFlow,
  onBack,
  onAction,
  onCancel,
}: LinkedInImportInstructionsStepProps) {
  return (
    <Stack gap="md">
      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Text fw={600} size="sm" ta="center">
            {instructionsTitle}
          </Text>
          <Divider />
          <Group align="center" gap="sm" wrap="nowrap">
            <ThemeIcon
              color="blue"
              radius="xl"
              size={22}
              style={{ flexShrink: 0 }}
              variant="filled"
            >
              <Text component="span" fw={700} lh={1} size="xs">
                1
              </Text>
            </ThemeIcon>
            <Text size="sm">
              {instructionStep1Prefix}{" "}
              <Anchor href={instructionStep1LinkHref} rel="noopener noreferrer" target="_blank">
                {instructionStep1LinkLabel}
              </Anchor>
            </Text>
          </Group>
          {numberedSteps.map(({ number, text }) => (
            <Group align="center" gap="sm" key={text} wrap="nowrap">
              <ThemeIcon
                color="blue"
                radius="xl"
                size={22}
                style={{ flexShrink: 0 }}
                variant="filled"
              >
                <Text component="span" fw={700} lh={1} size="xs">
                  {number}
                </Text>
              </ThemeIcon>
              <Text size="sm">{text}</Text>
            </Group>
          ))}
        </Stack>
      </Paper>

      <Alert color="blue" title={filesAlertTitle} variant="light">
        <Text size="sm">
          {filesAlertDescriptionPrefix}{" "}
          <Text component="span" fw={700}>
            {filesAlertFileConnectionsBold}
          </Text>
          . {filesAlertDescriptionSuffix}
        </Text>
      </Alert>

      <ModalFooter
        backLabel={backLabel}
        backLeftSection={<IconArrowLeft size={16} />}
        onBack={onBack}
        {...(isOnboardingFlow
          ? {
              actionLabel,
              cancelLabel,
              onAction,
              onCancel,
            }
          : {
              actionLabel,
              actionLeftSection: <IconFileZip size={16} />,
              onAction,
            })}
      />
    </Stack>
  );
}
