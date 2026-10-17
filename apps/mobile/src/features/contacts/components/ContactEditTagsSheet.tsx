import type { Tag, TagWithCount } from "@bondery/schemas";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SelectOptionRow, SelectSheet } from "@/components/ui/Select";
import { Text } from "@/components/ui/Text";
import {
  useCommonTranslations,
  useMobileContactDetailTranslations,
  useMobileTagsTranslations,
} from "@/lib/i18n/generated/hooks";
import { addTagToContact, removeTagFromContact } from "../../../lib/domains/contacts";
import { useSheetLocalAction } from "../../../lib/forms/useSheetLocalAction";
import { useMobilePreferences } from "../../../lib/preferences/useMobilePreferences";
import { syncEffectState } from "../../../lib/react/syncEffectState";
import { getContactTags, listTags } from "../../../lib/sync/hooks/useSyncQuery";
import { notifications } from "../../../lib/toast/notifications";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { sortTags } from "../tagSort";
import { TagChip } from "./TagChip";

interface ContactEditTagsSheetProps {
  contactId: string;
  contactName: string;
  onOpenChange: (open: boolean) => void;
  onTagsReplaced: (tags: Tag[]) => void;
  open: boolean;
}

function filterTags(tags: TagWithCount[], query: string): TagWithCount[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return tags;
  }

  return tags.filter((tag) => (tag.label ?? "").toLowerCase().includes(normalizedQuery));
}

function setsEqual(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

export function ContactEditTagsSheet({
  open,
  onOpenChange,
  contactId,
  contactName: _contactName,
  onTagsReplaced,
}: ContactEditTagsSheetProps) {
  const tMobileContactDetail = useMobileContactDetailTranslations();
  const tMobileTags = useMobileTagsTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const tagSortOrder = useMobilePreferences((state) => state.tagSortOrder);

  const [query, setQuery] = useState("");
  const [allTags, setAllTags] = useState<TagWithCount[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(() => new Set());
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<string>>(() => new Set());

  const displayedTags = useMemo(
    () => sortTags(filterTags(allTags, query), tagSortOrder),
    [allTags, query, tagSortOrder],
  );
  const hasChanges = useMemo(
    () => !setsEqual(initialSelectedIds, selectedTagIds),
    [initialSelectedIds, selectedTagIds],
  );

  useEffect(() => {
    if (!open) {
      syncEffectState(() => {
        setQuery("");
        setAllTags([]);
        setSelectedTagIds(new Set());
        setInitialSelectedIds(new Set());
      });
      return;
    }

    let cancelled = false;
    syncEffectState(() => {
      setIsLoadingTags(true);
    });

    void Promise.resolve()
      .then(() => {
        if (cancelled) {
          return;
        }

        const tags = listTags();
        setAllTags(tags);
        const memberIds = new Set(getContactTags(contactId).map((tag) => tag.id));
        setInitialSelectedIds(memberIds);
        setSelectedTagIds(new Set(memberIds));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        notifications.show({
          message: tMobileContactDetail("TagsLoadError"),
          title: t("feedback.errorTitle"),
          type: "error",
        });
        onOpenChange(false);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingTags(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contactId, onOpenChange, open, tMobileContactDetail, t]);

  const handleCloseSheet = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSaveError = useCallback(() => {
    notifications.show({
      message: tMobileContactDetail("EditTagsFailed"),
      title: t("feedback.errorTitle"),
      type: "error",
    });
  }, [t, tMobileContactDetail]);

  const performSave = useCallback(() => {
    const added = [...selectedTagIds].filter((tagId) => !initialSelectedIds.has(tagId));
    const removed = [...initialSelectedIds].filter((tagId) => !selectedTagIds.has(tagId));

    for (const tagId of added) {
      addTagToContact(contactId, tagId);
    }
    for (const tagId of removed) {
      removeTagFromContact(contactId, tagId);
    }

    return allTags.filter((tag) => selectedTagIds.has(tag.id));
  }, [allTags, contactId, initialSelectedIds, selectedTagIds]);

  const handleSaveSuccess = useCallback(
    (newTags: Tag[]) => {
      onTagsReplaced(newTags);
    },
    [onTagsReplaced],
  );

  const { isSubmitting, submit } = useSheetLocalAction({
    onClose: handleCloseSheet,
    onError: handleSaveError,
    onSuccess: handleSaveSuccess,
    perform: performSave,
  });

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    onOpenChange(false);
  }

  function toggleTag(tagId: string) {
    if (isSubmitting || isLoadingTags) {
      return;
    }

    setSelectedTagIds((current) => {
      const next = new Set(current);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }

      return next;
    });
  }

  const canSave = hasChanges && !isSubmitting && !isLoadingTags;

  const listEmpty = isLoadingTags ? (
    <View className="items-center py-8">
      <ActivityIndicator color={colors.primary} size="small" />
    </View>
  ) : (
    <>
      <Text className="text-center" fw={600}>
        {tMobileTags("NoTagsYet")}
      </Text>
      <Text c="secondary" className="mt-1.5 text-center" size="sm">
        {tMobileTags("NoTagsYetHint")}
      </Text>
    </>
  );

  return (
    <SelectSheet
      actions={[
        {
          disabled: isSubmitting,
          label: t("actions.cancel"),
          onPress: handleClose,
          tone: "neutral",
          variant: "outline",
        },
        {
          disabled: !canSave,
          label: tMobileContactDetail("EditTagsSave"),
          loading: isSubmitting,
          loadingText: t("feedback.saving"),
          onPress: submit,
          tone: "primary",
          variant: "filled",
        },
      ]}
      data={isLoadingTags ? [] : displayedTags}
      emptyLabel={t("feedback.noResults")}
      emptyState={allTags.length === 0 || isLoadingTags ? listEmpty : undefined}
      isBusy={isSubmitting}
      keyExtractor={(item) => item.id}
      onClose={handleClose}
      onQueryChange={setQuery}
      opened={open}
      query={query}
      renderItem={({ item }) => (
        <SelectOptionRow
          disabled={isSubmitting || isLoadingTags}
          isSelected={selectedTagIds.has(item.id)}
          mode="multiple"
          onPress={() => toggleTag(item.id)}
          option={{
            label: item.label ?? "",
            leftSection: <TagChip isClickable={false} tag={item} />,
            value: item.id,
          }}
        />
      )}
      searchable
      searchEditable={!isSubmitting && !isLoadingTags}
      searchPlaceholder={tMobileTags("EditTagsSearchPlaceholder")}
      snapPoint="selectSearch"
      title={tMobileContactDetail("EditTagsSheetTitle")}
    />
  );
}
