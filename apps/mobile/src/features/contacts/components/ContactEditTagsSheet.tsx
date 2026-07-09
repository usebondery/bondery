import type { Tag, TagWithCount } from "@bondery/schemas";
import { XStack } from "@tamagui/stacks";
import { Paragraph } from "@tamagui/text";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SearchActionSheet } from "../../../components/SearchActionSheet";
import { MOBILE_OPACITY } from "../../../lib/config";
import { addTagToContact, removeTagFromContact } from "../../../lib/domains/contacts";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobilePreferences } from "../../../lib/preferences/useMobilePreferences";
import { getContactTags, listTags } from "../../../lib/sync/hooks/useSyncQuery";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { sortTags } from "../tagSort";
import { TagSelectRow } from "./TagSelectRow";

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

    void Promise.resolve()
      .then(() => {
        if (cancelled) {
          return;
        }

        const allTags = listTags();
        setAllTags(allTags);
        const memberIds = new Set(getContactTags(contactId).map((tag) => tag.id));
        setInitialSelectedIds(memberIds);
        setSelectedTagIds(new Set(memberIds));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        showToast({
          description: t("TagsLoadError", { ns: "MobileContactDetail" }),
          headline: t("feedback.errorTitle", { ns: "common" }),
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
        for (const tagId of added) {
          addTagToContact(contactId, tagId);
        }
        for (const tagId of removed) {
          removeTagFromContact(contactId, tagId);
        }

        const newTags = allTags.filter((tag) => selectedTagIds.has(tag.id));
        onOpenChange(false);
        onTagsReplaced(newTags);
      } catch {
        showToast({
          description: t("EditTagsFailed", { ns: "MobileContactDetail" }),
          headline: t("feedback.errorTitle", { ns: "common" }),
          type: "error",
        });
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const renderItem = ({ item }: ListRenderItemInfo<TagWithCount>) => (
    <TagSelectRow
      disabled={isSaving || isLoadingTags}
      isSelected={selectedTagIds.has(item.id)}
      onToggle={() => toggleTag(item.id)}
      tag={item}
    />
  );

  const canSave = hasChanges && !isSaving && !isLoadingTags;

  const sheetHeader = (
    <Paragraph
      color={colors.textPrimary}
      fontSize={MOBILE_TYPOGRAPHY.fontSize.sheetTitle}
      fontWeight={MOBILE_TYPOGRAPHY.fontWeight.bold}
    >
      {t("EditTagsSheetTitle", { ns: "MobileContactDetail" })}
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
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
            opacity: isSaving ? MOBILE_OPACITY.disabled : pressed ? MOBILE_OPACITY.pressed : 1,
          },
        ]}
      >
        <Text style={[styles.footerButtonText, { color: colors.textPrimary }]}>
          {t("actions.cancel", { ns: "common" })}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={!canSave}
        onPress={handleSave}
        style={({ pressed }) => [
          styles.footerButton,
          {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
            opacity: !canSave ? MOBILE_OPACITY.disabled : pressed ? MOBILE_OPACITY.pressed : 1,
          },
        ]}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.textOnPrimary} size="small" />
        ) : (
          <Text style={[styles.footerButtonText, { color: colors.textOnPrimary }]}>
            {t("EditTagsSave", { ns: "MobileContactDetail" })}
          </Text>
        )}
      </Pressable>
    </XStack>
  );

  return (
    <SearchActionSheet
      dismissible={!isSaving}
      footer={sheetFooter}
      header={sheetHeader}
      onOpenChange={handleOpenChange}
      onQueryChange={setQuery}
      open={open}
      query={query}
      searchEditable={!isSaving && !isLoadingTags}
      searchPlaceholder={t("EditTagsSearchPlaceholder", { ns: "MobileTags" })}
    >
      {isLoadingTags ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : allTags.length === 0 ? (
        <View style={styles.emptyState}>
          <Paragraph
            color={colors.textPrimary}
            fontSize={MOBILE_TYPOGRAPHY.fontSize.body}
            fontWeight={MOBILE_TYPOGRAPHY.fontWeight.semibold}
            textAlign="center"
          >
            {t("NoTagsYet", { ns: "MobileTags" })}
          </Paragraph>
          <Paragraph
            color={colors.textSecondary}
            fontSize={MOBILE_TYPOGRAPHY.fontSize.caption}
            marginTop={6}
            textAlign="center"
          >
            {t("NoTagsYetHint", { ns: "MobileTags" })}
          </Paragraph>
        </View>
      ) : (
        <FlatList
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.listContent}
          data={displayedTags}
          initialNumToRender={24}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t("feedback.noResults", { ns: "common" })}
            </Text>
          }
          maxToRenderPerBatch={24}
          renderItem={renderItem}
          style={styles.searchList}
          windowSize={8}
        />
      )}
    </SearchActionSheet>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    paddingVertical: 24,
    textAlign: "center",
  },
  footerButton: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: MOBILE_LAYOUT.touchTarget,
  },
  footerButtonOutline: {},
  footerButtonText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  listContent: {
    paddingBottom: 12,
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: 32,
  },
  searchList: {
    flex: 1,
  },
});
