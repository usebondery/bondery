import { XStack } from "@tamagui/stacks";
import { Paragraph } from "@tamagui/text";
import type { Tag, TagWithCount } from "@bondery/schemas";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from "react-native";
import {
  addTagToContact,
  fetchContactTags,
  fetchTags,
  removeTagFromContact,
} from "../../../lib/api/client";
import { MOBILE_OPACITY } from "../../../lib/config";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobilePreferences } from "../../../lib/preferences/useMobilePreferences";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { SearchActionSheet } from "../../../components/SearchActionSheet";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { TagSelectRow } from "./TagSelectRow";
import { sortTags } from "../tagSort";

interface ContactEditTagsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  onTagsReplaced: (tags: Tag[]) => void;
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
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const tagSortOrder = useMobilePreferences((state) => state.tagSortOrder);

  const [query, setQuery] = useState("");
  const [allTags, setAllTags] = useState<TagWithCount[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
      setQuery("");
      setAllTags([]);
      setSelectedTagIds(new Set());
      setInitialSelectedIds(new Set());
      return;
    }

    let cancelled = false;
    setIsLoadingTags(true);

    void Promise.all([fetchTags(), fetchContactTags(contactId)])
      .then(([tagsResponse, membershipResponse]) => {
        if (cancelled) {
          return;
        }

        setAllTags(tagsResponse.tags);
        const memberIds = new Set(membershipResponse.tags.map((tag) => tag.id));
        setInitialSelectedIds(memberIds);
        setSelectedTagIds(new Set(memberIds));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        showToast({
          type: "error",
          headline: t("MobileApp.Common.ErrorTitle"),
          description: t("MobileApp.ContactDetail.TagsLoadError"),
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
  }, [contactId, onOpenChange, open, showToast, t]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isSaving) {
      return;
    }

    onOpenChange(nextOpen);
  }

  function handleClose() {
    if (isSaving) {
      return;
    }

    onOpenChange(false);
  }

  function toggleTag(tagId: string) {
    if (isSaving || isLoadingTags) {
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

  const handleSave = () => {
    void (async () => {
      if (!hasChanges || isSaving) {
        return;
      }

      const added = [...selectedTagIds].filter((tagId) => !initialSelectedIds.has(tagId));
      const removed = [...initialSelectedIds].filter((tagId) => !selectedTagIds.has(tagId));

      setIsSaving(true);

      try {
        await Promise.all([
          ...added.map((tagId) => addTagToContact(contactId, tagId)),
          ...removed.map((tagId) => removeTagFromContact(contactId, tagId)),
        ]);

        const newTags = allTags.filter((tag) => selectedTagIds.has(tag.id));
        onOpenChange(false);
        onTagsReplaced(newTags);
      } catch {
        showToast({
          type: "error",
          headline: t("MobileApp.Common.ErrorTitle"),
          description: t("MobileApp.ContactDetail.EditTagsFailed"),
        });
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const renderItem = ({ item }: ListRenderItemInfo<TagWithCount>) => (
    <TagSelectRow
      tag={item}
      isSelected={selectedTagIds.has(item.id)}
      onToggle={() => toggleTag(item.id)}
      disabled={isSaving || isLoadingTags}
    />
  );

  const canSave = hasChanges && !isSaving && !isLoadingTags;

  const sheetHeader = (
    <Paragraph
      fontSize={MOBILE_TYPOGRAPHY.fontSize.sheetTitle}
      fontWeight={MOBILE_TYPOGRAPHY.fontWeight.bold}
      color={colors.textPrimary}
    >
      {t("MobileApp.ContactDetail.EditTagsSheetTitle")}
    </Paragraph>
  );

  const sheetFooter = (
    <XStack gap={10}>
      <Pressable
        accessibilityRole="button"
        disabled={isSaving}
        onPress={handleClose}
        style={({ pressed }) => [
          styles.footerButton,
          styles.footerButtonOutline,
          {
            borderColor: colors.borderStrong,
            backgroundColor: colors.surface,
            opacity: isSaving ? MOBILE_OPACITY.disabled : pressed ? MOBILE_OPACITY.pressed : 1,
          },
        ]}
      >
        <Text style={[styles.footerButtonText, { color: colors.textPrimary }]}>
          {t("MobileApp.Common.Cancel")}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={!canSave}
        onPress={handleSave}
        style={({ pressed }) => [
          styles.footerButton,
          {
            borderColor: colors.primary,
            backgroundColor: colors.primary,
            opacity: !canSave ? MOBILE_OPACITY.disabled : pressed ? MOBILE_OPACITY.pressed : 1,
          },
        ]}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} />
        ) : (
          <Text style={[styles.footerButtonText, { color: colors.textOnPrimary }]}>
            {t("MobileApp.ContactDetail.EditTagsSave")}
          </Text>
        )}
      </Pressable>
    </XStack>
  );

  return (
    <SearchActionSheet
      open={open}
      onOpenChange={handleOpenChange}
      query={query}
      onQueryChange={setQuery}
      searchPlaceholder={t("MobileApp.Tags.EditTagsSearchPlaceholder")}
      searchEditable={!isSaving && !isLoadingTags}
      dismissible={!isSaving}
      header={sheetHeader}
      footer={sheetFooter}
    >
      {isLoadingTags ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : allTags.length === 0 ? (
        <View style={styles.emptyState}>
          <Paragraph
            fontSize={MOBILE_TYPOGRAPHY.fontSize.body}
            fontWeight={MOBILE_TYPOGRAPHY.fontWeight.semibold}
            color={colors.textPrimary}
            textAlign="center"
          >
            {t("MobileApp.Tags.NoTagsYet")}
          </Paragraph>
          <Paragraph
            fontSize={MOBILE_TYPOGRAPHY.fontSize.caption}
            color={colors.textSecondary}
            textAlign="center"
            marginTop={6}
          >
            {t("MobileApp.Tags.NoTagsYetHint")}
          </Paragraph>
        </View>
      ) : (
        <FlatList
          style={styles.searchList}
          data={displayedTags}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          initialNumToRender={24}
          maxToRenderPerBatch={24}
          windowSize={8}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t("MobileApp.Common.NoResults")}
            </Text>
          }
        />
      )}
    </SearchActionSheet>
  );
}

const styles = StyleSheet.create({
  searchList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 24,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  footerButton: {
    flex: 1,
    minHeight: MOBILE_LAYOUT.touchTarget,
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footerButtonOutline: {},
  footerButtonText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
});
