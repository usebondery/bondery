"use client";

import {
  Avatar,
  Badge,
  Combobox,
  Group,
  Text,
  UnstyledButton,
  useCombobox,
  type MantineColor,
} from "@mantine/core";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import { useMemo, useRef, useState } from "react";
import type { ContactPreview } from "@bondery/types";
import Link from "next/link";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { getAvatarColorFromName } from "@/lib/avatarColor";

type PersonChipIdentity = ContactPreview & {
  middleName?: string | null;
};

function formatPersonName(candidate: PersonChipIdentity): string {
  return [candidate.firstName, candidate.middleName, candidate.lastName].filter(Boolean).join(" ");
}

interface PersonChipProps {
  person: PersonChipIdentity | null;
  size?: "sm" | "md";
  color?: MantineColor;
  avatarEdge?: boolean;
  onClear?: () => void;
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
  size = "md",
  color,
  avatarEdge = true,
  onClear,
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
  const avatarSize = size === "sm" ? 16 : 20;
  const avatarEdgeSize = size === "sm" ? 26 : 32;
  const badgeSize = size === "sm" ? "lg" : "xl";
  const chevronSize = size === "sm" ? 12 : 14;
  const clearSize = size === "sm" ? 12 : 14;

  const getDisplayName = (candidate: PersonChipIdentity | null) => {
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
  const personAvatarColor = person
    ? getAvatarColorFromName(person.firstName, person.lastName)
    : undefined;

  const leftAvatar = person ? (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <Avatar
        src={person.avatar || undefined}
        size={avatarEdge ? avatarEdgeSize : avatarSize}
        radius="xl"
        color={personAvatarColor}
        name={`${person.firstName} ${person.lastName || ""}`.trim()}
      />
    </span>
  ) : null;

  const renderBadge = () => (
    <Badge
      variant="light"
      color={person ? color : "gray"}
      size={badgeSize}
      leftSection={leftAvatar}
      rightSection={
        onClear && person ? (
          <span
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClear();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              cursor: "pointer",
              marginInlineEnd: -2,
            }}
          >
            <IconX size={clearSize} />
          </span>
        ) : isSelectable && (person || showChevronWhenEmpty) ? (
          <span style={{ display: "inline-flex", alignItems: "center", marginInlineEnd: -2 }}>
            <IconChevronDown size={chevronSize} />
          </span>
        ) : undefined
      }
      styles={{
        root: {
          cursor: (isSelectable || isClickable) && !disabled ? "pointer" : "default",
          opacity: disabled ? 0.6 : 1,
          paddingInlineStart: person && avatarEdge ? 0 : undefined,
          paddingInlineEnd:
            person && (onClear || isSelectable) ? (size === "sm" ? 8 : 10) : undefined,
          overflow: person && avatarEdge ? "hidden" : undefined,
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
