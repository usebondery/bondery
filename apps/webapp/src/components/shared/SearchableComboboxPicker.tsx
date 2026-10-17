"use client";

import { filterBySearchQuery, matchesSearchQuery } from "@bondery/helpers";
import { Combobox, Input, ScrollArea, Stack, Text, useCombobox } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  SearchableComboboxTargetItem,
  type SearchableComboboxTargetItemProps,
} from "@/components/shared/SearchableComboboxItem";
import classes from "./SearchableComboboxPicker.module.css";

const OPTIONS_MAX_HEIGHT = 240;

export { selectedComboboxOptionStyle } from "@/components/shared/SearchableComboboxItem";
export { filterBySearchQuery, matchesSearchQuery };

export type SearchableComboboxPickerRenderOptionsContext = {
  query: string;
  selectedValue: string;
};

export interface SearchableComboboxPickerProps {
  ariaLabel?: string;
  description?: ReactNode;
  disabled?: boolean;
  label?: ReactNode;
  loading?: boolean;
  onBlur?: (value: string) => void;
  onChange?: (value: string) => void;
  onOptionSubmit?: (value: string) => void;
  renderOptions: (context: SearchableComboboxPickerRenderOptionsContext) => ReactNode;
  searchPlaceholder?: string;
  targetFallback?: ReactNode;
  targetItem?: SearchableComboboxTargetItemProps;
  targetLeftSection: ReactNode;
  value: string;
}

export function SearchableComboboxPicker({
  ariaLabel,
  description,
  disabled = false,
  label,
  loading = false,
  onBlur,
  onChange,
  onOptionSubmit,
  renderOptions,
  searchPlaceholder,
  targetFallback,
  targetItem,
  targetLeftSection,
  value,
}: SearchableComboboxPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearchQuery("");
    },
    onDropdownOpen: () => {
      combobox.focusSearchInput();
      combobox.updateSelectedOptionIndex("active");
    },
  });

  const handleOptionSubmit = (next: string | null) => {
    if (!next) {
      return;
    }

    onChange?.(next);
    onOptionSubmit?.(next);
    combobox.closeDropdown();

    if (onBlur) {
      setTimeout(() => {
        onBlur(next);
      }, 100);
    }
  };

  const isTargetDisabled = disabled || loading;

  const targetBody = targetItem ? (
    <SearchableComboboxTargetItem {...targetItem} />
  ) : (
    (targetFallback ?? value)
  );

  return (
    <Stack gap={4}>
      {label ? (
        typeof label === "string" ? (
          <Text fw={500} size="sm">
            {label}
          </Text>
        ) : (
          label
        )
      ) : null}
      {description ? (
        typeof description === "string" ? (
          <Text c="dimmed" size="xs">
            {description}
          </Text>
        ) : (
          description
        )
      ) : null}
      <Combobox onOptionSubmit={handleOptionSubmit} store={combobox}>
        <Combobox.Target>
          <Input
            aria-label={ariaLabel}
            component="button"
            disabled={isTargetDisabled}
            leftSection={targetLeftSection}
            onClick={() => {
              if (isTargetDisabled) {
                return;
              }

              combobox.toggleDropdown();
            }}
            pointer
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            styles={{
              input: {
                borderColor: combobox.dropdownOpened
                  ? "var(--mantine-primary-color-filled)"
                  : undefined,
              },
            }}
            type="button"
          >
            {targetBody}
          </Input>
        </Combobox.Target>

        <Combobox.Dropdown
          classNames={{ dropdown: classes.dropdown }}
          styles={{
            dropdown: {
              "--combobox-option-active-bg": "var(--mantine-color-branding-primary-filled-hover)",
            },
          }}
        >
          <Combobox.Search
            className="transform-none"
            leftSection={<IconSearch size={16} />}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            placeholder={searchPlaceholder}
            value={searchQuery}
          />
          <Combobox.Options>
            <ScrollArea.Autosize
              className={classes.optionsScroll}
              mah={OPTIONS_MAX_HEIGHT}
              offsetScrollbars={false}
              scrollbars="y"
              type="scroll"
              w="100%"
            >
              {renderOptions({ query: searchQuery, selectedValue: value })}
            </ScrollArea.Autosize>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Stack>
  );
}
