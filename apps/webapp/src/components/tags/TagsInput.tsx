"use client";

import {
  Box,
  Combobox,
  Group,
  PillsInput,
  ScrollArea,
  Text,
  Tooltip,
  useCombobox,
} from "@mantine/core";
import { type ReactNode, useState } from "react";
import { AddNewTagButton } from "@/components/tags/AddNewTagButton";
import { TagPill } from "@/components/tags/TagPill";
import { useTagsInputTranslations } from "@/lib/i18n/generated/hooks";
import "./TagsInput.css";

export interface TagsInputTag {
  color?: string | null;
  id: string;
  label: string;
}

interface TagsInputProps {
  /** Show the create-tag option. The person page uses this. The filter does not. */
  allowCreate?: boolean;
  editTooltip?: string;
  label: string;
  /** Icon inside the field, before the pills. */
  leftSection?: ReactNode;
  nothingFoundMessage?: string;
  onAlreadySelected?: (tag: TagsInputTag) => void;
  onCreate?: (label: string) => void;
  onEdit?: (tag: TagsInputTag) => void;
  onRemove: (tagId: string) => void;
  /** Return false when the tag was not accepted. The field then keeps its search text. */
  onSelect: (tag: TagsInputTag) => boolean | undefined;
  placeholder?: string;
  selected: TagsInputTag[];
  tags: TagsInputTag[];
  w?: number;
  /** Keep the option list inside a parent popover. */
  withinPortal?: boolean;
}

/**
 * Pill field for workspace tags.
 * Selected tags render as pills. The dropdown offers the remaining tags.
 */
