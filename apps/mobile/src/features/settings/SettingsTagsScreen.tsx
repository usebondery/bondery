import type { TagWithCount } from "@bondery/schemas";
import { IconPlus } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { updateSettings } from "../../lib/api/client";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import type {
  MobilePreferencesState,
  TagSortOrder,
} from "../../lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { useTags } from "../../lib/sync/hooks/useSyncQuery";
import { MOBILE_HIT_SLOP, MOBILE_LAYOUT } from "../../theme/tokens";
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

  const { data: syncedTags, isInitialSync, refresh: refreshTags } = useTags();
  const [loadError, _setLoadError] = useState<string | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagWithCount | null>(null);

  const tagSortOrder = useMobilePreferences((state: MobilePreferencesState) => state.tagSortOrder);
  const setTagSortOrder = useMobilePreferences(
    (state: MobilePreferencesState) => state.setTagSortOrder,
  );

  const sortedTags = useMemo(() => sortTags(syncedTags, tagSortOrder), [tagSortOrder, syncedTags]);

  const editTags = useMemo(() => sortTags(syncedTags, "alpha-asc"), [syncedTags]);

  const sortOptions: Array<{ value: TagSortOrder; label: string }> = [
    { label: t("GroupSortCountDesc", { ns: "MobileSettings" }), value: "count-desc" },
    { label: t("GroupSortCountAsc", { ns: "MobileSettings" }), value: "count-asc" },
    { label: t("GroupSortAlphaAsc", { ns: "MobileSettings" }), value: "alpha-asc" },
    { label: t("GroupSortAlphaDesc", { ns: "MobileSettings" }), value: "alpha-desc" },
  ];

  const handleSortChange = (nextOrder: TagSortOrder) => {
    if (nextOrder === tagSortOrder) {
      return;
    }

    setTagSortOrder(nextOrder);
    void updateSettings({ tagSortOrder: nextOrder });
  };

  const isLoading = isInitialSync && syncedTags.length === 0;

  const reloadTags = useCallback(() => {
    refreshTags();
  }, [refreshTags]);

  const handleTagCreated = useCallback(() => {
    refreshTags();
  }, [refreshTags]);

  const handleTagSaved = useCallback(() => {
    setEditingTag(null);
    refreshTags();
  }, [refreshTags]);

  const handleTagDeleted = useCallback(() => {
    setEditingTag(null);
    refreshTags();
  }, [refreshTags]);

  const previewCaption =
    syncedTags.length === 0 && !isLoading && !loadError
      ? t("PreviewHintTagsEmpty", { ns: "MobileSettings" })
      : t("PreviewHintTags", { ns: "MobileSettings" });

  const createButton = (
    <Pressable
      accessibilityLabel={t("AddNewTag", { ns: "TagsSettings" })}
      accessibilityRole="button"
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
        onBack={() => router.back()}
        right={createButton}
        title={t("Title", { ns: "TagsSettings" })}
        variant="elevated"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
      >
        <SettingsFieldLabel>{t("TagSortSelectLabel", { ns: "MobileSettings" })}</SettingsFieldLabel>
        <SettingsSelect
          label={t("TagSortSelectLabel", { ns: "MobileSettings" })}
          onValueChange={handleSortChange}
          options={sortOptions}
          value={tagSortOrder}
        />

        <SettingsPreviewSection caption={previewCaption}>
          <SettingsAsyncState
            errorDescription={loadError}
            errorTitle={t("TagsLoadErrorTitle", { ns: "MobileSettings" })}
            isLoading={isLoading}
            onRetry={() => {
              void reloadTags();
            }}
          >
            <ContactsTagsHeader
              layout="chipRow"
              shouldShowCreateAction={false}
              showEmptyPlaceholder
              tags={sortedTags}
            />
          </SettingsAsyncState>
        </SettingsPreviewSection>

        {!isLoading && !loadError ? (
          <>
            <SettingsFieldLabel>{t("ManageTags", { ns: "TagsSettings" })}</SettingsFieldLabel>
            <ContactsTagsHeader
              layout="wrap"
              onCreatePress={() => setCreateOpen(true)}
              onTagPress={(tag) => setEditingTag(tag)}
              tags={editTags}
            />
          </>
        ) : null}
      </ScrollView>

      <TagEditSheet
        mode="create"
        onCreated={handleTagCreated}
        onOpenChange={setCreateOpen}
        open={isCreateOpen}
      />

      <TagEditSheet
        initialColor={editingTag?.color ?? ""}
        initialLabel={editingTag?.label ?? ""}
        mode="edit"
        onDeleted={handleTagDeleted}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTag(null);
          }
        }}
        onSaved={handleTagSaved}
        open={editingTag !== null}
        tagId={editingTag?.id ?? ""}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingTop: MOBILE_LAYOUT.spacing.contentTop,
  },
  screen: {
    flex: 1,
  },
});
