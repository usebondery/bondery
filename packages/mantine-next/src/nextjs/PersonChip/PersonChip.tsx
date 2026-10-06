"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { ContactPreview } from "@bondery/schemas";
import {
  type BadgeProps,
  Combobox,
  type MantineColor,
  UnstyledButton,
  useCombobox,
} from "@mantine/core";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { PersonChip as PersonChipView } from "../../PersonChip/PersonChip.js";
import { personChipSizes } from "../../PersonChip/personChipLayout.js";
import Link from "#nextjs/NextLink.js";
import { PersonAvatarTooltip } from "#nextjs/PersonAvatar/PersonAvatarTooltip.js";
import { PEOPLE_PICKER_DROPDOWN_WIDTH } from "#peoplePicker/constants.js";
import { PeoplePickerDropdownBody } from "#peoplePicker/PeoplePickerDropdownBody.js";
import {
  handlePeoplePickerArrowDownLoadMore,
  type PeoplePickerOnSearch,
} from "#peoplePicker/peoplePickerPagedList.js";
import { usePeoplePickerPagedList } from "#peoplePicker/usePeoplePickerPagedList.js";

type PersonChipIdentity = ContactPreview & {
  headline?: string | null;
  location?: string | null;
  middleName?: string | null;
};

function formatPersonName(candidate: PersonChipIdentity): string {
  return [candidate.firstName, candidate.middleName, candidate.lastName].filter(Boolean).join(" ");
}

type PersonChipBaseProps = {
  avatarEdge?: boolean;
  badgeVariant?: BadgeProps["variant"];
  color?: MantineColor;
  disabled?: boolean;
  href?: string;
  isClickable?: boolean;
  isSelectable?: boolean;
  /**
   * Prefetch list `pagination.hasMore`. Default false — do not infer from length.
   */
  contactsHasMore?: boolean;
  loadingMoreLabel?: string;
  loadMoreErrorLabel?: string;
  loadMoreRetryLabel?: string;
  noResultsLabel?: string;
  onClear?: () => void;
  /** Called immediately before client navigation (e.g. optimistic document title). */
  onNavigate?: () => void;
  onSelectPerson?: (personId: string) => void;
  openInNewTab?: boolean;
  people?: PersonChipIdentity[];
  person: PersonChipIdentity | null;
  placeholder?: string;
  /** Next.js Link prefetch. Pass `false` on merge cards so deleted duplicates are not prefetched. */
  prefetch?: boolean | null;
  /** Custom right section override — rendered instead of the default chevron/clear icon. */
  rightSection?: ReactNode;
  /**
   * Label shown in the dropdown while an `onSearch` call is in progress.
   * @defaultValue "Searching…"
   */
  searchingLabel?: string;
  searchPlaceholder?: string;
  showChevronWhenEmpty?: boolean;
  showHoverCard?: boolean;
  size?: "sm" | "md";
};

export type PersonChipProps = PersonChipBaseProps &
  (
    | {
        /** Async server-side search with offset paging. Empty field still lists prefetched `people`. */
        onSearch: PeoplePickerOnSearch<PersonChipIdentity>;
        /** Debounce delay for `onSearch`. Pass `DEBOUNCE_MS.search` (600ms). */
        searchDebounceMs: number;
      }
    | {
        onSearch?: never;
        searchDebounceMs?: never;
      }
  );