export function TagsInput({
  allowCreate = false,
  editTooltip,
  label,
  leftSection,
  nothingFoundMessage,
  onAlreadySelected,
  onCreate,
  onEdit,
  onRemove,
  onSelect,
  placeholder,
  selected,
  tags,
  w,
  withinPortal = true,
}: TagsInputProps) {
  const t = useTagsInputTranslations();
  const [search, setSearch] = useState("");
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const selectedIds = new Set(selected.map((tag) => tag.id));
  const normalizedSearch = search.toLowerCase().trim();

  const exactAppliedMatch =
    normalizedSearch.length > 0
      ? selected.find((tag) => tag.label.toLowerCase().trim() === normalizedSearch)
      : undefined;

  const filteredOptions = tags.filter(
    (tag) => !selectedIds.has(tag.id) && tag.label.toLowerCase().trim().includes(normalizedSearch),
  );

  const showCreateOption =
    allowCreate &&
    (search.trim().length === 0 ||
      !tags.some((tag) => tag.label.toLowerCase() === search.trim().toLowerCase()));

  const acceptTag = (tag: TagsInputTag) => {
    if (onSelect(tag) === false) {
      return;
    }
    setSearch("");
    combobox.openDropdown();
    combobox.updateSelectedOptionIndex("active");
  };

  const handleCreateRequest = () => {
    const trimmed = search.trim();

    if (trimmed) {
      const exactMatch = tags.find((tag) => tag.label.toLowerCase() === trimmed.toLowerCase());

      if (exactMatch) {
        if (selectedIds.has(exactMatch.id)) {
          onAlreadySelected?.(exactMatch);
          return;
        }

        acceptTag(exactMatch);
        return;
      }
    }

    combobox.closeDropdown();
    setSearch("");
    onCreate?.(trimmed);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!combobox.dropdownOpened) {
        event.preventDefault();
        combobox.openDropdown();
        combobox.updateSelectedOptionIndex("active");
      }
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (!combobox.dropdownOpened) {
        combobox.openDropdown();
        combobox.updateSelectedOptionIndex("active");
      } else {
        (combobox as unknown as { selectNextOption: () => void }).selectNextOption();
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (!combobox.dropdownOpened) {
        combobox.openDropdown();
        combobox.updateSelectedOptionIndex("active");
      } else {
        (combobox as unknown as { selectPreviousOption: () => void }).selectPreviousOption();
      }
      return;
    }

    if (event.key === "Backspace" && !search.trim() && selected.length > 0) {
      event.preventDefault();
      const lastTag = selected[selected.length - 1];
      if (lastTag) {
        onRemove(lastTag.id);
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (combobox.dropdownOpened && document.querySelector('[data-combobox-selected="true"]')) {
        return;
      }
      if (allowCreate) {
        handleCreateRequest();
      }
    }
  };

  const showEmptyMessage =
    Boolean(nothingFoundMessage) &&
    !showCreateOption &&
    !exactAppliedMatch &&
    filteredOptions.length === 0;

  return (
    <Combobox
      onOptionSubmit={(value) => {
        if (value === "__create__") {
          handleCreateRequest();
          return;
        }

        const tag = tags.find((item) => item.id === value);
        if (tag) {
          acceptTag(tag);
        }
      }}
      store={combobox}
      withinPortal={withinPortal}
    >
      <Combobox.DropdownTarget>
        <PillsInput
          label={
            <Text fw={500} mb={4} size="sm">
              {label}
            </Text>
          }
          leftSection={leftSection}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          w={w}
        >
          <Group gap="xs" wrap="wrap">
            {selected.map((tag) => (
              <TagPill
                clearable
                color={tag.color}
                key={tag.id}
                label={tag.label}
                onClick={onEdit ? () => onEdit(tag) : undefined}
                onRemove={() => onRemove(tag.id)}
                preventInputBlur
                removeTooltipLabel={t("RemoveTagTooltip")}
                showAddIcon={false}
                showEditIcon={false}
                tooltipLabel={onEdit ? editTooltip : undefined}
              />
            ))}

            <Combobox.EventsTarget>
              <PillsInput.Field
                onBlur={() => combobox.closeDropdown()}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  combobox.updateSelectedOptionIndex();
                  combobox.openDropdown();
                }}
                onKeyDown={handleKeyDown}
                placeholder={selected.length === 0 ? placeholder : undefined}
                value={search}
              />
            </Combobox.EventsTarget>
          </Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <ScrollArea.Autosize mah={220} type="scroll">
          <Combobox.Options>
            <Group gap="xs" p="xs" wrap="wrap">
              {showCreateOption ? (
                <Box>
                  <Combobox.Option
                    className="tags-input-combobox-option"
                    style={{ background: "transparent", padding: 0 }}
                    value="__create__"
                  >
                    <AddNewTagButton
                      className="tags-input-add-button"
                      label={
                        search.trim()
                          ? t("CreateNewTagOption", { label: search.trim() })
                          : t("CreateNewTagEmpty")
                      }
                      preventInputBlur
                    />
                  </Combobox.Option>
                </Box>
              ) : null}

              {exactAppliedMatch ? (
                <Box key={`applied-${exactAppliedMatch.id}`}>
                  <Combobox.Option
                    className="tags-input-combobox-option"
                    disabled
                    style={{ background: "transparent", padding: 0 }}
                    value={`__applied__${exactAppliedMatch.id}`}
                  >
                    <Tooltip label={t("TagAlreadyAppliedTooltip")}>
                      <Box
                        className="tags-input-option-pill"
                        style={{
                          backgroundColor: exactAppliedMatch.color
                            ? `${exactAppliedMatch.color}1a`
                            : "var(--mantine-color-gray-0)",
                          border: `1px solid ${exactAppliedMatch.color ? `${exactAppliedMatch.color}66` : "var(--mantine-color-gray-4)"}`,
                          borderRadius: 999,
                          padding: "4px 10px",
                        }}
                      >
                        <Text c={exactAppliedMatch.color || undefined} fw={500} size="xs">
                          {exactAppliedMatch.label}
                        </Text>
                      </Box>
                    </Tooltip>
                  </Combobox.Option>
                </Box>
              ) : null}

              {filteredOptions.map((tag) => (
                <Box key={tag.id}>
                  <Combobox.Option
                    className="tags-input-combobox-option"
                    style={{ background: "transparent", padding: 0 }}
                    value={tag.id}
                  >
                    <TagPill
                      className="tags-input-option-pill"
                      color={tag.color}
                      label={tag.label}
                      preventInputBlur
                      showAddIcon={true}
                      showEditIcon={false}
                      tooltipLabel={t("AddTagTooltip")}
                    />
                  </Combobox.Option>
                </Box>
              ))}

              {showEmptyMessage ? (
                <Text c="dimmed" size="sm">
                  {nothingFoundMessage}
                </Text>
              ) : null}
            </Group>
          </Combobox.Options>
        </ScrollArea.Autosize>
      </Combobox.Dropdown>
    </Combobox>
  );
}
