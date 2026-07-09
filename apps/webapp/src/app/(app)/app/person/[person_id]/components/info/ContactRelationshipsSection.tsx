"use client";

import { PersonChip } from "@bondery/mantine-next";
import type {
  ContactPreview,
  ContactRelationshipWithPeople,
  RelationshipType,
} from "@bondery/schemas";
import { ActionIcon, Card, Group, Select, Stack, Text, Tooltip } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { searchContacts } from "@/lib/contacts/searchContacts";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { DEBOUNCE_MS, RELATIONSHIP_TYPE_OPTIONS } from "@/lib/platform/config";

interface ContactRelationshipsSectionProps {
  currentPerson: ContactPreview;
  isSubmitting: boolean;
  onAddRelationship: (relationshipType: RelationshipType, relatedPersonId: string) => Promise<void>;
  onDeleteRelationship: (relationshipId: string) => Promise<void>;
  onUpdateRelationship: (
    relationshipId: string,
    relationshipType: RelationshipType,
    relatedPersonId: string,
  ) => Promise<void>;
  relationships: ContactRelationshipWithPeople[];
  selectablePeople: ContactPreview[];
}

function getPerspectiveType(
  relationshipType: RelationshipType,
  isSourcePerspective: boolean,
): RelationshipType {
  if (isSourcePerspective) {
    return relationshipType;
  }

  if (relationshipType === "parent") {
    return "child";
  }
  if (relationshipType === "child") {
    return "parent";
  }
  if (relationshipType === "guardian") {
    return "dependent";
  }
  if (relationshipType === "dependent") {
    return "guardian";
  }

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
  const t = useWebTranslations("PersonRelationships");

  const relationshipTypeOptions = RELATIONSHIP_TYPE_OPTIONS.map((typeOption) => ({
    label: `${typeOption.emoji} ${t(`Types.${typeOption.value}`)}`,
    value: typeOption.value,
  }));

  const handleSearch = useCallback(
    async (query: string): Promise<ContactPreview[]> => {
      const results = await searchContacts(query);
      return results.filter((c) => c.id !== currentPerson.id);
    },
    [currentPerson.id],
  );

  return (
    <Stack gap="sm">
      <Text fw={600} size="sm">
        {t("Title")}
      </Text>

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
                currentPerson={currentPerson}
                initialRelatedPerson={relatedPerson}
                initialRelationshipType={perspectiveType}
                isLabel={t("IsLabel")}
                isSubmitting={isSubmitting}
                key={relationship.id}
                mode="edit"
                noPeopleFound={t("NoPeopleFound")}
                ofLabel={t("OfLabel")}
                onDelete={() => onDeleteRelationship(relationship.id)}
                onSearch={handleSearch}
                onUpdate={(nextType, nextPersonId) =>
                  onUpdateRelationship(relationship.id, nextType, nextPersonId)
                }
                relatedPersonPlaceholder={t("RelatedPersonPlaceholder")}
                relationshipTypeOptions={relationshipTypeOptions}
                relationshipTypePlaceholder={t("RelationshipTypePlaceholder")}
                removeActionLabel={t("RemoveAction")}
                searchDebounceMs={DEBOUNCE_MS.contactPicker}
                searchPlaceholder={t("SearchPlaceholder")}
                selectablePeople={selectablePeople}
                showRightAction
              />
            );
          })}
        </Stack>
      ) : null}

      <RelationshipCardRow
        addActionLabel={t("AddHint")}
        currentPerson={currentPerson}
        isLabel={t("IsLabel")}
        isSubmitting={isSubmitting}
        mode="create"
        noPeopleFound={t("NoPeopleFound")}
        ofLabel={t("OfLabel")}
        onCreate={onAddRelationship}
        onSearch={handleSearch}
        relatedPersonPlaceholder={t("RelatedPersonPlaceholder")}
        relationshipTypeOptions={relationshipTypeOptions}
        relationshipTypePlaceholder={t("RelationshipTypePlaceholder")}
        searchDebounceMs={DEBOUNCE_MS.contactPicker}
        searchPlaceholder={t("SearchPlaceholder")}
        selectablePeople={selectablePeople}
      />
    </Stack>
  );
}

type RelationshipOption = { value: string; label: string };

