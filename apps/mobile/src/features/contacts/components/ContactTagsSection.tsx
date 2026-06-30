import { IconPencil } from "@tabler/icons-react-native";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { Tag, TagWithCount } from "@bondery/schemas";
import { LoadErrorCard } from "../../../components/load-state";
import { contactsDomain } from "../../../lib/domains/contacts";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobilePreferences } from "../../../lib/preferences/useMobilePreferences";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { sortTags } from "../tagSort";
import { ContactDetailSectionHeader } from "./ContactDetailSectionHeader";
import { ContactEditTagsSheet } from "./ContactEditTagsSheet";
import { ContactsTagsHeader } from "./ContactsTagsHeader";
import { TagEditSheet } from "./TagEditSheet";

interface ContactTagsSectionProps {
  contactId: string;
  contactName: string;
  tags: TagWithCount[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onTagAdded: (tag: Tag) => void;
  onTagsReplaced: (tags: Tag[]) => void;
}

function TagsLoadingSkeleton() {
  const colors = useMobileThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tagsRow}
    >
      {[72, 96, 84].map((width, index) => (
        <View
          key={index}
          style={[
            styles.skeletonChip,
            {
              width,
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
            },
          ]}
        />
      ))}
    </ScrollView>
  );
}

export function ContactTagsSection({
  contactId,
  contactName,
  tags,
  loading,
  error,
  onRetry,
  onTagAdded,
  onTagsReplaced,
}: ContactTagsSectionProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const [isEditSheetOpen, setEditSheetOpen] = useState(false);
  const [isCreateTagOpen, setCreateTagOpen] = useState(false);
  const tagSortOrder = useMobilePreferences((state) => state.tagSortOrder);

  const sortedTags = useMemo(
    () => sortTags(tags, tagSortOrder),
    [tagSortOrder, tags],
  );

  const editAccessibilityLabel = t(
    "MobileApp.ContactDetail.TagsEditAccessibility",
  ).replace("{name}", contactName);

  const handleTagCreated = useCallback(
    (tag: Tag) => {
      try {
        contactsDomain.addTag(contactId, tag.id);
        onTagAdded(tag);
      } catch {
        showToast({
          type: "error",
          headline: t("MobileApp.Common.ErrorTitle"),
          description: t("MobileApp.Tags.CreateFailed"),
        });
      }
    },
    [contactId, onTagAdded, showToast, t],
  );

  return (
    <View style={styles.section}>
      <ContactDetailSectionHeader
        titleKey="MobileApp.TagsInput.Label"
        action={
          loading || error
            ? undefined
            : {
                label: t("MobileApp.ContactDetail.TagsEdit"),
                accessibilityLabel: editAccessibilityLabel,
                icon: <IconPencil size={16} stroke={colors.primary} />,
                onPress: () => setEditSheetOpen(true),
              }
        }
      />

      {loading ? (
        <TagsLoadingSkeleton />
      ) : error ? (
        <LoadErrorCard
          title={t("MobileApp.Settings.TagsLoadErrorTitle")}
          description={error}
          onRetry={onRetry}
        />
      ) : (
        <ContactsTagsHeader
          layout="chipRow"
          tags={sortedTags}
          onCreatePress={() => setCreateTagOpen(true)}
        />
      )}

      <TagEditSheet
        mode="create"
        open={isCreateTagOpen}
        onOpenChange={setCreateTagOpen}
        onCreated={handleTagCreated}
      />

      <ContactEditTagsSheet
        open={isEditSheetOpen}
        onOpenChange={setEditSheetOpen}
        contactId={contactId}
        contactName={contactName}
        onTagsReplaced={onTagsReplaced}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    gap: 8,
  },
  tagsRow: {
    gap: 8,
  },
  skeletonChip: {
    height: 36,
    borderRadius: 20,
    borderWidth: 1,
  },
});
