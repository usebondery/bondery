"use client";

import { ActionIcon, Card, Group, Select, Stack, Text, Tooltip } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type {
  ContactPreview,
  ContactRelationshipWithPeople,
  RelationshipType,
} from "@bondery/types";
import { PersonChip } from "@/app/(app)/app/components/shared/PersonChip";
import { RELATIONSHIP_TYPE_OPTIONS } from "@/lib/config";

interface ContactRelationshipsSectionProps {
  currentPerson: ContactPreview;
  selectablePeople: ContactPreview[];
  relationships: ContactRelationshipWithPeople[];
  isSubmitting: boolean;
  onAddRelationship: (relationshipType: RelationshipType, relatedPersonId: string) => Promise<void>;
  onUpdateRelationship: (
    relationshipId: string,
    relationshipType: RelationshipType,
    relatedPersonId: string,
  ) => Promise<void>;
  onDeleteRelationship: (relationshipId: string) => Promise<void>;
}

function getPerspectiveType(
  relationshipType: RelationshipType,
  isSourcePerspective: boolean,
): RelationshipType {
  if (isSourcePerspective) {
    return relationshipType;
  }

  if (relationshipType === "parent") return "child";
  if (relationshipType === "child") return "parent";
  if (relationshipType === "guardian") return "dependent";
  if (relationshipType === "dependent") return "guardian";

  return relationshipType;
}

export function ContactRelationshipsSection({
  currentPerson,
  selectablePeople,
  relationships,
  isSubmitting,
  onAddRelationship,
  onUpdateRelationship,
  onDeleteRelationship,
}: ContactRelationshipsSectionProps) {
  const t = useTranslations("PersonRelationships");

  const relationshipTypeOptions = RELATIONSHIP_TYPE_OPTIONS.map((typeOption) => ({
    value: typeOption.value,
    label: `${typeOption.emoji} ${t(`Types.${typeOption.value}`)}`,
  }));

  return (
    <Stack gap="sm">
      <Text fw={600}>{t("Title")}</Text>

      {relationships.length > 0 ? (
        <Stack gap="xs">
          {relationships.map((relationship) => {
            const isSourcePerspective = relationship.sourcePersonId === currentPerson.id;
            const relatedPerson = isSourcePerspective
              ? relationship.targetPerson
              : relationship.sourcePerson;
            const perspectiveType = getPerspectiveType(
              relationship.relationshipType,
              isSourcePerspective,
            );

            return (
              <RelationshipCardRow
                key={relationship.id}
                mode="edit"
                currentPerson={currentPerson}
                selectablePeople={selectablePeople}
                relationshipTypeOptions={relationshipTypeOptions}
                isSubmitting={isSubmitting}
                relationshipTypePlaceholder={t("RelationshipTypePlaceholder")}
                relatedPersonPlaceholder={t("RelatedPersonPlaceholder")}
                searchPlaceholder={t("SearchPlaceholder")}
                noPeopleFound={t("NoPeopleFound")}
                isLabel={t("IsLabel")}
                ofLabel={t("OfLabel")}
                initialRelationshipType={perspectiveType}
                initialRelatedPerson={relatedPerson}
                showRightAction
                onUpdate={(nextType, nextPersonId) =>
                  onUpdateRelationship(relationship.id, nextType, nextPersonId)
                }
                onDelete={() => onDeleteRelationship(relationship.id)}
                removeActionLabel={t("RemoveAction")}
              />
            );
          })}
        </Stack>
      ) : null}

      <RelationshipCardRow
        mode="create"
        currentPerson={currentPerson}
        selectablePeople={selectablePeople}
        relationshipTypeOptions={relationshipTypeOptions}
        isSubmitting={isSubmitting}
        relationshipTypePlaceholder={t("RelationshipTypePlaceholder")}
        relatedPersonPlaceholder={t("RelatedPersonPlaceholder")}
        searchPlaceholder={t("SearchPlaceholder")}
        noPeopleFound={t("NoPeopleFound")}
        isLabel={t("IsLabel")}
        ofLabel={t("OfLabel")}
        addActionLabel={t("AddHint")}
        onCreate={onAddRelationship}
      />
    </Stack>
  );
}

type RelationshipOption = { value: string; label: string };