interface RelationshipCardRowProps {
  addActionLabel?: string;
  currentPerson: ContactPreview;
  initialRelatedPerson?: ContactPreview;
  initialRelationshipType?: RelationshipType;
  isLabel: string;
  isSubmitting: boolean;
  mode: "create" | "edit";
  noPeopleFound: string;
  ofLabel: string;
  onCreate?: (relationshipType: RelationshipType, relatedPersonId: string) => Promise<void>;
  onDelete?: () => void;
  onSearch?: (query: string) => Promise<ContactPreview[]>;
  onUpdate?: (relationshipType: RelationshipType, relatedPersonId: string) => Promise<void>;
  relatedPersonPlaceholder: string;
  relationshipTypeOptions: RelationshipOption[];
  relationshipTypePlaceholder: string;
  removeActionLabel?: string;
  searchDebounceMs?: number;
  searchPlaceholder: string;
  selectablePeople: ContactPreview[];
  showRightAction?: boolean;
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
  onSearch,
  searchDebounceMs,
}: RelationshipCardRowProps) {
  const [relationshipType, setRelationshipType] = useState<RelationshipType | null>(
    initialRelationshipType || null,
  );
  const [relatedPersonId, setRelatedPersonId] = useState<string | null>(
    initialRelatedPerson?.id || null,
  );
  const [isAutoCreating, setIsAutoCreating] = useState(false);
  const knownRelatedPeopleRef = useRef<Map<string, ContactPreview>>(new Map());

  const selectableRelatedPeople = selectablePeople.filter(
    (candidate) => candidate.id !== currentPerson.id,
  );

  useEffect(() => {
    for (const p of selectableRelatedPeople) {
      knownRelatedPeopleRef.current.set(p.id, p);
    }
  }, [selectableRelatedPeople]);

  useEffect(() => {
    if (initialRelatedPerson) {
      knownRelatedPeopleRef.current.set(initialRelatedPerson.id, initialRelatedPerson);
    }
  }, [initialRelatedPerson]);

  const localHandleSearch = useCallback(
    async (query: string): Promise<ContactPreview[]> => {
      if (!onSearch) {
        return [];
      }
      const results = await onSearch(query);
      for (const r of results) {
        knownRelatedPeopleRef.current.set(r.id, r);
      }
      return results;
    },
    [onSearch],
  );

  const relatedPerson = relatedPersonId
    ? (selectableRelatedPeople.find((candidate) => candidate.id === relatedPersonId) ??
      knownRelatedPeopleRef.current.get(relatedPersonId) ??
      null)
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
    <Card p="md" radius="md" shadow="none" withBorder>
      <Group align="center" gap="sm" wrap="wrap">
        {mode === "create" ? (
          <Tooltip label={addActionLabel} withArrow>
            <ActionIcon aria-label={addActionLabel} color="green" variant="light">
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
        ) : null}

        <PersonChip disabled person={currentPerson} />

        <Text c="dimmed" size="sm">
          {isLabel}
        </Text>

        <Select
          clearable={mode === "create"}
          data={relationshipTypeOptions}
          disabled={isSubmitting || isAutoCreating}
          onChange={(value) => {
            const nextType = value as RelationshipType | null;
            setRelationshipType(nextType);

            if (mode === "edit" && onUpdate && nextType && relatedPersonId) {
              onUpdate(nextType, relatedPersonId);
            }

            void maybeCreate(nextType, relatedPersonId);
          }}
          placeholder={relationshipTypePlaceholder}
          searchable
          value={relationshipType}
        />

        <Text c="dimmed" size="sm">
          {ofLabel}
        </Text>

        <PersonChip
          disabled={isSubmitting || isAutoCreating}
          isSelectable
          noResultsLabel={noPeopleFound}
          onSearch={onSearch ? localHandleSearch : undefined}
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
          people={selectableRelatedPeople}
          person={relatedPerson}
          placeholder={relatedPersonPlaceholder}
          searchDebounceMs={searchDebounceMs}
          searchPlaceholder={searchPlaceholder}
          showChevronWhenEmpty
        />

        {showRightAction ? (
          <ActionIcon
            aria-label={removeActionLabel}
            color="red"
            disabled={isSubmitting}
            ml="auto"
            onClick={onDelete}
            variant="subtle"
          >
            <IconTrash size={16} />
          </ActionIcon>
        ) : null}
      </Group>
    </Card>
  );
}
