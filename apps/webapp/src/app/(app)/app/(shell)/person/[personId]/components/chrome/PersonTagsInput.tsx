"use client";

import { errorNotificationTemplate, warningNotificationTemplate } from "@bondery/mantine-next";
import { notifications } from "@mantine/notifications";
import { useRef } from "react";
import { openTagEditorModal } from "@/components/tags/openTagEditorModal";
import { TagsInput, type TagsInputTag } from "@/components/tags/TagsInput";
import { useTagsInputTranslations, useTagsSettingsTranslations } from "@/lib/i18n/generated/hooks";
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

function toTagsInputTag(tag: { color?: string | null; id: string; label: string }): TagsInputTag {
  return {
    color: tag.color,
    id: tag.id,
    label: tag.label,
  };
}

export function PersonTagsInput({ personId }: PersonTagsInputProps) {
  const t = useTagsInputTranslations();
  const tSettings = useTagsSettingsTranslations();
  const addTagMutation = useAddTagToContactMutation(personId);
  const removeTagMutation = useRemoveTagFromContactMutation(personId);
  const { data: personTags = [] } = useContactTagsQuery(personId);
  const { data: allTags = [] } = useTagsListQuery(PERSON_ALL_TAGS);
  const addInFlightRef = useRef<Set<string>>(new Set());

  const selected = personTags.map(toTagsInputTag);
  const selectedIds = new Set(selected.map((tag) => tag.id));
  const tags = allTags.map(toTagsInputTag);

  const handleAddExistingTag = (tag: TagsInputTag) => {
    if (selectedIds.has(tag.id) || addInFlightRef.current.has(tag.id)) {
      notifications.show(
        warningNotificationTemplate({
          description: t("TagAlreadyAddedMessage", { name: tag.label }),
          title: t("TagAlreadyAddedTitle"),
        }),
      );
      return false;
    }

    addInFlightRef.current.add(tag.id);

    void addTagMutation.mutateAsync(tag.id).then(
      () => {
        addInFlightRef.current.delete(tag.id);
      },
      () => {
        addInFlightRef.current.delete(tag.id);
        notifications.show(
          errorNotificationTemplate({
            description: t("AddError"),
            title: t("AddError"),
          }),
        );
      },
    );

    return true;
  };

  const handleRemoveTag = (tagId: string) => {
    void removeTagMutation.mutateAsync(tagId).catch(() => {
      notifications.show(
        errorNotificationTemplate({
          description: t("RemoveError"),
          title: t("RemoveError"),
        }),
      );
    });
  };

  return (
    <TagsInput
      allowCreate
      editTooltip={tSettings("ClickToEdit")}
      label={t("Label")}
      onAlreadySelected={(tag) => {
        notifications.show(
          warningNotificationTemplate({
            description: t("TagAlreadyAddedMessage", { name: tag.label }),
            title: t("TagAlreadyAddedTitle"),
          }),
        );
      }}
      onCreate={(label) => {
        openTagEditorModal({
          initialLabel: label,
          initialSelectedPersonIds: [personId],
          mode: "create",
          onCreated: () => {},
          onDeleted: () => {},
          onUpdated: () => {},
        });
      }}
      onEdit={(tag) => {
        const source = allTags.find((item) => item.id === tag.id);
        if (!source) {
          return;
        }
        openTagEditorModal({
          mode: "edit",
          onCreated: () => {},
          onDeleted: () => {},
          onUpdated: () => {},
          tag: source,
        });
      }}
      onRemove={handleRemoveTag}
      onSelect={handleAddExistingTag}
      placeholder={t("Placeholder")}
      selected={selected}
      tags={tags}
    />
  );
}
