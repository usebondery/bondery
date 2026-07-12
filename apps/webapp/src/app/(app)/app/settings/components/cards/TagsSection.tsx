"use client";

import { CardSection, Group } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";
import { AddNewTagButton } from "@/components/tags/AddNewTagButton";
import { openTagEditorModal } from "@/components/tags/openTagEditorModal";
import { TagPill } from "@/components/tags/TagPill";
import { useTagsSettingsTranslations } from "@/lib/i18n/generated/hooks";
import { useTagsListQuery } from "@/lib/query/hooks/useTags";
import { SETTINGS_TAGS_PREVIEW } from "@/lib/query/settingsPageQueryParams";
import { SettingsSection } from "./SettingsSection";

export function TagsSection() {
  const t = useTagsSettingsTranslations();
  const { data: tags = [] } = useTagsListQuery(SETTINGS_TAGS_PREVIEW);

  return (
    <SettingsSection icon={<IconTag size={20} stroke={1.5} />} id="tags" title={t("Title")}>
      <CardSection inheritPadding py="md">
        <Group align="center" gap="sm">
          {tags.map((tag) => (
            <TagPill
              color={tag.color}
              key={tag.id}
              label={tag.label}
              onClick={() => {
                openTagEditorModal({
                  mode: "edit",
                  onCreated: () => {},
                  onDeleted: () => {},
                  onUpdated: () => {},
                  tag,
                });
              }}
              showEditIcon={true}
              tooltipLabel={t("ClickToEdit")}
            />
          ))}

          <AddNewTagButton
            label={t("AddNewTag")}
            onClick={() => {
              openTagEditorModal({
                mode: "create",
                onCreated: () => {},
                onDeleted: () => {},
                onUpdated: () => {},
              });
            }}
          />
        </Group>
      </CardSection>
    </SettingsSection>
  );
}
