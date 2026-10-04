"use client";

import { Group, Loader, Text, UnstyledButton } from "@mantine/core";

export type PeoplePickerLoadMoreProps = {
  isLoadingMore: boolean;
  loadingMoreLabel: string;
  loadMoreError: boolean;
  loadMoreErrorLabel: string;
  loadMoreRetryLabel: string;
  onRetryLoadMore: () => void;
};

/** Footer shown under people options while the next page is fetching or failed. */
export function PeoplePickerLoadMore({
  isLoadingMore,
  loadingMoreLabel,
  loadMoreError,
  loadMoreErrorLabel,
  loadMoreRetryLabel,
  onRetryLoadMore,
}: PeoplePickerLoadMoreProps) {
  if (isLoadingMore) {
    return (
      <Group gap="xs" justify="center" py="xs" w="100%" wrap="nowrap">
        <Loader size="xs" />
        <Text size="sm">{loadingMoreLabel}</Text>
      </Group>
    );
  }

  if (!loadMoreError) {
    return null;
  }

  return (
    <Group gap="xs" justify="center" py="xs" w="100%" wrap="nowrap">
      <Text size="sm">{loadMoreErrorLabel}</Text>
      <UnstyledButton onClick={onRetryLoadMore} type="button">
        <Text size="sm" td="underline">
          {loadMoreRetryLabel}
        </Text>
      </UnstyledButton>
    </Group>
  );
}
