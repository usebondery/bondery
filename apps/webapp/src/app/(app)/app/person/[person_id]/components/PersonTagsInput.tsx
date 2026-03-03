"use client";

import { Combobox, PillsInput, useCombobox, Text, Group, ScrollArea, Box } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { Tag, TagWithCount } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { errorNotificationTemplate, warningNotificationTemplate } from "@bondery/mantine-next";
import { API_URL } from "@/lib/config";
import { TagPill } from "@/app/(app)/app/components/tags/TagPill";
import { openTagEditorModal } from "@/app/(app)/app/components/tags/openTagEditorModal";
import { AddNewTagButton } from "@/app/(app)/app/components/tags/AddNewTagButton";

interface PersonTagsInputProps {
  personId: string;
  initialTags: Tag[];
  allTags: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
}

function toTag(tag: TagWithCount | Tag): Tag {
  return {
    id: tag.id,
    userId: tag.userId,
    label: tag.label,
    color: tag.color,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}

export function PersonTagsInput({
  personId,
  initialTags,
  allTags,
  onTagsChange,
}: PersonTagsInputProps) {
  const t = useTranslations("TagsInput");
  const tSettings = useTranslations("TagsSettings");
  const [personTags, setPersonTags] = useState<Tag[]>(initialTags);
  const [workspaceTags, setWorkspaceTags] = useState<Tag[]>(allTags);
  const [search, setSearch] = useState("");

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const personTagIds = new Set(personTags.map((tag) => tag.id));

  const filteredOptions = workspaceTags.filter(
    (tag) =>
      !personTagIds.has(tag.id) &&
      tag.label.toLowerCase().trim().includes(search.toLowerCase().trim()),
  );

  const updatePersonTags = useCallback(
    (next: Tag[]) => {
      setPersonTags(next);
      onTagsChange?.(next);
    },
    [onTagsChange],
  );

  const addTagToPerson = async (tagId: string) => {
    const res = await fetch(`${API_URL}${API_ROUTES.CONTACTS}/${personId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tagId }),
    });

    if (!res.ok) throw new Error("Failed to add tag to person");
  };

  const removeTagFromPerson = async (tagId: string) => {
    const res = await fetch(`${API_URL}${API_ROUTES.CONTACTS}/${personId}/tags/${tagId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to remove tag from person");
  };

  const handleAddExistingTag = async (tag: Tag) => {
    if (personTagIds.has(tag.id)) {
      notifications.show(
        warningNotificationTemplate({
          title: t("TagAlreadyAddedTitle"),
          description: t("TagAlreadyAddedMessage", { name: tag.label }),
        }),
      );
      return;
    }

    try {
      await addTagToPerson(tag.id);
      updatePersonTags([...personTags, tag]);
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: t("AddError"),
          description: t("AddError"),
        }),
      );
    }

    setSearch("");
    combobox.openDropdown();
    combobox.updateSelectedOptionIndex("active");
  };

  const openCreateModal = (prefillLabel: string) => {
    openTagEditorModal({
      t: tSettings,
      mode: "create",
      initialLabel: prefillLabel,
      initialSelectedPersonIds: [personId],
      onCreated: (createdTag, selectedPersonIds) => {
        const normalizedTag = toTag(createdTag);

        setWorkspaceTags((prev) => [...prev, normalizedTag]);

        if (selectedPersonIds.includes(personId)) {
          updatePersonTags([...personTags, normalizedTag]);
        }
      },
      onUpdated: () => {},
      onDeleted: () => {},
    });
  };

  const openEditModal = (tag: Tag) => {
    openTagEditorModal({
      t: tSettings,
      mode: "edit",
      tag: tag as unknown as TagWithCount,
      onCreated: () => {},
      onUpdated: (updatedTag, selectedPersonIds) => {
        const normalizedTag = toTag(updatedTag);

        setWorkspaceTags((prev) =>
          prev.map((existing) => (existing.id === normalizedTag.id ? normalizedTag : existing)),
        );

        const currentlyAssigned = personTags.some((existing) => existing.id === normalizedTag.id);
        const shouldBeAssigned = selectedPersonIds.includes(personId);

        if (currentlyAssigned && !shouldBeAssigned) {
          updatePersonTags(personTags.filter((existing) => existing.id !== normalizedTag.id));
          return;
        }

        if (!currentlyAssigned && shouldBeAssigned) {
          updatePersonTags([...personTags, normalizedTag]);
          return;
        }

        updatePersonTags(
          personTags.map((existing) =>
            existing.id === normalizedTag.id ? normalizedTag : existing,
          ),
        );
      },
      onDeleted: (deletedTagId) => {
        setWorkspaceTags((prev) => prev.filter((existing) => existing.id !== deletedTagId));
        updatePersonTags(personTags.filter((existing) => existing.id !== deletedTagId));
      },
    });
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagFromPerson(tagId);
      updatePersonTags(personTags.filter((tag) => tag.id !== tagId));
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: t("RemoveError"),
          description: t("RemoveError"),
        }),
      );
    }
  };

  const handleCreateRequest = () => {
    const trimmed = search.trim();
    if (!trimmed) return;

    const exactMatch = workspaceTags.find(
      (tag) => tag.label.toLowerCase() === trimmed.toLowerCase(),
    );

    if (exactMatch) {
      if (personTagIds.has(exactMatch.id)) {
        notifications.show(
          warningNotificationTemplate({
            title: t("TagAlreadyAddedTitle"),
            description: t("TagAlreadyAddedMessage", { name: exactMatch.label }),
          }),
        );
        return;
      }

      void handleAddExistingTag(exactMatch);
      return;
    }

    combobox.closeDropdown();
    openCreateModal(trimmed);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // ArrowDown/Up: only open dropdown when closed; otherwise let Combobox.EventsTarget
    // handle them natively to avoid double-movement (both handlers would fire otherwise).
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!combobox.dropdownOpened) {
        event.preventDefault();
        combobox.openDropdown();
        combobox.updateSelectedOptionIndex("active");
      }
      return;
    }

    // ArrowRight/Left: Combobox doesn't handle these natively, so we do.
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
      // If a dropdown option is visually focused (data-combobox-selected), let the
      // Combobox.EventsTarget handler fire onOptionSubmit — don't invoke handleCreateRequest.
      if (combobox.dropdownOpened && document.querySelector('[data-combobox-selected="true"]')) {
        return;
      }
      handleCreateRequest();
    }
  };

  const showCreateOption =
    search.trim().length > 0 &&
    !workspaceTags.some((tag) => tag.label.toLowerCase() === search.trim().toLowerCase());

  return (
    <Combobox
      store={combobox}
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
    >
      <Combobox.DropdownTarget>
        <PillsInput
          leftSection={<IconTag size={16} />}
          label={
            <Text size="sm" fw={500} mb={4}>
              {t("Label")}
            </Text>
          }
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
        >
          <Group gap="xs" wrap="wrap">
            {personTags.map((tag) => (
              <TagPill
                key={tag.id}
                label={tag.label}
                color={tag.color}
                tooltipLabel={tSettings("ClickToEdit")}
                showEditIcon={false}
                showAddIcon={false}
                preventInputBlur
                clearable
                removeTooltipLabel={t("RemoveTagTooltip")}
                onClick={() => openEditModal(tag)}
                onRemove={() => {
                  void handleRemoveTag(tag.id);
                }}
              />
            ))}

            <Combobox.EventsTarget>
              <PillsInput.Field
                value={search}
                placeholder={personTags.length === 0 ? t("Placeholder") : undefined}
                onChange={(event) => {
                  const next = event.currentTarget.value;
                  setSearch(next);
                  combobox.updateSelectedOptionIndex();
                  combobox.openDropdown();
                }}
                onKeyDown={handleKeyDown}
                onBlur={() => combobox.closeDropdown()}
              />
            </Combobox.EventsTarget>
          </Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <ScrollArea.Autosize mah={220} type="scroll">
          <Combobox.Options>
            <Group p="xs" gap="xs" wrap="wrap">
              {showCreateOption ? (
                <Box>
                  <Combobox.Option
                    value="__create__"
                    className="tags-input-combobox-option"
                    style={{ padding: 0, background: "transparent" }}
                  >
                    <AddNewTagButton
                      label={t("AddNewTagOption", { label: search.trim() })}
                      preventInputBlur
                      className="tags-input-add-button"
                      onClick={handleCreateRequest}
                    />
                  </Combobox.Option>
                </Box>
              ) : null}

              {filteredOptions.map((tag) => (
                <Box key={tag.id}>
                  <Combobox.Option
                    value={tag.id}
                    className="tags-input-combobox-option"
                    style={{ padding: 0, background: "transparent" }}
                  >
                    <TagPill
                      label={tag.label}
                      color={tag.color}
                      tooltipLabel={t("AddTagTooltip")}
                      showEditIcon={false}
                      showAddIcon={true}
                      preventInputBlur
                      className="tags-input-option-pill"
                      onClick={() => {
                        void handleAddExistingTag(tag);
                      }}
                    />
                  </Combobox.Option>
                </Box>
              ))}
            </Group>
          </Combobox.Options>

          {filteredOptions.length === 0 && !showCreateOption ? (
            <Combobox.Empty
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 80,
              }}
            >
              {t("NoTagsFound")}
            </Combobox.Empty>
          ) : null}
        </ScrollArea.Autosize>
      </Combobox.Dropdown>

      <style jsx global>{`
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
