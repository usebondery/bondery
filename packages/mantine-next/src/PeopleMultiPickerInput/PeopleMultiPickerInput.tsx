"use client";

import { formatContactName } from "@bondery/helpers/contact";
import type { ContactSelectable } from "@bondery/schemas";
import {
  Avatar,
  Combobox,
  Group,
  getDefaultZIndex,
  Loader,
  Pill,
  PillsInput,
  Text,
  useCombobox,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { PersonChip } from "#nextjs/PersonChip/index.js";
import { getAvatarColorFromName } from "#utils/avatarColor.js";

const MAX_DROPDOWN_OPTIONS = 5;

interface PeopleMultiPickerInputProps {
  contacts: ContactSelectable[];
  disabled?: boolean;
  error?: React.ReactNode;
  inputRef?: React.Ref<HTMLInputElement>;
  noResultsLabel?: string;
  onChange: (ids: string[]) => void;
  /**
   * When provided, the picker calls this function (debounced 300 ms) whenever
   * the user types a non-empty query, instead of filtering the `contacts` prop
   * client-side. Results are merged into the internal known-contacts map so
   * that chips for async-found contacts continue to render after selection.
   */
  onSearch?: (query: string) => Promise<ContactSelectable[]>;
  placeholder?: string;
  /**
   * Debounce delay in ms before `onSearch` is called after the user stops typing.
   * @defaultValue 300
   */
  searchDebounceMs?: number;
  /**
   * Label shown in the dropdown while an `onSearch` call is in progress.
   * @defaultValue "Searching…"
   */
  searchingLabel?: string;
  selectedIds: string[];
}

/**
 * Controlled multi-select input for picking contacts by id.
 * Keeps `selectedIds` order when rendering chips and appending new selections,
 * supports searching available contacts, and allows removing selections via chip clear or backspace.
 *
 * When `onSearch` is provided, typing triggers a debounced server-side search
 * instead of filtering the local `contacts` array, allowing the picker to find
 * contacts that were not included in the initial prefetch.
 */
export function PeopleMultiPickerInput({
  contacts,
  selectedIds,
  onChange,
  placeholder,
  noResultsLabel,
  searchingLabel = "Searching…",
  searchDebounceMs = 300,
  error,
  disabled,
  inputRef,
  onSearch,
}: PeopleMultiPickerInputProps) {
  const [search, setSearch] = useState("");
  const [asyncResults, setAsyncResults] = useState<ContactSelectable[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchGenerationRef = useRef(0);

  // Accumulates contacts prop + any async-found contacts so chips always resolve.
  const [knownContacts, setKnownContacts] = useState<ContactSelectable[]>(contacts);

  // Merge incoming prop updates into knownContacts without discarding async finds.
  useEffect(() => {
    setKnownContacts((prev) => {
      const merged = new Map(prev.map((c) => [c.id, c]));
      for (const c of contacts) {
        merged.set(c.id, c);
      }
      return Array.from(merged.values());
    });
  }, [contacts]);

  const contactsCombobox = useCombobox({
    onDropdownClose: () => {
      contactsCombobox.resetSelectedOption();
      setSearch("");
      setAsyncResults([]);
      setIsSearching(false);
    },
    onDropdownOpen: () => {
      contactsCombobox.selectFirstOption();
    },
  });

  const triggerSearch = useDebouncedCallback(async (query: string) => {
    if (!onSearch) {
      return;
    }

    const generation = ++searchGenerationRef.current;

    try {
      const results = await onSearch(query);
      if (generation !== searchGenerationRef.current) {
        return;
      }

      setAsyncResults(results);
      setKnownContacts((prev) => {
        const merged = new Map(prev.map((c) => [c.id, c]));
        for (const c of results) {
          merged.set(c.id, c);
        }
        return Array.from(merged.values());
      });
      contactsCombobox.selectFirstOption();
    } finally {
      if (generation === searchGenerationRef.current) {
        setIsSearching(false);
      }
    }
  }, searchDebounceMs);

  // Derived from knownContacts so chips for async-found contacts resolve.
  const contactsById = useMemo(
    () => new Map(knownContacts.map((contact) => [contact.id, contact])),
    [knownContacts],
  );

  const selectedContacts = useMemo(
    () =>
      selectedIds
        .map((id) => contactsById.get(id))
        .filter((contact): contact is ContactSelectable => Boolean(contact)),
    [contactsById, selectedIds],
  );

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (onSearch && query) {
      if (isSearching) {
        return [];
      }

      return asyncResults.filter((contact) => !selectedIds.includes(contact.id) && !contact.myself);
    }

    const availableContacts = contacts.filter(
      (contact) => !selectedIds.includes(contact.id) && !contact.myself,
    );

    if (!query) {
      return availableContacts;
    }

    return availableContacts.filter((contact) =>
      formatContactName(contact).toLowerCase().includes(query),
    );
  }, [contacts, search, selectedIds, onSearch, asyncResults, isSearching]);

  const visibleContacts = useMemo(
    () => filteredContacts.slice(0, MAX_DROPDOWN_OPTIONS),
    [filteredContacts],
  );

  return (
    <Combobox
      onOptionSubmit={(value: string) => {
        const alreadySelected = selectedIds.includes(value);
        const nextSelectedIds = alreadySelected
          ? selectedIds.filter((id) => id !== value)
          : [...selectedIds, value];

        onChange(nextSelectedIds);
        setSearch("");
        setAsyncResults([]);
      }}
      store={contactsCombobox}
      zIndex={getDefaultZIndex("max")}
    >
      <Combobox.DropdownTarget>
        <PillsInput
          disabled={disabled}
          error={error}
          loading={isSearching}
          onClick={() => contactsCombobox.openDropdown()}
          styles={{
            input: {
              alignItems: "center",
              display: "flex",
              minHeight: 34,
            },
          }}
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
                  setSearch(value);
                  contactsCombobox.openDropdown();
                  contactsCombobox.updateSelectedOptionIndex("active");
                  if (onSearch && value.trim()) {
                    setIsSearching(true);
                    void triggerSearch(value.trim());
                  } else {
                    searchGenerationRef.current += 1;
                    setAsyncResults([]);
                    setIsSearching(false);
                  }
                }}
                onFocus={() => contactsCombobox.openDropdown()}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && search.length === 0) {
                    const lastSelectedId = selectedIds[selectedIds.length - 1];

                    if (lastSelectedId) {
                      onChange(selectedIds.slice(0, -1));
                    }
                  }
                }}
                placeholder={selectedContacts.length === 0 ? placeholder : undefined}
                ref={inputRef}
                value={search}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options>
          {onSearch && search.trim() && isSearching ? (
            <Combobox.Empty>
              <Group gap="xs" justify="center">
                <Loader size="xs" />
                <span>{searchingLabel}</span>
              </Group>
            </Combobox.Empty>
          ) : filteredContacts.length > 0 ? (
            visibleContacts.map((contact) => {
              const fullName = formatContactName(contact);

              return (
                <Combobox.Option key={contact.id} value={contact.id}>
                  <Group justify="space-between" px="xs" py={6} wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                      <Avatar
                        color={getAvatarColorFromName(contact.firstName, contact.lastName)}
                        name={fullName}
                        radius="xl"
                        size="sm"
                        src={contact.avatar || undefined}
                      />
                      <Text fw={500} size="sm">
                        {fullName}
                      </Text>
                    </Group>
                  </Group>
                </Combobox.Option>
              );
            })
          ) : (
            <Combobox.Empty>{noResultsLabel}</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
