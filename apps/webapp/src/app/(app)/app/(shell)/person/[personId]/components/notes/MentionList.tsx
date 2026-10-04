"use client";

import { formatContactName } from "@bondery/helpers/contact";
import {
  PEOPLE_PICKER_DROPDOWN_WIDTH,
  PERSON_SEARCH_OPTION_HIT_CLASS,
  type PeoplePickerOnSearch,
  type PeoplePickerOptionPerson,
  PeoplePickerOptions,
  shouldLoadMoreOnArrowDown,
  usePeoplePickerPagedList,
} from "@bondery/mantine-next";
import { Group, Loader, Paper, Text, UnstyledButton } from "@mantine/core";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useNotesEditorTranslations } from "@/lib/i18n/generated/hooks";

export interface MentionSuggestionItem {
  avatar?: string | null;
  firstName: string;
  headline?: string | null;
  id: string;
  label: string;
  lastName?: string | null;
  location?: string | null;
}

export function contactToMentionItem(contact: PeoplePickerOptionPerson): MentionSuggestionItem {
  const label = formatContactName(contact).trim();
  return {
    avatar: contact.avatar,
    firstName: contact.firstName,
    headline: contact.headline,
    id: contact.id,
    label: label.length > 0 ? label : contact.id,
    lastName: contact.lastName,
    location: contact.location,
  };
}

interface MentionListProps {
  command: (item: MentionSuggestionItem) => void;
  contactsHasMore?: boolean;
  currentPerson?: PeoplePickerOptionPerson | null;
  onSearch: PeoplePickerOnSearch<PeoplePickerOptionPerson>;
  query: string;
  searchDebounceMs: number;
  seed: PeoplePickerOptionPerson[];
}

export interface MentionListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListHandle, MentionListProps>(function MentionList(
  {
    command,
    contactsHasMore = false,
    currentPerson = null,
    onSearch,
    query,
    searchDebounceMs,
    seed,
  },
  ref,
) {
  const t = useNotesEditorTranslations();
  const selectedOptionRef = useRef<HTMLButtonElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    canLoadMore,
    isFirstPageSearching,
    isLoadingMore,
    loadMore,
    loadMoreError,
    query: listQuery,
    retryLoadMore,
    scrollResetKey,
    selectFirstOptionToken,
    setQuery,
    visibleItems,
  } = usePeoplePickerPagedList({
    contactsHasMore,
    onSearch,
    searchDebounceMs,
    seed,
  });

  useEffect(() => {
    if (listQuery === query) {
      return;
    }
    setQuery(query);
  }, [listQuery, query, setQuery]);

  const items = useMemo(() => {
    if (query.trim().length > 0 || !currentPerson) {
      return visibleItems;
    }
    if (visibleItems.some((item) => item.id === currentPerson.id)) {
      return visibleItems;
    }
    return [currentPerson, ...visibleItems];
  }, [currentPerson, query, visibleItems]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: token is the replace trigger
  useEffect(() => {
    setSelectedIndex(0);
  }, [selectFirstOptionToken]);

  useEffect(() => {
    setSelectedIndex((current) => {
      if (items.length === 0) {
        return 0;
      }
      return Math.min(current, items.length - 1);
    });
  }, [items]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll the highlighted row into view
  useEffect(() => {
    selectedOptionRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (!item) {
      return;
    }
    command(contactToMentionItem(item));
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      const isArrow = event.key === "ArrowDown" || event.key === "ArrowUp";
      const isEnter = event.key === "Enter";

      if (isFirstPageSearching) {
        if (isArrow || isEnter) {
          event.preventDefault();
          return true;
        }
        return false;
      }

      if (items.length === 0) {
        return false;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => {
          if (canLoadMore) {
            return Math.max(current - 1, 0);
          }
          return (current + items.length - 1) % items.length;
        });
        return true;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (
          shouldLoadMoreOnArrowDown({
            canLoadMore,
            optionCount: items.length,
            selectedIndex,
          })
        ) {
          loadMore();
          return true;
        }
        setSelectedIndex((current) => {
          if (canLoadMore) {
            return Math.min(current + 1, items.length - 1);
          }
          return (current + 1) % items.length;
        });
        return true;
      }

      if (isEnter) {
        event.preventDefault();
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  return (
    <Paper
      data-mention-list=""
      miw={PEOPLE_PICKER_DROPDOWN_WIDTH}
      onMouseDownCapture={(event) => {
        // Keep the notes editor focused so onBlur does not save `@query` before insert.
        event.preventDefault();
      }}
      p="xs"
      radius="md"
      shadow="sm"
      w={PEOPLE_PICKER_DROPDOWN_WIDTH}
      withBorder
    >
      <PeoplePickerOptions
        emptyState={
          <Text c="dimmed" px="sm" py="xs" size="sm">
            {t("NoPeopleFound")}
          </Text>
        }
        isFirstPageSearching={isFirstPageSearching}
        isLoadingMore={isLoadingMore}
        items={items}
        loadingMoreLabel={t("LoadingMoreLabel")}
        loadMoreError={loadMoreError}
        loadMoreErrorLabel={t("LoadMoreError")}
        loadMoreRetryLabel={t("LoadMoreRetry")}
        onBottomReached={loadMore}
        onRetryLoadMore={retryLoadMore}
        renderOption={(item, row, index) => (
          <UnstyledButton
            className={PERSON_SEARCH_OPTION_HIT_CLASS}
            display="block"
            key={item.id}
            mod={{ active: index === selectedIndex }}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            px="sm"
            py={6}
            ref={index === selectedIndex ? selectedOptionRef : undefined}
            w="100%"
          >
            {row}
          </UnstyledButton>
        )}
        scrollResetKey={scrollResetKey}
        searchingState={
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        }
      />
    </Paper>
  );
});
