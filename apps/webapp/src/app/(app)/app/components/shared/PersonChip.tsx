"use client";

import { Avatar, Badge, Combobox, Group, Text, UnstyledButton, useCombobox } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { useMemo, useRef, useState } from "react";
import type { ContactPreview } from "@bondery/types";
import Link from "next/link";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { getAvatarColorFromName } from "@/lib/avatarColor";

function formatPersonName(candidate: ContactPreview): string {
  return `${candidate.firstName}${candidate.lastName ? ` ${candidate.lastName}` : ""}`.trim();
}

interface PersonChipProps {
  person: ContactPreview | null;
  isSelectable?: boolean;
  showChevronWhenEmpty?: boolean;
  disabled?: boolean;
  placeholder?: string;
  people?: ContactPreview[];
  searchPlaceholder?: string;
  noResultsLabel?: string;
  onSelectPerson?: (personId: string) => void;
  isClickable?: boolean;
  href?: string;
}

export function PersonChip({
  person,
  isSelectable = false,
  showChevronWhenEmpty = true,
  disabled = false,
  placeholder = "Select person",
  people = [],
  searchPlaceholder = "Search...",
  noResultsLabel = "No people found",
  onSelectPerson,
  isClickable = false,
  href,
}: PersonChipProps) {
  const getDisplayName = (candidate: ContactPreview | null) => {
    if (!candidate) {
      return placeholder;
    }

    return formatPersonName(candidate);
  };

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const combobox = useCombobox({
    onDropdownOpen: () => {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    },
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
  });
  const [search, setSearch] = useState("");

  const filteredPeople = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return people;
    }

    return people.filter((candidate) => getDisplayName(candidate).toLowerCase().includes(query));
  }, [people, search]);

  const fullName = getDisplayName(person);
  const resolvedHref = href || (person ? `${WEBAPP_ROUTES.PERSON}/${person.id}` : undefined);

  const leftAvatar = person ? (
    <Avatar
      src={person.avatar || undefined}
      size={20}
      radius="xl"
      name={`${person.firstName} ${person.lastName || ""}`.trim()}
    />
  ) : null;

  const renderBadge = () => (
    <Badge
      variant="light"
      color={person ? undefined : "gray"}
      size="xl"
      leftSection={leftAvatar}
      rightSection={
        isSelectable && (person || showChevronWhenEmpty) ? <IconChevronDown size={14} /> : undefined
      }
      styles={{
        root: {
          cursor: (isSelectable || isClickable) && !disabled ? "pointer" : "default",
          opacity: disabled ? 0.6 : 1,
        },
        label: {
          textTransform: "none",
          fontWeight: 400,
          color: person ? undefined : "var(--mantine-color-dimmed)",
        },
      }}
    >
      {fullName}
    </Badge>
  );

  if (!isSelectable) {
    if (isClickable && !disabled && resolvedHref) {
      return <Link href={resolvedHref}>{renderBadge()}</Link>;
    }

    return renderBadge();
  }

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(value) => {
        if (disabled || !onSelectPerson) {
          return;
        }

        onSelectPerson(value);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <UnstyledButton
          onClick={() => {
            if (!disabled) {
              combobox.toggleDropdown();
            }
          }}
          disabled={disabled}
        >
          {renderBadge()}
        </UnstyledButton>
      </Combobox.Target>

      <Combobox.Dropdown className="min-w-64">
        <Combobox.Search
          ref={searchInputRef}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder={searchPlaceholder}
          autoFocus
        />
        <Combobox.Options style={{ overflowY: "auto" }} className="max-h-60">
          {filteredPeople.length > 0 ? (
            filteredPeople.map((candidate) => {
              const candidateName = formatPersonName(candidate);

              return (
                <Combobox.Option value={candidate.id} key={candidate.id}>
                  <Group gap="sm" wrap="nowrap">
                    <Avatar
                      src={candidate.avatar || undefined}
                      size="sm"
                      radius="xl"
                        color={getAvatarColorFromName(candidate.firstName, candidate.lastName)}
                      name={`${candidate.firstName} ${candidate.lastName || ""}`.trim()}
                    />
                    <Text size="sm" fw={500}>
                      {candidateName}
                    </Text>
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
