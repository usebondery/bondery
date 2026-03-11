"use client";

import { Card, CardSection, Group, Text } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { TagWithCount } from "@bondery/types";
import { TagPill } from "@/app/(app)/app/components/tags/TagPill";
import { openTagEditorModal } from "@/app/(app)/app/components/tags/openTagEditorModal";
import { AddNewTagButton } from "@/app/(app)/app/components/tags/AddNewTagButton";

interface TagsSectionProps {
  initialTags: TagWithCount[];
}

export function TagsSection({ initialTags }: TagsSectionProps) {
  const t = useTranslations("TagsSettings");
  const [tags, setTags] = useState<TagWithCount[]>(initialTags);

  return (
    <Card id="tags" withBorder shadow="sm">
      <CardSection withBorder inheritPadding py="md">
        <Group gap="xs">
          <IconTag size={20} stroke={1.5} />
          <Text size="lg" fw={600}>
            {t("Title")}
          </Text>
        </Group>
      </CardSection>

      <CardSection inheritPadding py="md">
        <Group gap="sm" align="center">
          {tags.map((tag) => (
            <TagPill
              key={tag.id}
              label={tag.label}
              color={tag.color}
              tooltipLabel={t("ClickToEdit")}
              showEditIcon={true}
              onClick={() => {
                openTagEditorModal({
                  t,
                  mode: "edit",
                  tag,
                  onCreated: () => {},
                  onUpdated: (updatedTag) => {
                    setTags((prev) =>
                      prev.map((existing) =>
                        existing.id === updatedTag.id ? updatedTag : existing,
                      ),
                    );
                  },
                  onDeleted: (tagId) => {
                    setTags((prev) => prev.filter((existing) => existing.id !== tagId));
                  },
                });
              }}
            />
          ))}

          <AddNewTagButton
            label={t("AddNewTag")}
            onClick={() => {
              openTagEditorModal({
                t,
                mode: "create",
                onCreated: (createdTag) => {
                  setTags((prev) => [...prev, createdTag]);
                },
                onUpdated: () => {},
                onDeleted: () => {},
              });
            }}
          />
        </Group>
      </CardSection>
    </Card>
  );
}
