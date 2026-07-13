"use client";

import { ModalFooter } from "@bondery/mantine-next";
import type { InstagramImportStrategy } from "@bondery/schemas";
import { Alert, Select, Stack, Text } from "@mantine/core";
import { IconArrowLeft, IconArrowRight, IconHelpCircle } from "@tabler/icons-react";

interface InstagramImportStrategyStepProps {
  backLabel: string;
  cancelLabel: string;
  isParsing: boolean;
  onBack: () => void;
  onCancel: () => void;
  onParse: () => void;
  onStrategyChange: (value: InstagramImportStrategy) => void;
  parseUploadedLabel: string;
  strategy: InstagramImportStrategy;
  strategyHelpDescription: string;
  strategyHelpTitle: string;
  strategyLabel: string;
  strategyOptions: Array<{ label: string; value: InstagramImportStrategy }>;
}

export function InstagramImportStrategyStep({
  strategyHelpTitle,
  strategyHelpDescription,
  strategyLabel,
  strategyOptions,
  strategy,
  onStrategyChange,
  isParsing,
  parseUploadedLabel,
  backLabel,
  cancelLabel,
  onParse,
  onBack,
  onCancel,
}: InstagramImportStrategyStepProps) {
  return (
    <Stack gap="md">
      <Alert
        color="blue"
        icon={<IconHelpCircle size={18} />}
        title={strategyHelpTitle}
        variant="light"
      >
        <Stack gap={2}>
          <Text size="sm">{strategyHelpDescription}</Text>
        </Stack>
      </Alert>

      <Select
        allowDeselect={false}
        data={strategyOptions}
        label={strategyLabel}
        onChange={(value) =>
          onStrategyChange((value as InstagramImportStrategy) || "following_and_followers")
        }
        value={strategy}
      />

      <ModalFooter
        actionDisabled={isParsing}
        actionLabel={parseUploadedLabel}
        actionLoading={isParsing}
        actionRightSection={!isParsing ? <IconArrowRight size={16} /> : undefined}
        backDisabled={isParsing}
        backLabel={backLabel}
        backLeftSection={<IconArrowLeft size={16} />}
        cancelLabel={cancelLabel}
        onAction={onParse}
        onBack={onBack}
        onCancel={onCancel}
      />
    </Stack>
  );
}
