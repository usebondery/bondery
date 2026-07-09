"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { ContactPreview } from "@bondery/schemas";
import {
  Avatar,
  Badge,
  type BadgeProps,
  Center,
  Combobox,
  Group,
  Loader,
  type MantineColor,
  Text,
  UnstyledButton,
  useCombobox,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "#nextjs/NextLink.js";
import { PersonAvatarTooltip } from "#nextjs/PersonAvatar/PersonAvatarTooltip.js";
import { getAvatarColorFromName } from "#utils/avatarColor.js";

type PersonChipIdentity = ContactPreview & {
  middleName?: string | null;
  headline?: string | null;
  location?: string | null;
};

function formatPersonName(candidate: PersonChipIdentity): string {
  return [candidate.firstName, candidate.middleName, candidate.lastName].filter(Boolean).join(" ");
}

export interface PersonChipProps {
  avatarEdge?: boolean;
  badgeVariant?: BadgeProps["variant"];
  color?: MantineColor;
  disabled?: boolean;
  href?: string;
  isClickable?: boolean;
  isSelectable?: boolean;
  noResultsLabel?: string;
  onClear?: () => void;
  /** Called immediately before client navigation (e.g. optimistic document title). */
  onNavigate?: () => void;
  /** Async server-side search handler. When provided, triggers after the user stops typing. */
  onSearch?: (query: string) => Promise<ContactPreview[]>;
  onSelectPerson?: (personId: string) => void;
  openInNewTab?: boolean;
  people?: ContactPreview[];
  person: PersonChipIdentity | null;
  placeholder?: string;
  /** Custom right section override — rendered instead of the default chevron/clear icon. */
  rightSection?: ReactNode;
  /** Debounce delay for `onSearch` in milliseconds. Defaults to 300. */
  searchDebounceMs?: number;
  searchPlaceholder?: string;
  showChevronWhenEmpty?: boolean;
  showHoverCard?: boolean;
  size?: "sm" | "md";
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
  onNavigate,
  rightSection,
  onSearch,
  searchDebounceMs = 300,
}: PersonChipProps) {
  const avatarSize = size === "sm" ? 16 : 20;
  const avatarEdgeSize = size === "sm" ? 26 : 32;
  const badgeSize = size === "sm" ? "lg" : "xl";
  const chevronSize = size === "sm" ? 12 : 14;
  const clearSize = size === "sm" ? 12 : 14;

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

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
      searchGenRef.current += 1;
      setAsyncResults([]);
      setIsSearching(false);
    },
    onDropdownOpen: () => {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    },
  });
  const [search, setSearch] = useState("");
  const [asyncResults, setAsyncResults] = useState<ContactPreview[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchGenRef = useRef<number>(0);
  const knownPeopleRef = useRef<Map<string, ContactPreview>>(new Map());

  useEffect(() => {
    for (const p of people) {
      knownPeopleRef.current.set(p.id, p);
    }
  }, [people]);

  const triggerSearch = useDebouncedCallback(async (query: string) => {
    if (!onSearch) {
      return;
    }
    const gen = ++searchGenRef.current;
    const results = await onSearch(query);
    if (gen !== searchGenRef.current) {
      return;
    }
    for (const r of results) {
      knownPeopleRef.current.set(r.id, r);
    }
    setAsyncResults(results);
    setIsSearching(false);
  }, searchDebounceMs);

  const filteredPeople = useMemo(() => {
    if (onSearch && search.trim()) {
      return asyncResults;
    }
    const query = search.trim().toLowerCase();
    if (!query) {
      return people;
    }
    return people.filter((candidate) => getDisplayName(candidate).toLowerCase().includes(query));
  }, [people, search, onSearch, asyncResults, getDisplayName]);

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
        alignItems: "center",
        display: "inline-flex",
      }}
    >
      <Avatar
        color={personAvatarColor}
        name={`${person.firstName} ${person.lastName || ""}`.trim()}
        radius="xl"
        size={avatarEdge ? avatarEdgeSize : avatarSize}
        src={person.avatar || undefined}
      />
    </span>
  ) : null;

  const shouldShowChevron =
    isSelectable && !disabled && ((person && !onClear) || (!person && showChevronWhenEmpty));

  const renderBadge = () => (
    <Badge
      color={person ? color || "branding-primary" : "gray"}
      leftSection={leftAvatar}
      rightSection={
        rightSection !== undefined ? (
          <span
            style={{
              alignItems: "center",
              display: "inline-flex",
              marginInlineEnd: -2,
            }}
          >
            {rightSection}
          </span>
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
              marginInlineEnd: -2,
            }}
            type="button"
          >
            <IconX size={clearSize} />
          </UnstyledButton>
        ) : shouldShowChevron ? (
          <span
            style={{
              alignItems: "center",
              display: "inline-flex",
              marginInlineEnd: -2,
            }}
          >
            <IconChevronDown size={chevronSize} />
          </span>
        ) : undefined
      }
      size={badgeSize}
      styles={{
        label: {
          color: person ? undefined : "var(--mantine-color-dimmed)",
          fontWeight: 400,
          overflow: "visible",
          textTransform: "none",
        },
        root: {
          cursor: (isSelectable || isClickable) && !disabled ? "pointer" : "default",
          opacity: disabled ? 0.6 : 1,
          paddingInlineEnd:
            person && (onClear || isSelectable || rightSection !== undefined)
              ? size === "sm"
                ? 8
                : 10
              : undefined,
          paddingInlineStart: person && avatarEdge ? 0 : undefined,
        },
      }}
      variant={badgeVariant}
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
          onClick={() => onNavigate?.()}
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
    >
      <Combobox.Target>
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

      <Combobox.Dropdown className="min-w-80">
        <Combobox.Search
          autoFocus
          loading={isSearching}
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
          ref={searchInputRef}
          value={search}
        />
        <Combobox.Options className="max-h-60" style={{ overflowY: "auto" }}>
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
                <Combobox.Option key={candidate.id} value={candidate.id}>
                  <Group gap="sm" wrap="nowrap">
                    <Avatar
                      color={getAvatarColorFromName(candidate.firstName, candidate.lastName)}
                      name={`${candidate.firstName} ${candidate.lastName || ""}`.trim()}
                      radius="xl"
                      size="sm"
                      src={candidate.avatar || undefined}
                    />
                    <Text fw={500} size="sm">
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
