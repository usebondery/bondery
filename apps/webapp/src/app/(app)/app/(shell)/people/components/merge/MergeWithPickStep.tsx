"use client";

import { ModalFooter, type PeoplePickerOnSearch, PersonChip } from "@bondery/mantine-next";
import type { ContactPreview } from "@bondery/schemas";
import { Group, Stack, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { DEBOUNCE_MS } from "@/lib/platform/config";

interface MergeWithPickStepProps {
  cancelLabel: string;
  contactsHasMore?: boolean;
  continueLabel: string;
  disableLeftPicker: boolean;
  disableRightPicker: boolean;
  isSubmitting: boolean;
  leftPerson: ContactPreview | null;
  leftSelectablePeople: ContactPreview[];
  loadingMoreLabel: string;
  loadMoreErrorLabel: string;
  loadMoreRetryLabel: string;
  mergeWithLabel: string;
  noPeopleFoundLabel: string;
  onCancel: () => void;
  onContinue: () => void;
  onRightSearch?: PeoplePickerOnSearch<ContactPreview>;
  onSelectLeft: (personId: string) => void;
  onSelectRight: (personId: string) => void;
  rightPerson: ContactPreview | null;
  rightSelectablePeople: ContactPreview[];
  searchingLabel: string;
  searchPeopleLabel: string;
  selectLeftPersonLabel: string;
  selectRightPersonLabel: string;
}

export function MergeWithPickStep({
  contactsHasMore = false,
  disableLeftPicker,
  disableRightPicker,
  isSubmitting,
  leftPerson,
  leftSelectablePeople,
  loadingMoreLabel,
  loadMoreErrorLabel,
  loadMoreRetryLabel,
  noPeopleFoundLabel,
  onCancel,
  onContinue,
  onRightSearch,
  onSelectLeft,
  onSelectRight,
  rightPerson,
  rightSelectablePeople,
  searchPeopleLabel,
  searchingLabel,
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
          loadingMoreLabel={loadingMoreLabel}
          loadMoreErrorLabel={loadMoreErrorLabel}
          loadMoreRetryLabel={loadMoreRetryLabel}
          noResultsLabel={noPeopleFoundLabel}
          onSelectPerson={onSelectLeft}
          people={leftSelectablePeople}
          person={leftPerson}
          placeholder={selectLeftPersonLabel}
          searchingLabel={searchingLabel}
          searchPlaceholder={searchPeopleLabel}
        />

        <Text c="dimmed" fw={500} size="sm">
          {mergeWithLabel}
        </Text>

        {onRightSearch ? (
          <PersonChip
            contactsHasMore={contactsHasMore}
            disabled={disableRightPicker || isSubmitting}
            isSelectable
            loadingMoreLabel={loadingMoreLabel}
            loadMoreErrorLabel={loadMoreErrorLabel}
            loadMoreRetryLabel={loadMoreRetryLabel}
            noResultsLabel={noPeopleFoundLabel}
            onSearch={onRightSearch}
            onSelectPerson={onSelectRight}
            people={rightSelectablePeople}
            person={rightPerson}
            placeholder={selectRightPersonLabel}
            searchDebounceMs={DEBOUNCE_MS.search}
            searchingLabel={searchingLabel}
            searchPlaceholder={searchPeopleLabel}
          />
        ) : (
          <PersonChip
            disabled={disableRightPicker || isSubmitting}
            isSelectable
            loadingMoreLabel={loadingMoreLabel}
            loadMoreErrorLabel={loadMoreErrorLabel}
            loadMoreRetryLabel={loadMoreRetryLabel}
            noResultsLabel={noPeopleFoundLabel}
            onSelectPerson={onSelectRight}
            people={rightSelectablePeople}
            person={rightPerson}
            placeholder={selectRightPersonLabel}
            searchingLabel={searchingLabel}
            searchPlaceholder={searchPeopleLabel}
          />
        )}
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
