"use client";

import { errorNotificationTemplate, warningNotificationTemplate } from "@bondery/mantine-next";
import type { Tag, TagWithCount } from "@bondery/schemas";
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
import { notifications } from "@mantine/notifications";
import { useMemo, useRef, useState } from "react";
import { AddNewTagButton } from "@/components/tags/AddNewTagButton";
import { openTagEditorModal } from "@/components/tags/openTagEditorModal";
import { TagPill } from "@/components/tags/TagPill";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useContactTagsQuery } from "@/lib/query/hooks/useContacts";
import {
  useAddTagToContactMutation,
  useRemoveTagFromContactMutation,
  useTagsListQuery,
} from "@/lib/query/hooks/useTags";
import { PERSON_ALL_TAGS } from "@/lib/query/personPageQueryParams";

interface PersonTagsInputProps {
  personId: string;
}

function toTag(tag: TagWithCount | Tag): Tag {
  return {
    color: tag.color,
    createdAt: tag.createdAt,
    id: tag.id,
    label: tag.label,
    updatedAt: tag.updatedAt,
    userId: tag.userId,
  };
}

export function PersonTagsInput({ personId }: PersonTagsInputProps) {
  const t = useWebTranslations("TagsInput");
  const tSettings = useWebTranslations("TagsSettings");
  const addTagMutation = useAddTagToContactMutation(personId);
  const removeTagMutation = useRemoveTagFromContactMutation(personId);
  const { data: personTags = [] } = useContactTagsQuery(personId);
  const { data: allTags = [] } = useTagsListQuery(PERSON_ALL_TAGS);
  const workspaceTags = useMemo(() => allTags.map(toTag), [allTags]);
  const [search, setSearch] = useState("");
  const addInFlightRef = useRef<Set<string>>(new Set());

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const personTagIds = new Set(personTags.map((tag) => tag.id));
  const normalizedSearch = search.toLowerCase().trim();

  const exactAppliedMatch =
    normalizedSearch.length > 0
      ? personTags.find((tag) => tag.label.toLowerCase().trim() === normalizedSearch)
      : undefined;

  const filteredOptions = workspaceTags.filter(
    (tag) => !personTagIds.has(tag.id) && tag.label.toLowerCase().trim().includes(normalizedSearch),
  );

  const handleAddExistingTag = async (tag: Tag) => {
    if (personTagIds.has(tag.id) || addInFlightRef.current.has(tag.id)) {
      notifications.show(
        warningNotificationTemplate({
          description: t("TagAlreadyAddedMessage", { name: tag.label }),
          title: t("TagAlreadyAddedTitle"),
        }),
      );
      return;
    }

    addInFlightRef.current.add(tag.id);

    try {
      await addTagMutation.mutateAsync(tag.id);
    } catch {
      notifications.show(
        errorNotificationTemplate({
          description: t("AddError"),
          title: t("AddError"),
        }),
      );
    } finally {
      addInFlightRef.current.delete(tag.id);
    }

    setSearch("");
    combobox.openDropdown();
    combobox.updateSelectedOptionIndex("active");
  };

  const openCreateModal = (prefillLabel: string) => {
    openTagEditorModal({
      initialLabel: prefillLabel,
      initialSelectedPersonIds: [personId],
      mode: "create",
      onCreated: () => {},
      onDeleted: () => {},
      onUpdated: () => {},
    });
  };

  const openEditModal = (tag: Tag) => {
    openTagEditorModal({
      mode: "edit",
      onCreated: () => {},
      onDeleted: () => {},
      onUpdated: () => {},
      tag: tag as unknown as TagWithCount,
    });
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagMutation.mutateAsync(tagId);
    } catch {
      notifications.show(
        errorNotificationTemplate({
          description: t("RemoveError"),
          title: t("RemoveError"),
        }),
      );
    }
  };

  const handleCreateRequest = () => {
    const trimmed = search.trim();

    if (trimmed) {
      const exactMatch = workspaceTags.find(
        (tag) => tag.label.toLowerCase() === trimmed.toLowerCase(),
      );

      if (exactMatch) {
        if (personTagIds.has(exactMatch.id)) {
          notifications.show(
            warningNotificationTemplate({
              description: t("TagAlreadyAddedMessage", { name: exactMatch.label }),
              title: t("TagAlreadyAddedTitle"),
            }),
          );
          return;
        }

        void handleAddExistingTag(exactMatch);
        return;
      }
    }

    combobox.closeDropdown();
    setSearch("");
    openCreateModal(trimmed);
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

    if (event.key === "Backspace" && !search.trim() && personTags.length > 0) {
      event.preventDefault();
      const lastTag = personTags[personTags.length - 1];
      if (lastTag) {
        void handleRemoveTag(lastTag.id);
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (combobox.dropdownOpened && document.querySelector('[data-combobox-selected="true"]')) {
        return;
      }
      handleCreateRequest();
    }
  };

  const showCreateOption =
    search.trim().length === 0 ||
    !workspaceTags.some((tag) => tag.label.toLowerCase() === search.trim().toLowerCase());

  return (
    <Combobox
      onOptionSubmit={(value) => {
        if (value === "__create__") {
          handleCreateRequest();
          return;
        }

        const tag = workspaceTags.find((item) => item.id === value);
        if (tag) {
          void handleAddExistingTag(tag);
        }
      }}
      store={combobox}
    >
      <Combobox.DropdownTarget>
        <PillsInput
          label={
            <Text fw={500} mb={4} size="sm">
              {t("Label")}
            </Text>
          }
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
        >
          <Group gap="xs" wrap="wrap">
            {personTags.map((tag) => (
              <TagPill
                clearable
                color={tag.color}
                key={tag.id}
                label={tag.label}
                onClick={() => openEditModal(tag)}
                onRemove={() => {
                  void handleRemoveTag(tag.id);
                }}
                preventInputBlur
                removeTooltipLabel={t("RemoveTagTooltip")}
                showAddIcon={false}
                showEditIcon={false}
                tooltipLabel={tSettings("ClickToEdit")}
              />
            ))}

            <Combobox.EventsTarget>
              <PillsInput.Field
                onBlur={() => combobox.closeDropdown()}
                onChange={(event) => {
                  const next = event.currentTarget.value;
                  setSearch(next);
                  combobox.updateSelectedOptionIndex();
                  combobox.openDropdown();
                }}
                onKeyDown={handleKeyDown}
                placeholder={personTags.length === 0 ? t("Placeholder") : undefined}
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
                    <Tooltip label={t("TagAlreadyAppliedTooltip")} withArrow>
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
            </Group>
          </Combobox.Options>
        </ScrollArea.Autosize>
      </Combobox.Dropdown>

      <style global jsx>{`
        .tags-input-combobox-option[data-combobox-selected="true"] .tags-input-option-pill {
          transform: scale(1.03);
        }
        .tags-input-combobox-option[data-combobox-selected="true"] .tags-input-add-button {
          transform: scale(1.03);
          font-weight: 600;
        }
      `}</style>
    </Combobox>
  );
}
