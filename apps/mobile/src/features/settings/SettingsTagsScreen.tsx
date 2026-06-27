import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { IconPlus } from "@tabler/icons-react-native";
import type { Tag, TagWithCount } from "@bondery/schemas";
import { StackNavBar } from "../../components/chrome";
import { fetchTags, updateSettings } from "../../lib/api/client";
import type {
  MobilePreferencesState,
  TagSortOrder,
} from "../../lib/preferences/useMobilePreferences";
import { useTagsStore } from "../../lib/store";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import {
  MOBILE_HIT_SLOP,
  MOBILE_LAYOUT,
} from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ContactsTagsHeader } from "../contacts/components/ContactsTagsHeader";
import { TagEditSheet } from "../contacts/components/TagEditSheet";
import { sortTags } from "../contacts/tagSort";
import { SettingsAsyncState } from "./components/SettingsAsyncState";
import { SettingsFieldLabel } from "./components/SettingsFieldLabel";
import { SettingsPreviewSection } from "./components/SettingsPreviewSection";
import { SettingsSelect } from "./components/SettingsSelect";

export function SettingsTagsScreen() {
  const router = useRouter();
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();

  const tagsById = useTagsStore((state) => state.byId);
  const upsertTag = useTagsStore((state) => state.upsertTag);
  const upsertTags = useTagsStore((state) => state.upsertTags);
  const removeTag = useTagsStore((state) => state.removeTag);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagWithCount | null>(null);

  const tagSortOrder = useMobilePreferences(
    (state: MobilePreferencesState) => state.tagSortOrder,
  );
  const setTagSortOrder = useMobilePreferences(
    (state: MobilePreferencesState) => state.setTagSortOrder,
  );

  const tags = useMemo(() => Object.values(tagsById), [tagsById]);
  const sortedTags = useMemo(
    () => sortTags(tags, tagSortOrder),
    [tagSortOrder, tags],
  );

  const editTags = useMemo(() => sortTags(tags, "alpha-asc"), [tags]);

  const sortOptions: Array<{ value: TagSortOrder; label: string }> = [
    { value: "count-desc", label: t("MobileApp.Settings.GroupSortCountDesc") },
    { value: "count-asc", label: t("MobileApp.Settings.GroupSortCountAsc") },
    { value: "alpha-asc", label: t("MobileApp.Settings.GroupSortAlphaAsc") },
    { value: "alpha-desc", label: t("MobileApp.Settings.GroupSortAlphaDesc") },
  ];

  const handleSortChange = (nextOrder: TagSortOrder) => {
    if (nextOrder === tagSortOrder) {
      return;
    }

    setTagSortOrder(nextOrder);
    void updateSettings({ tagSortOrder: nextOrder });
  };

  const reloadTags = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetchTags();
      upsertTags(response.tags);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : t("MobileApp.Settings.TagsLoadErrorDescription"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t, upsertTags]);

  useEffect(() => {
    void reloadTags();
  }, [reloadTags]);

  const handleTagCreated = useCallback((tag: Tag) => {
    if (!tag?.id || !tag.label) {
      return;
    }

    upsertTag(tag);
  }, [upsertTag]);

  const handleTagSaved = useCallback((tag: Tag) => {
    if (!tag?.id || !tag.label) {
      return;
    }

    upsertTag(tag);
    setEditingTag(null);
  }, [upsertTag]);

  const handleTagDeleted = useCallback(() => {
    if (!editingTag) {
      return;
    }

    removeTag(editingTag.id);
    setEditingTag(null);
  }, [editingTag, removeTag]);

  const previewCaption =
    tags.length === 0 && !isLoading && !loadError
      ? t("MobileApp.Settings.PreviewHintTagsEmpty")
      : t("MobileApp.Settings.PreviewHintTags");

  const createButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("MobileApp.TagsSettings.AddNewTag")}
      hitSlop={MOBILE_HIT_SLOP}
      onPress={() => setCreateOpen(true)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <IconPlus size={22} stroke={colors.primary} />
    </Pressable>
  );

  return (
    <>
      <StackNavBar
        variant="elevated"
        title={t("MobileApp.TagsSettings.Title")}
        onBack={() => router.back()}
        right={createButton}
      />

      <ScrollView
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
        contentContainerStyle={styles.content}
      >
        <SettingsFieldLabel>
          {t("MobileApp.Settings.TagSortSelectLabel")}
        </SettingsFieldLabel>
        <SettingsSelect
          label={t("MobileApp.Settings.TagSortSelectLabel")}
          options={sortOptions}
          value={tagSortOrder}
          onValueChange={handleSortChange}
        />

        <SettingsPreviewSection caption={previewCaption}>
          <SettingsAsyncState
            isLoading={isLoading}
            errorTitle={t("MobileApp.Settings.TagsLoadErrorTitle")}
            errorDescription={loadError}
            onRetry={() => {
              void reloadTags();
            }}
          >
            <ContactsTagsHeader
              layout="chipRow"
              tags={sortedTags}
              shouldShowCreateAction={false}
              showEmptyPlaceholder
            />
          </SettingsAsyncState>
        </SettingsPreviewSection>

        {!isLoading && !loadError ? (
          <>
            <SettingsFieldLabel>
              {t("MobileApp.TagsSettings.ManageTags")}
            </SettingsFieldLabel>
            <ContactsTagsHeader
              layout="wrap"
              tags={editTags}
              onTagPress={(tag) => setEditingTag(tag)}
              onCreatePress={() => setCreateOpen(true)}
            />
          </>
        ) : null}
      </ScrollView>

      <TagEditSheet
        mode="create"
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleTagCreated}
      />

      <TagEditSheet
        mode="edit"
        open={editingTag !== null}
        tagId={editingTag?.id ?? ""}
        initialLabel={editingTag?.label ?? ""}
        initialColor={editingTag?.color ?? ""}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTag(null);
          }
        }}
        onSaved={handleTagSaved}
        onDeleted={handleTagDeleted}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: MOBILE_LAYOUT.spacing.contentTop,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
    gap: 16,
  },
});
