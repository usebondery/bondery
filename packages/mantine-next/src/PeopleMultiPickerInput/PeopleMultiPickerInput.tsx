"use client";

import {
  Avatar,
  Combobox,
  Group,
  Loader,
  Pill,
  PillsInput,
  Text,
  useCombobox,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import type { Contact } from "@bondery/types";
import { PersonChip } from "../nextjs/PersonChip";
import { getAvatarColorFromName } from "../utils/avatarColor";
import { formatContactName } from "../utils/nameHelpers";

const MAX_DROPDOWN_OPTIONS = 5;

interface PeopleMultiPickerInputProps {
  contacts: Contact[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  noResultsLabel?: string;
  /**
   * Label shown in the dropdown while an `onSearch` call is in progress.
   * @defaultValue "Searching…"
   */
  searchingLabel?: string;
  /**
   * Debounce delay in ms before `onSearch` is called after the user stops typing.
   * @defaultValue 300
   */
  searchDebounceMs?: number;
  error?: React.ReactNode;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  /**
   * When provided, the picker calls this function (debounced 300 ms) whenever
   * the user types a non-empty query, instead of filtering the `contacts` prop
   * client-side. Results are merged into the internal known-contacts map so
   * that chips for async-found contacts continue to render after selection.
   */
  onSearch?: (query: string) => Promise<Contact[]>;
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
  const [asyncResults, setAsyncResults] = useState<Contact[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Accumulates contacts prop + any async-found contacts so chips always resolve.
  const [knownContacts, setKnownContacts] = useState<Contact[]>(contacts);

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
  });

  const triggerSearch = useDebouncedCallback(async (query: string) => {
    if (!onSearch) return;
    try {
      const results = await onSearch(query);
      setAsyncResults(results);
      setKnownContacts((prev) => {
        const merged = new Map(prev.map((c) => [c.id, c]));
        for (const c of results) {
          merged.set(c.id, c);
        }
        return Array.from(merged.values());
      });
    } finally {
      setIsSearching(false);
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
        .filter((contact): contact is Contact => Boolean(contact)),
    [contactsById, selectedIds],
  );

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (onSearch && query) {
      // Async mode: server results drive the dropdown.
      if (isSearching) return [];
      return asyncResults.filter((contact) => !selectedIds.includes(contact.id) && !contact.myself);
    }

    // Local mode: client-side filter of the contacts prop.
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
      store={contactsCombobox}
      onOptionSubmit={(value: string) => {
        const alreadySelected = selectedIds.includes(value);
        const nextSelectedIds = alreadySelected
          ? selectedIds.filter((id) => id !== value)
          : [...selectedIds, value];

        onChange(nextSelectedIds);
        setSearch("");
        setAsyncResults([]);
      }}
    >
      <Combobox.DropdownTarget>
        <PillsInput
          onClick={() => contactsCombobox.openDropdown()}
          error={error}
          disabled={disabled}
          loading={isSearching}
          styles={{
            input: {
              minHeight: 34,
              display: "flex",
              alignItems: "center",
            },
          }}
        >
          <Pill.Group>
            {selectedContacts.map((contact) => (
              <PersonChip
                key={contact.id}
                person={contact}
                size="sm"
                onClear={() => {
                  onChange(selectedIds.filter((id) => id !== contact.id));
                }}
              />
            ))}

            <Combobox.EventsTarget>
              <PillsInput.Field
                ref={inputRef}
                value={search}
                placeholder={selectedContacts.length === 0 ? placeholder : undefined}
                onFocus={() => contactsCombobox.openDropdown()}
                onBlur={() => contactsCombobox.closeDropdown()}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setSearch(value);
                  contactsCombobox.openDropdown();
                  if (onSearch && value.trim()) {
                    setIsSearching(true);
                    void triggerSearch(value.trim());
                  } else {
                    setAsyncResults([]);
                    setIsSearching(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && search.length === 0) {
                    const lastSelectedId = selectedIds[selectedIds.length - 1];

                    if (lastSelectedId) {
                      onChange(selectedIds.slice(0, -1));
                    }
                  }
                }}
                disabled={disabled}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options>
          {onSearch && search.trim() && isSearching ? (
            <Combobox.Empty>
              <Group justify="center" gap="xs">
                <Loader size="xs" />
                <span>{searchingLabel}</span>
              </Group>
            </Combobox.Empty>
          ) : filteredContacts.length > 0 ? (
            visibleContacts.map((contact) => {
              const fullName = formatContactName(contact);

              return (
                <Combobox.Option value={contact.id} key={contact.id}>
                  <Group justify="space-between" wrap="nowrap" px="xs" py={6}>
                    <Group gap="sm" wrap="nowrap">
                      <Avatar
                        src={contact.avatar || undefined}
                        size="sm"
                        radius="xl"
                        color={getAvatarColorFromName(contact.firstName, contact.lastName)}
                        name={fullName}
                      />
                      <Text size="sm" fw={500}>
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
