"use client";

import { formatContactName } from "@bondery/helpers/contact";
import type { ContactSelectable } from "@bondery/schemas";
import { Combobox, getDefaultZIndex, Pill, PillsInput, useCombobox } from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonChip } from "#nextjs/PersonChip/index.js";
import { PeoplePickerDropdownBody } from "#peoplePicker/PeoplePickerDropdownBody.js";
import {
  handlePeoplePickerArrowDownLoadMore,
  type PeoplePickerOnSearch,
} from "#peoplePicker/peoplePickerPagedList.js";
import { usePeoplePickerPagedList } from "#peoplePicker/usePeoplePickerPagedList.js";

const PEOPLE_PICKER_PILLS_STYLES = {
  input: {
    alignItems: "center" as const,
    display: "flex",
    minHeight: 34,
  },
};

type PeopleMultiPickerInputSharedProps = {
  contacts: ContactSelectable[];
  /**
   * Prefetch list `pagination.hasMore`. Default false — do not infer from length.
   */
  contactsHasMore?: boolean;
  disabled?: boolean;
  error?: React.ReactNode;
  inputRef?: React.Ref<HTMLInputElement>;
  loadingMoreLabel?: string;
  loadMoreErrorLabel?: string;
  loadMoreRetryLabel?: string;
  noResultsLabel?: string;
  placeholder?: string;
  /**
   * Label shown in the dropdown while an `onSearch` call is in progress.
   * @defaultValue "Searching…"
   */
  searchingLabel?: string;
  selectedIds: string[];
};

type PeopleMultiPickerSearchProps =
  | {
      /**
       * Server search with offset paging. Empty field still lists prefetched
       * `contacts` (minus selected / myself). Pass `DEBOUNCE_MS.search`.
       */
      onSearch: PeoplePickerOnSearch<ContactSelectable>;
      searchDebounceMs: number;
    }
  | {
      onSearch?: never;
      searchDebounceMs?: never;
    };

type PeopleMultiPickerInputProps =
  | (PeopleMultiPickerInputSharedProps & {
      /** Selected chips only — no search field, dropdown, or removal. */
      isReadonly: true;
      onChange?: never;
    } & {
      onSearch?: never;
      searchDebounceMs?: never;
    })
  | (PeopleMultiPickerInputSharedProps & {
      isReadonly?: false;
      onChange: (ids: string[]) => void;
    } & PeopleMultiPickerSearchProps);

function selectedContactsInOrder(
  contacts: ContactSelectable[],
  selectedIds: string[],
): ContactSelectable[] {
  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));
  return selectedIds
    .map((id) => contactsById.get(id))
    .filter((contact): contact is ContactSelectable => Boolean(contact));
}

function ReadonlySelectedPeoplePills({
  contacts,
  disabled,
  error,
  selectedIds,
}: {
  contacts: ContactSelectable[];
  disabled?: boolean;
  error?: React.ReactNode;
  selectedIds: string[];
}) {
  const selectedContacts = selectedContactsInOrder(contacts, selectedIds);

  return (
    <PillsInput
      disabled={disabled}
      error={error}
      styles={{
        input: {
          ...PEOPLE_PICKER_PILLS_STYLES.input,
          cursor: "default",
        },
      }}
    >
      <Pill.Group>
        {selectedContacts.map((contact) => (
          <PersonChip isClickable={false} key={contact.id} person={contact} size="sm" />
        ))}
      </Pill.Group>
    </PillsInput>
  );
}

/**
 * Controlled multi-select input for picking contacts by id.
 * Keeps `selectedIds` order when rendering chips and appending new selections,
 * supports searching available contacts, and allows removing selections via chip clear or backspace.
 *
 * When `onSearch` is provided, typing triggers a debounced server-side search
 * instead of filtering the local `contacts` array, allowing the picker to find
 * contacts that were not included in the initial prefetch.
 *
 * `isReadonly` renders the same chip field without search, dropdown, or removal.
 */
export function PeopleMultiPickerInput(props: PeopleMultiPickerInputProps) {
  if (props.isReadonly) {
    return (
      <ReadonlySelectedPeoplePills
        contacts={props.contacts}
        disabled={props.disabled}
        error={props.error}
        selectedIds={props.selectedIds}
      />
    );
  }

  return <EditablePeopleMultiPickerInput {...props} />;
}

