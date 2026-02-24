"use client";

import { Avatar, Combobox, Group, Pill, PillsInput, Text, useCombobox } from "@mantine/core";
import { useMemo, useState } from "react";
import type { Contact } from "@bondery/types";
import { formatContactName } from "@/lib/nameHelpers";
import { getAvatarColorFromName } from "@/lib/avatarColor";
import { PersonChip } from "./PersonChip";

const MAX_DROPDOWN_OPTIONS = 5;

interface PeopleMultiPickerInputProps {
  contacts: Contact[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  noResultsLabel?: string;
  error?: React.ReactNode;
  disabled?: boolean;
}

/**
 * Controlled multi-select input for picking contacts by id.
 * Keeps `selectedIds` order when rendering chips and appending new selections,
 * supports searching available contacts, and allows removing selections via chip clear or backspace.
 */
export function PeopleMultiPickerInput({
  contacts,
  selectedIds,
  onChange,
  placeholder,
  noResultsLabel,
  error,
  disabled,
}: PeopleMultiPickerInputProps) {
  const [search, setSearch] = useState("");

  const contactsCombobox = useCombobox({
    onDropdownClose: () => {
      contactsCombobox.resetSelectedOption();
      setSearch("");
    },
  });

  const contactsById = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact])), [contacts]);

  const selectedContacts = useMemo(
    () =>
      selectedIds
        .map((id) => contactsById.get(id))
        .filter((contact): contact is Contact => Boolean(contact)),
    [contactsById, selectedIds],
  );

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const availableContacts = contacts.filter((contact) => !selectedIds.includes(contact.id));

    if (!query) {
      return availableContacts;
    }

    return availableContacts.filter((contact) => formatContactName(contact).toLowerCase().includes(query));
  }, [contacts, search, selectedIds]);

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
      }}
    >
      <Combobox.DropdownTarget>
        <PillsInput
          onClick={() => contactsCombobox.openDropdown()}
          error={error}
          disabled={disabled}
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
                value={search}
                placeholder={selectedContacts.length === 0 ? placeholder : undefined}
                onFocus={() => contactsCombobox.openDropdown()}
                onBlur={() => contactsCombobox.closeDropdown()}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  contactsCombobox.openDropdown();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && search.length === 0) {
                    const lastSelectedId = selectedIds.at(-1);

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
          {filteredContacts.length > 0 ? (
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