interface RelationshipCardRowProps {
  mode: "create" | "edit";
  currentPerson: ContactPreview;
  selectablePeople: ContactPreview[];
  relationshipTypeOptions: RelationshipOption[];
  isSubmitting: boolean;
  relationshipTypePlaceholder: string;
  relatedPersonPlaceholder: string;
  searchPlaceholder: string;
  noPeopleFound: string;
  isLabel: string;
  ofLabel: string;
  initialRelationshipType?: RelationshipType;
  initialRelatedPerson?: ContactPreview;
  showRightAction?: boolean;
  removeActionLabel?: string;
  addActionLabel?: string;
  onCreate?: (relationshipType: RelationshipType, relatedPersonId: string) => Promise<void>;
  onUpdate?: (relationshipType: RelationshipType, relatedPersonId: string) => Promise<void>;
  onDelete?: () => void;
}

function RelationshipCardRow({
  mode,
  currentPerson,
  selectablePeople,
  relationshipTypeOptions,
  isSubmitting,
  relationshipTypePlaceholder,
  relatedPersonPlaceholder,
  searchPlaceholder,
  noPeopleFound,
  isLabel,
  ofLabel,
  initialRelationshipType,
  initialRelatedPerson,
  showRightAction = false,
  removeActionLabel = "Remove",
  addActionLabel = "Add",
  onCreate,
  onUpdate,
  onDelete,
}: RelationshipCardRowProps) {
  const [relationshipType, setRelationshipType] = useState<RelationshipType | null>(
    initialRelationshipType || null,
  );
  const [relatedPersonId, setRelatedPersonId] = useState<string | null>(
    initialRelatedPerson?.id || null,
  );
  const [isAutoCreating, setIsAutoCreating] = useState(false);

  const selectableRelatedPeople = selectablePeople.filter(
    (candidate) => candidate.id !== currentPerson.id,
  );

  const relatedPerson = relatedPersonId
    ? selectableRelatedPeople.find((candidate) => candidate.id === relatedPersonId) || null
    : null;

  const maybeCreate = async (nextType: RelationshipType | null, nextPersonId: string | null) => {
    if (
      mode !== "create" ||
      !onCreate ||
      !nextType ||
      !nextPersonId ||
      isAutoCreating ||
      isSubmitting
    ) {
      return;
    }

    setIsAutoCreating(true);
    try {
      await onCreate(nextType, nextPersonId);
      setRelationshipType(null);
      setRelatedPersonId(null);
    } finally {
      setIsAutoCreating(false);
    }
  };

  return (
    <Card withBorder p="md" radius="md">
      <Group align="center" wrap="wrap" gap="sm">
        {mode === "create" ? (
          <Tooltip label={addActionLabel} withArrow>
            <ActionIcon variant="light" color="green" aria-label={addActionLabel}>
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
        ) : null}

        <PersonChip person={currentPerson} disabled />

        <Text size="sm" c="dimmed">
          {isLabel}
        </Text>

        <Select
          placeholder={relationshipTypePlaceholder}
          value={relationshipType}
          data={relationshipTypeOptions}
          onChange={(value) => {
            const nextType = value as RelationshipType | null;
            setRelationshipType(nextType);

            if (mode === "edit" && onUpdate && nextType && relatedPersonId) {
              onUpdate(nextType, relatedPersonId);
            }

            void maybeCreate(nextType, relatedPersonId);
          }}
          disabled={isSubmitting || isAutoCreating}
          searchable
          clearable={mode === "create"}
        />

        <Text size="sm" c="dimmed">
          {ofLabel}
        </Text>

        <PersonChip
          person={relatedPerson}
          isSelectable
          disabled={isSubmitting || isAutoCreating}
          placeholder={relatedPersonPlaceholder}
          searchPlaceholder={searchPlaceholder}
          noResultsLabel={noPeopleFound}
          people={selectableRelatedPeople}
          showChevronWhenEmpty
          onSelectPerson={(nextPersonId) => {
            if (!nextPersonId) {
              return;
            }

            setRelatedPersonId(nextPersonId);

            if (
              mode === "edit" &&
              onUpdate &&
              relationshipType &&
              nextPersonId !== initialRelatedPerson?.id
            ) {
              onUpdate(relationshipType, nextPersonId);
            }

            void maybeCreate(relationshipType, nextPersonId);
          }}
        />

        {showRightAction ? (
          <ActionIcon
            ml="auto"
            color="red"
            variant="subtle"
            onClick={onDelete}
            disabled={isSubmitting}
            aria-label={removeActionLabel}
          >
            <IconTrash size={16} />
          </ActionIcon>
        ) : null}
      </Group>
    </Card>
  );
}
