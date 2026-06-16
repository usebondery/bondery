"use client";

import {
  Avatar,
  Badge,
  type BadgeProps,
  Center,
  Combobox,
  Group,
  Loader,
  Text,
  UnstyledButton,
  useCombobox,
  type MantineColor,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ContactPreview } from "@bondery/types";
import Link from "next/link";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { getAvatarColorFromName } from "../../utils/avatarColor";
import { PersonAvatarTooltip } from "../PersonAvatar/PersonAvatarTooltip";

type PersonChipIdentity = ContactPreview & {
  middleName?: string | null;
  headline?: string | null;
  location?: string | null;
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
  badgeVariant?: BadgeProps["variant"];
  showHoverCard?: boolean;
  openInNewTab?: boolean;
  /** Custom right section override — rendered instead of the default chevron/clear icon. */
  rightSection?: ReactNode;
  /** Async server-side search handler. When provided, triggers after the user stops typing. */
  onSearch?: (query: string) => Promise<ContactPreview[]>;
  /** Debounce delay for `onSearch` in milliseconds. Defaults to 300. */
  searchDebounceMs?: number;
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
  badgeVariant = "light",
  showHoverCard = false,
  openInNewTab = false,
  rightSection,
  onSearch,
  searchDebounceMs = 300,
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
      searchGenRef.current += 1;
      setAsyncResults([]);
      setIsSearching(false);
    },
  });
  const [search, setSearch] = useState("");
  const [asyncResults, setAsyncResults] = useState<ContactPreview[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchGenRef = useRef<number>(0);
  const knownPeopleRef = useRef<Map<string, ContactPreview>>(new Map());

  useEffect(() => {
    people.forEach((p) => knownPeopleRef.current.set(p.id, p));
  }, [people]);

  const triggerSearch = useDebouncedCallback(async (query: string) => {
    if (!onSearch) return;
    const gen = ++searchGenRef.current;
    const results = await onSearch(query);
    if (gen !== searchGenRef.current) return;
    results.forEach((r) => knownPeopleRef.current.set(r.id, r));
    setAsyncResults(results);
    setIsSearching(false);
  }, searchDebounceMs);

  const filteredPeople = useMemo(() => {
    if (onSearch && search.trim()) {
      return asyncResults;
    }
    const query = search.trim().toLowerCase();
    if (!query) return people;
    return people.filter((candidate) => getDisplayName(candidate).toLowerCase().includes(query));
  }, [people, search, onSearch, asyncResults]);

  const fullName = getDisplayName(person);
  const resolvedHref = href || (person ? `${WEBAPP_ROUTES.PERSON}/${person.id}` : undefined);
  const personAvatarColor = person
    ? color === "gray"
      ? "gray"
      : getAvatarColorFromName(person.firstName, person.lastName)
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

  const shouldShowChevron =
    isSelectable && !disabled && ((person && !onClear) || (!person && showChevronWhenEmpty));

  const renderBadge = () => (
    <Badge
      variant={badgeVariant}
      color={person ? color || "branding-primary" : "gray"}
      size={badgeSize}
      leftSection={leftAvatar}
      rightSection={
        rightSection !== undefined ? (
          <span style={{ display: "inline-flex", alignItems: "center", marginInlineEnd: -2 }}>
            {rightSection}
          </span>
        ) : onClear && person ? (
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
        ) : shouldShowChevron ? (
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
            person && (onClear || isSelectable || rightSection !== undefined)
              ? size === "sm"
                ? 8
                : 10
              : undefined,
        },
        label: {
          textTransform: "none",
          fontWeight: 400,
          overflow: "visible",
          color: person ? undefined : "var(--mantine-color-dimmed)",
        },
      }}
    >
      {fullName}
    </Badge>
  );

  if (!isSelectable) {
    const badge = renderBadge();
    const content =
      isClickable && !disabled && resolvedHref ? (
        <Link
          href={resolvedHref}
          target={openInNewTab ? "_blank" : undefined}
          rel={openInNewTab ? "noopener noreferrer" : undefined}
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

      <Combobox.Dropdown className="min-w-80">
        <Combobox.Search
          ref={searchInputRef}
          value={search}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setSearch(value);
            if (onSearch) {
              const query = value.trim();
              if (!query) {
                searchGenRef.current += 1;
                setAsyncResults([]);
                setIsSearching(false);
              } else {
                setIsSearching(true);
                triggerSearch(query);
              }
            }
          }}
          placeholder={searchPlaceholder}
          loading={isSearching}
          autoFocus
        />
        <Combobox.Options style={{ overflowY: "auto" }} className="max-h-60">
          {isSearching ? (
            <Combobox.Empty>
              <Center>
                <Loader size="xs" />
              </Center>
            </Combobox.Empty>
          ) : filteredPeople.length > 0 ? (
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