export function PersonChip({
  person,
  size = "md",
  color,
  avatarEdge = true,
  onClear,
  isSelectable = false,
  showChevronWhenEmpty = true,
  disabled = false,
  placeholder = "Select person",
  people = [],
  contactsHasMore = false,
  searchPlaceholder = "Search...",
  noResultsLabel = "No people found",
  searchingLabel = "Searching…",
  loadingMoreLabel = "Loading more…",
  loadMoreErrorLabel = "Couldn't load more people.",
  loadMoreRetryLabel = "Retry",
  onSelectPerson,
  isClickable = false,
  href,
  badgeVariant = "light",
  showHoverCard = false,
  openInNewTab = false,
  onNavigate,
  prefetch,
  rightSection,
  onSearch,
  searchDebounceMs,
}: PersonChipProps) {
  const { chevronSize, clearSize } = personChipSizes(size);

  const getDisplayName = useCallback(
    (candidate: PersonChipIdentity | null) => {
      if (!candidate) {
        return placeholder;
      }

      return formatPersonName(candidate);
    },
    [placeholder],
  );

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const matchQuery = useCallback(
    (candidate: PersonChipIdentity, query: string) => {
      return getDisplayName(candidate).toLowerCase().includes(query.toLowerCase());
    },
    [getDisplayName],
  );

  const {
    canLoadMore,
    isFirstPageSearching,
    isLoadingMore,
    loadMore,
    loadMoreError,
    query: search,
    resetList,
    retryLoadMore,
    scrollResetKey,
    selectFirstOptionToken,
    setQuery,
    visibleItems,
  } = usePeoplePickerPagedList({
    contactsHasMore,
    matchQuery,
    onSearch,
    searchDebounceMs,
    seed: people,
  });

  const combobox = useCombobox({
    loop: !canLoadMore,
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      resetList();
    },
    onDropdownOpen: () => {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        combobox.selectFirstOption();
      });
    },
  });

  // Retrigger first-option highlight after replace (not on append).
  // `useCombobox()` returns a new store object every render — do not depend on it
  // or load-more re-renders scroll the first option into view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: token is the replace trigger
  useEffect(() => {
    combobox.selectFirstOption();
  }, [selectFirstOptionToken]);

  const knownPeopleRef = useRef<Map<string, PersonChipIdentity>>(new Map());

  useEffect(() => {
    for (const p of people) {
      knownPeopleRef.current.set(p.id, p);
    }
  }, [people]);

  useEffect(() => {
    for (const candidate of visibleItems) {
      knownPeopleRef.current.set(candidate.id, candidate);
    }
  }, [visibleItems]);

  const fullName = getDisplayName(person);
  const resolvedHref = href || (person ? `${WEBAPP_ROUTES.PERSON}/${person.id}` : undefined);

  const shouldShowChevron =
    isSelectable && !disabled && ((person && !onClear) || (!person && showChevronWhenEmpty));

  const endSection =
    rightSection !== undefined ? (
      rightSection
    ) : onClear && person ? (
      <UnstyledButton
        aria-label="Clear"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClear();
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        style={{
          alignItems: "center",
          cursor: "pointer",
          display: "inline-flex",
        }}
        type="button"
      >
        <IconX size={clearSize} />
      </UnstyledButton>
    ) : shouldShowChevron ? (
      <IconChevronDown size={chevronSize} />
    ) : undefined;

  const renderBadge = () => (
    <PersonChipView
      avatar={person?.avatar}
      avatarEdge={avatarEdge}
      badgeVariant={badgeVariant}
      color={person ? color || "branding-primary" : "gray"}
      disabled={disabled}
      firstName={person?.firstName ?? ""}
      hasPerson={Boolean(person)}
      interactive={isSelectable || isClickable}
      label={fullName}
      lastName={person?.lastName}
      rightSection={endSection}
      size={size}
    />
  );

  if (!isSelectable) {
    const badge = renderBadge();
    const content =
      isClickable && !disabled && resolvedHref ? (
        <Link
          href={resolvedHref}
          onClick={() => onNavigate?.()}
          prefetch={prefetch}
          rel={openInNewTab ? "noopener noreferrer" : undefined}
          target={openInNewTab ? "_blank" : undefined}
        >
          {badge}
        </Link>
      ) : (
        badge
      );

    if (showHoverCard && person) {
      return <PersonAvatarTooltip person={person}>{content}</PersonAvatarTooltip>;
    }
    return content;
  }

  return (
    <Combobox
      onOptionSubmit={(value) => {
        if (disabled || !onSelectPerson) {
          return;
        }

        onSelectPerson(value);
        combobox.closeDropdown();
      }}
      store={combobox}
      width={PEOPLE_PICKER_DROPDOWN_WIDTH}
    >
      <Combobox.Target targetType="button">
        <UnstyledButton
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              combobox.toggleDropdown();
            }
          }}
        >
          {renderBadge()}
        </UnstyledButton>
      </Combobox.Target>

      <Combobox.Dropdown data-composed>
        <Combobox.Search
          autoFocus
          loading={isFirstPageSearching}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            handlePeoplePickerArrowDownLoadMore(event, {
              canLoadMore,
              loadMore,
              optionCount: visibleItems.length,
              selectedIndex: combobox.getSelectedOptionIndex(),
            });
          }}
          placeholder={searchPlaceholder}
          ref={searchInputRef}
          value={search}
        />
        <PeoplePickerDropdownBody
          isFirstPageSearching={isFirstPageSearching}
          isLoadingMore={isLoadingMore}
          items={visibleItems}
          loadingMoreLabel={loadingMoreLabel}
          loadMoreError={loadMoreError}
          loadMoreErrorLabel={loadMoreErrorLabel}
          loadMoreRetryLabel={loadMoreRetryLabel}
          noResultsLabel={noResultsLabel}
          onBottomReached={loadMore}
          onRetryLoadMore={retryLoadMore}
          scrollResetKey={scrollResetKey}
          searchingLabel={searchingLabel}
        />
      </Combobox.Dropdown>
    </Combobox>
  );
}
