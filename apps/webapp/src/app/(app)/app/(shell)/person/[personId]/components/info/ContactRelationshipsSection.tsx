"use client";

import { ActionIconButton, type PeoplePickerOnSearch, PersonChip } from "@bondery/mantine-next";
import type {
  ContactPreview,
  ContactRelationshipWithPeople,
  RelationshipType,
} from "@bondery/schemas";
import { Card, Group, Select, Stack, Text, Tooltip } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { searchContactsPage } from "@/lib/contacts/searchContacts";
import { usePersonRelationshipsTranslations } from "@/lib/i18n/generated/hooks";
import { DEBOUNCE_MS, RELATIONSHIP_TYPE_OPTIONS } from "@/lib/platform/config";

interface ContactRelationshipsSectionProps {
  contactsHasMore?: boolean;
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
  contactsHasMore = false,
  currentPerson,
  selectablePeople,
  relationships,
  isSubmitting,
  onAddRelationship,
  onUpdateRelationship,
  onDeleteRelationship,
}: ContactRelationshipsSectionProps) {
  const t = usePersonRelationshipsTranslations();

  const relationshipTypeOptions = RELATIONSHIP_TYPE_OPTIONS.map((typeOption) => ({
    label: `${typeOption.emoji} ${t(`Types.${typeOption.value}`)}`,
    value: typeOption.value,
  }));

  const handleSearch = useCallback<PeoplePickerOnSearch<ContactPreview>>(
    async (query, paging) => {
      const page = await searchContactsPage(query, paging);
      return {
        contacts: page.contacts.filter((c) => c.id !== currentPerson.id),
        hasMore: page.hasMore,
      };
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
                contactsHasMore={contactsHasMore}
                currentPerson={currentPerson}
                initialRelatedPerson={relatedPerson}
                initialRelationshipType={perspectiveType}
                isLabel={t("IsLabel")}
                isSubmitting={isSubmitting}
                key={relationship.id}
                loadingMoreLabel={t("LoadingMoreLabel")}
                loadMoreErrorLabel={t("LoadMoreError")}
                loadMoreRetryLabel={t("LoadMoreRetry")}
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
                searchDebounceMs={DEBOUNCE_MS.search}
                searchingLabel={t("SearchingLabel")}
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
        contactsHasMore={contactsHasMore}
        currentPerson={currentPerson}
        isLabel={t("IsLabel")}
        isSubmitting={isSubmitting}
        loadingMoreLabel={t("LoadingMoreLabel")}
        loadMoreErrorLabel={t("LoadMoreError")}
        loadMoreRetryLabel={t("LoadMoreRetry")}
        mode="create"
        noPeopleFound={t("NoPeopleFound")}
        ofLabel={t("OfLabel")}
        onCreate={onAddRelationship}
        onSearch={handleSearch}
        relatedPersonPlaceholder={t("RelatedPersonPlaceholder")}
        relationshipTypeOptions={relationshipTypeOptions}
        relationshipTypePlaceholder={t("RelationshipTypePlaceholder")}
        searchDebounceMs={DEBOUNCE_MS.search}
        searchingLabel={t("SearchingLabel")}
        searchPlaceholder={t("SearchPlaceholder")}
        selectablePeople={selectablePeople}
      />
    </Stack>
  );
}

type RelationshipOption = { value: string; label: string };

type RelationshipCardRowBaseProps = {
  addActionLabel?: string;
  contactsHasMore?: boolean;
  currentPerson: ContactPreview;
  initialRelatedPerson?: ContactPreview;
  initialRelationshipType?: RelationshipType;
  isLabel: string;
  isSubmitting: boolean;
  loadingMoreLabel: string;
  loadMoreErrorLabel: string;
  loadMoreRetryLabel: string;
  mode: "create" | "edit";
  noPeopleFound: string;
  ofLabel: string;
  onCreate?: (relationshipType: RelationshipType, relatedPersonId: string) => Promise<void>;
  onDelete?: () => void;
  onUpdate?: (relationshipType: RelationshipType, relatedPersonId: string) => Promise<void>;
  relatedPersonPlaceholder: string;
  relationshipTypeOptions: RelationshipOption[];
  relationshipTypePlaceholder: string;
  removeActionLabel?: string;
  searchingLabel: string;
  searchPlaceholder: string;
  selectablePeople: ContactPreview[];
  showRightAction?: boolean;
};

type RelationshipCardRowProps = RelationshipCardRowBaseProps &
  (
    | {
        onSearch: PeoplePickerOnSearch<ContactPreview>;
        searchDebounceMs: number;
      }
    | {
        onSearch?: never;
        searchDebounceMs?: never;
      }
  );

function RelationshipCardRow({
  mode,
  contactsHasMore = false,
  currentPerson,
  selectablePeople,
  relationshipTypeOptions,
  isSubmitting,
  relationshipTypePlaceholder,
  relatedPersonPlaceholder,
  searchPlaceholder,
  searchingLabel,
  loadingMoreLabel,
  loadMoreErrorLabel,
  loadMoreRetryLabel,
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

  const localHandleSearch = useCallback<PeoplePickerOnSearch<ContactPreview>>(
    async (query, paging) => {
      if (!onSearch) {
        return { contacts: [], hasMore: false };
      }
      const page = await onSearch(query, paging);
      for (const r of page.contacts) {
        knownRelatedPeopleRef.current.set(r.id, r);
      }
      return page;
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

  const handleSelectRelatedPerson = (nextPersonId: string) => {
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
  };

  const relatedPersonChip =
    onSearch != null && searchDebounceMs != null ? (
      <PersonChip
        contactsHasMore={contactsHasMore}
        disabled={isSubmitting || isAutoCreating}
        isSelectable
        loadingMoreLabel={loadingMoreLabel}
        loadMoreErrorLabel={loadMoreErrorLabel}
        loadMoreRetryLabel={loadMoreRetryLabel}
        noResultsLabel={noPeopleFound}
        onSearch={localHandleSearch}
        onSelectPerson={handleSelectRelatedPerson}
        people={selectableRelatedPeople}
        person={relatedPerson}
        placeholder={relatedPersonPlaceholder}
        searchDebounceMs={searchDebounceMs}
        searchingLabel={searchingLabel}
        searchPlaceholder={searchPlaceholder}
        showChevronWhenEmpty
      />
    ) : (
      <PersonChip
        disabled={isSubmitting || isAutoCreating}
        isSelectable
        loadingMoreLabel={loadingMoreLabel}
        loadMoreErrorLabel={loadMoreErrorLabel}
        loadMoreRetryLabel={loadMoreRetryLabel}
        noResultsLabel={noPeopleFound}
        onSelectPerson={handleSelectRelatedPerson}
        people={selectableRelatedPeople}
        person={relatedPerson}
        placeholder={relatedPersonPlaceholder}
        searchingLabel={searchingLabel}
        searchPlaceholder={searchPlaceholder}
        showChevronWhenEmpty
      />
    );

  return (
    <Card p="md" radius="md" shadow="none" withBorder>
      <Group align="center" gap="sm" wrap="wrap">
        {mode === "create" ? (
          <Tooltip label={addActionLabel}>
            <ActionIconButton
              aria-label={addActionLabel}
              color="green"
              icon={<IconPlus />}
              variant="light"
            />
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

        {relatedPersonChip}

        {showRightAction ? (
          <ActionIconButton
            aria-label={removeActionLabel}
            color="red"
            disabled={isSubmitting}
            icon={<IconTrash />}
            ml="auto"
            onClick={onDelete}
            variant="subtle"
          />
        ) : null}
      </Group>
    </Card>
  );
}