function EditablePeopleMultiPickerInput({
  contacts,
  contactsHasMore = false,
  selectedIds,
  onChange,
  placeholder,
  noResultsLabel,
  searchingLabel = "Searching…",
  loadingMoreLabel = "Loading more…",
  loadMoreErrorLabel = "Couldn't load more people.",
  loadMoreRetryLabel = "Retry",
  searchDebounceMs,
  error,
  disabled,
  inputRef,
  onSearch,
}: PeopleMultiPickerInputSharedProps & {
  onChange: (ids: string[]) => void;
} & PeopleMultiPickerSearchProps) {
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filterAvailable = useCallback(
    (contact: ContactSelectable) => !selectedIdSet.has(contact.id) && !contact.myself,
    [selectedIdSet],
  );
  const matchQuery = useCallback((contact: ContactSelectable, query: string) => {
    return formatContactName(contact).toLowerCase().includes(query.toLowerCase());
  }, []);

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
    filter: filterAvailable,
    matchQuery,
    onSearch,
    searchDebounceMs,
    seed: contacts,
  });

  const [knownContacts, setKnownContacts] = useState<ContactSelectable[]>(contacts);

  useEffect(() => {
    setKnownContacts((prev) => {
      const merged = new Map(prev.map((c) => [c.id, c]));
      for (const c of contacts) {
        merged.set(c.id, c);
      }
      return Array.from(merged.values());
    });
  }, [contacts]);

  useEffect(() => {
    setKnownContacts((prev) => {
      const merged = new Map(prev.map((c) => [c.id, c]));
      for (const c of visibleItems) {
        merged.set(c.id, c);
      }
      return Array.from(merged.values());
    });
  }, [visibleItems]);

  const contactsCombobox = useCombobox({
    loop: !canLoadMore,
    onDropdownClose: () => {
      contactsCombobox.resetSelectedOption();
      resetList();
    },
    onDropdownOpen: () => {
      contactsCombobox.selectFirstOption();
    },
  });

  // Retrigger first-option highlight after replace (not on append).
  // `useCombobox()` returns a new store object every render — do not depend on it
  // or load-more re-renders scroll the first option into view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: token is the replace trigger
  useEffect(() => {
    contactsCombobox.selectFirstOption();
  }, [selectFirstOptionToken]);

  const contactsById = useMemo(() => {
    const merged = new Map(knownContacts.map((contact) => [contact.id, contact]));
    for (const contact of contacts) {
      merged.set(contact.id, contact);
    }
    return merged;
  }, [contacts, knownContacts]);

  const selectedContacts = useMemo(
    () =>
      selectedIds
        .map((id) => contactsById.get(id))
        .filter((contact): contact is ContactSelectable => Boolean(contact)),
    [contactsById, selectedIds],
  );

  return (
    <Combobox
      onOptionSubmit={(value: string) => {
        const alreadySelected = selectedIds.includes(value);
        const nextSelectedIds = alreadySelected
          ? selectedIds.filter((id) => id !== value)
          : [...selectedIds, value];

        onChange(nextSelectedIds);
        resetList();
      }}
      store={contactsCombobox}
      zIndex={getDefaultZIndex("max")}
    >
      <Combobox.DropdownTarget>
        <PillsInput
          disabled={disabled}
          error={error}
          loading={isFirstPageSearching}
          onClick={() => contactsCombobox.openDropdown()}
          styles={PEOPLE_PICKER_PILLS_STYLES}
        >
          <Pill.Group>
            {selectedContacts.map((contact) => (
              <PersonChip
                key={contact.id}
                onClear={() => {
                  onChange(selectedIds.filter((id) => id !== contact.id));
                }}
                person={contact}
                size="sm"
              />
            ))}

            <Combobox.EventsTarget>
              <PillsInput.Field
                disabled={disabled}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setQuery(value);
                  contactsCombobox.openDropdown();
                  contactsCombobox.updateSelectedOptionIndex("active");
                }}
                onFocus={() => contactsCombobox.openDropdown()}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && search.length === 0) {
                    const lastSelectedId = selectedIds[selectedIds.length - 1];

                    if (lastSelectedId) {
                      onChange(selectedIds.slice(0, -1));
                    }
                  }
                  handlePeoplePickerArrowDownLoadMore(event, {
                    canLoadMore,
                    loadMore,
                    optionCount: visibleItems.length,
                    selectedIndex: contactsCombobox.getSelectedOptionIndex(),
                  });
                }}
                placeholder={selectedContacts.length === 0 ? placeholder : undefined}
                ref={inputRef}
                value={search}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown data-composed>
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
