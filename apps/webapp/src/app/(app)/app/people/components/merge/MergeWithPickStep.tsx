"use client";

import { ModalFooter, PersonChip } from "@bondery/mantine-next";
import type { Contact, ContactPreview } from "@bondery/schemas";
import { Group, Stack, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import { toPersonPreview } from "../../utils/merge-conflict-helpers";

interface MergeWithPickStepProps {
  cancelLabel: string;
  continueLabel: string;
  disableLeftPicker: boolean;
  disableRightPicker: boolean;
  isSubmitting: boolean;
  leftContact: Contact | null;
  leftSelectablePeople: ContactPreview[];
  mergeWithLabel: string;
  noPeopleFoundLabel: string;
  onCancel: () => void;
  onContinue: () => void;
  onRightSearch?: (query: string) => Promise<ContactPreview[]>;
  onSelectLeft: (personId: string) => void;
  onSelectRight: (personId: string) => void;
  rightContact: Contact | null;
  rightSelectablePeople: ContactPreview[];
  searchPeopleLabel: string;
  selectLeftPersonLabel: string;
  selectRightPersonLabel: string;
}

export function MergeWithPickStep({
  disableLeftPicker,
  disableRightPicker,
  isSubmitting,
  leftContact,
  leftSelectablePeople,
  noPeopleFoundLabel,
  onCancel,
  onContinue,
  onRightSearch,
  onSelectLeft,
  onSelectRight,
  rightContact,
  rightSelectablePeople,
  searchPeopleLabel,
  selectLeftPersonLabel,
  selectRightPersonLabel,
  mergeWithLabel,
  cancelLabel,
  continueLabel,
}: MergeWithPickStepProps) {
  return (
    <Stack gap="md">
      <Group align="center" justify="space-between" wrap="nowrap">
        <PersonChip
          disabled={disableLeftPicker || isSubmitting}
          isSelectable
          noResultsLabel={noPeopleFoundLabel}
          onSelectPerson={onSelectLeft}
          people={leftSelectablePeople}
          person={toPersonPreview(leftContact)}
          placeholder={selectLeftPersonLabel}
          searchPlaceholder={searchPeopleLabel}
        />

        <Text c="dimmed" fw={500} size="sm">
          {mergeWithLabel}
        </Text>

        <PersonChip
          disabled={disableRightPicker || isSubmitting}
          isSelectable
          noResultsLabel={noPeopleFoundLabel}
          onSearch={onRightSearch}
          onSelectPerson={onSelectRight}
          people={rightSelectablePeople}
          person={toPersonPreview(rightContact)}
          placeholder={selectRightPersonLabel}
          searchDebounceMs={DEBOUNCE_MS.contactPicker}
          searchPlaceholder={searchPeopleLabel}
        />
      </Group>

      <ModalFooter
        actionDisabled={isSubmitting}
        actionLabel={continueLabel}
        actionRightSection={<IconArrowRight size={16} />}
        cancelDisabled={isSubmitting}
        cancelLabel={cancelLabel}
        onAction={onContinue}
        onCancel={onCancel}
      />
    </Stack>
  );
}
