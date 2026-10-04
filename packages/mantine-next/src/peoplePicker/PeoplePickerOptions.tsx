"use client";

import { Group, Loader, ScrollArea } from "@mantine/core";
import type { ReactNode } from "react";
import { PEOPLE_PICKER_DROPDOWN_MAX_HEIGHT } from "#peoplePicker/constants.js";
import { PeoplePickerLoadMore } from "#peoplePicker/PeoplePickerLoadMore.js";
import {
  type PeoplePickerOptionPerson,
  PersonSearchOptionRow,
} from "#peoplePicker/PersonSearchOptionRow.js";

export type PeoplePickerOptionsProps<T extends PeoplePickerOptionPerson> = {
  emptyState: ReactNode;
  isFirstPageSearching: boolean;
  isLoadingMore: boolean;
  items: T[];
  loadingMoreLabel: string;
  loadMoreError: boolean;
  loadMoreErrorLabel: string;
  loadMoreRetryLabel: string;
  onBottomReached: () => void;
  onRetryLoadMore: () => void;
  renderOption: (item: T, row: ReactNode, index: number) => ReactNode;
  scrollResetKey: number;
  searchingLabel?: string;
  searchingState?: ReactNode;
};

export function PeoplePickerOptions<T extends PeoplePickerOptionPerson>({
  emptyState,
  isFirstPageSearching,
  isLoadingMore,
  items,
  loadingMoreLabel,
  loadMoreError,
  loadMoreErrorLabel,
  loadMoreRetryLabel,
  onBottomReached,
  onRetryLoadMore,
  renderOption,
  scrollResetKey,
  searchingLabel,
  searchingState,
}: PeoplePickerOptionsProps<T>) {
  const searching =
    searchingState ??
    (searchingLabel ? (
      <Group gap="xs" justify="center">
        <Loader size="xs" />
        <span>{searchingLabel}</span>
      </Group>
    ) : (
      <Group justify="center" py="md">
        <Loader size="sm" />
      </Group>
    ));

  return (
    <ScrollArea.Autosize
      className="peoplePickerOptions"
      key={scrollResetKey}
      mah={PEOPLE_PICKER_DROPDOWN_MAX_HEIGHT}
      offsetScrollbars="y"
      onBottomReached={onBottomReached}
      scrollbarSize="var(--combobox-padding)"
      scrollbars="y"
      type="scroll"
      w="100%"
    >
      {isFirstPageSearching ? (
        searching
      ) : items.length > 0 ? (
        <>
          {items.map((item, index) =>
            renderOption(item, <PersonSearchOptionRow person={item} />, index),
          )}
          <PeoplePickerLoadMore
            isLoadingMore={isLoadingMore}
            loadingMoreLabel={loadingMoreLabel}
            loadMoreError={loadMoreError}
            loadMoreErrorLabel={loadMoreErrorLabel}
            loadMoreRetryLabel={loadMoreRetryLabel}
            onRetryLoadMore={onRetryLoadMore}
          />
        </>
      ) : (
        emptyState
      )}
    </ScrollArea.Autosize>
  );
}
