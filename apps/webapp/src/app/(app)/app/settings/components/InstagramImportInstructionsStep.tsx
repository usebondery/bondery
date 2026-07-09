"use client";

import { ModalFooter } from "@bondery/mantine-next";
import { Alert, Anchor, Divider, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconArrowLeft, IconFileZip } from "@tabler/icons-react";

interface InstructionStep {
  content: React.ReactNode;
  number: number;
}

interface InstagramImportInstructionsStepProps {
  actionLabel: string;
  backLabel: string;
  cancelLabel?: string;
  filesAlertDescriptionPrefix: string;
  filesAlertDescriptionSuffix: string;
  filesAlertFilesBold: string;
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
  specialStep?: InstructionStep;
}

function NumberedStep({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <Group align="center" gap="sm" wrap="nowrap">
      <ThemeIcon color="pink" radius="xl" size={22} style={{ flexShrink: 0 }} variant="filled">
        <Text component="span" fw={700} lh={1} size="xs">
          {number}
        </Text>
      </ThemeIcon>
      <Text size="sm">{children}</Text>
    </Group>
  );
}

export function InstagramImportInstructionsStep({
  instructionsTitle,
  instructionStep1Prefix,
  instructionStep1LinkLabel,
  instructionStep1LinkHref,
  numberedSteps,
  specialStep,
  filesAlertTitle,
  filesAlertDescriptionPrefix,
  filesAlertFilesBold,
  filesAlertDescriptionSuffix,
  backLabel,
  actionLabel,
  cancelLabel,
  isOnboardingFlow,
  onBack,
  onAction,
  onCancel,
}: InstagramImportInstructionsStepProps) {
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
              color="pink"
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
            <NumberedStep key={text} number={number}>
              {text}
            </NumberedStep>
          ))}
          {specialStep ? (
            <Group align="flex-start" gap="sm" wrap="nowrap">
              <ThemeIcon
                color="pink"
                radius="xl"
                size={22}
                style={{ flexShrink: 0, marginTop: 1 }}
                variant="filled"
              >
                <Text component="span" fw={700} lh={1} size="xs">
                  {specialStep.number}
                </Text>
              </ThemeIcon>
              {specialStep.content}
            </Group>
          ) : null}
        </Stack>
      </Paper>

      <Alert color="pink" title={filesAlertTitle} variant="light">
        <Text size="sm">
          {filesAlertDescriptionPrefix}{" "}
          <Text component="span" fw={700}>
            {filesAlertFilesBold}
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
