import type { TagWithCount } from "@bondery/schemas";
import { IconPlus } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { ActionIcon } from "../../components/ui/ActionIcon";
import { InputWrapper } from "../../components/ui/InputWrapper";
import { Select } from "../../components/ui/Select";
import { Stack } from "../../components/ui/Stack";
import { updateSettings } from "../../lib/api/client";
import {
  useCommonTranslations,
  useMobileSettingsTranslations,
  useTagsSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
import { goBackOrReplace } from "../../lib/navigation/goBackOrReplace";
import type {
  MobilePreferencesState,
  TagSortOrder,
} from "../../lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { useTags } from "../../lib/sync/hooks/useSyncQuery";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ContactsTagsHeader } from "../contacts/components/ContactsTagsHeader";
import { TagEditSheet } from "../contacts/components/TagEditSheet";
import { sortTags } from "../contacts/tagSort";
import { SettingsAsyncState } from "./components/SettingsAsyncState";
import { SettingsPreviewSection } from "./components/SettingsPreviewSection";

export function SettingsTagsScreen() {
  const tMobileSettings = useMobileSettingsTranslations();
  const tTagsSettings = useTagsSettingsTranslations();
  const _t = useCommonTranslations();
  const router = useRouter();
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
    { label: tMobileSettings("GroupSortCountDesc"), value: "count-desc" },
    { label: tMobileSettings("GroupSortCountAsc"), value: "count-asc" },
    { label: tMobileSettings("GroupSortAlphaAsc"), value: "alpha-asc" },
    { label: tMobileSettings("GroupSortAlphaDesc"), value: "alpha-desc" },
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

  const previewDescription =
    syncedTags.length === 0 && !isLoading && !loadError
      ? tMobileSettings("PreviewHintTagsEmpty")
      : tMobileSettings("PreviewHintTags");

  return (
    <>
      <StackNavBar
        onBack={() => goBackOrReplace(router, "/settings")}
        right={
          <ActionIcon
            accessibilityLabel={tTagsSettings("AddNewTag")}
            onPress={() => setCreateOpen(true)}
          >
            <IconPlus size={22} stroke={colors.primary} />
          </ActionIcon>
        }
        title={tTagsSettings("Title")}
        variant="elevated"
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
          paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
          paddingTop: MOBILE_LAYOUT.spacing.contentTop,
        }}
        style={{ backgroundColor: colors.appBackground }}
      >
        <Stack gap="lg">
          <Select
            data={sortOptions}
            label={tMobileSettings("TagSortSelectLabel")}
            onChange={handleSortChange}
            value={tagSortOrder}
          />

          <SettingsPreviewSection description={previewDescription}>
            <SettingsAsyncState
              errorDescription={loadError}
              errorTitle={tMobileSettings("TagsLoadErrorTitle")}
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
            <InputWrapper label={tTagsSettings("ManageTags")}>
              <ContactsTagsHeader
                layout="wrap"
                onCreatePress={() => setCreateOpen(true)}
                onTagPress={(tag) => setEditingTag(tag)}
                tags={editTags}
              />
            </InputWrapper>
          ) : null}
        </Stack>
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
