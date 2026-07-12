import type { Tag, TagWithCount } from "@bondery/schemas";
import { IconPencil } from "@tabler/icons-react-native";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  useCommonTranslations,
  useMobileContactDetailTranslations,
  useMobileSettingsTranslations,
  useMobileTagsTranslations,
} from "@/lib/i18n/generated/hooks";
import { LoadErrorCard } from "../../../components/load-state";
import { addTagToContact } from "../../../lib/domains/contacts";
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
  error: string | null;
  loading: boolean;
  onRetry: () => void;
  onTagAdded: (tag: Tag) => void;
  onTagsReplaced: (tags: Tag[]) => void;
  tags: TagWithCount[];
}

function TagsLoadingSkeleton() {
  const colors = useMobileThemeColors();

  return (
    <ScrollView
      contentContainerStyle={styles.tagsRow}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {[72, 96, 84].map((width) => (
        <View
          key={width}
          style={[
            styles.skeletonChip,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              width,
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
  const tMobileContactDetail = useMobileContactDetailTranslations();
  const tMobileSettings = useMobileSettingsTranslations();
  const tMobileTags = useMobileTagsTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const [isEditSheetOpen, setEditSheetOpen] = useState(false);
  const [isCreateTagOpen, setCreateTagOpen] = useState(false);
  const tagSortOrder = useMobilePreferences((state) => state.tagSortOrder);

  const sortedTags = useMemo(() => sortTags(tags, tagSortOrder), [tagSortOrder, tags]);

  const editAccessibilityLabel = tMobileContactDetail("TagsEditAccessibility").replace(
    "{name}",
    contactName,
  );

  const handleTagCreated = useCallback(
    (tag: Tag) => {
      try {
        addTagToContact(contactId, tag.id);
        onTagAdded(tag);
      } catch {
        showToast({
          description: tMobileTags("CreateFailed"),
          headline: t("feedback.errorTitle"),
          type: "error",
        });
      }
    },
    [contactId, onTagAdded, showToast, tMobileTags, t],
  );

  return (
    <View style={styles.section}>
      <ContactDetailSectionHeader
        action={
          loading || error
            ? undefined
            : {
                accessibilityLabel: editAccessibilityLabel,
                icon: <IconPencil size={16} stroke={colors.primary} />,
                label: tMobileContactDetail("TagsEdit"),
                onPress: () => setEditSheetOpen(true),
              }
        }
        titleKey="Label"
        titleNamespace="TagsInput"
      />

      {loading ? (
        <TagsLoadingSkeleton />
      ) : error ? (
        <LoadErrorCard
          description={error}
          onRetry={onRetry}
          title={tMobileSettings("TagsLoadErrorTitle")}
        />
      ) : (
        <ContactsTagsHeader
          layout="chipRow"
          onCreatePress={() => setCreateTagOpen(true)}
          tags={sortedTags}
        />
      )}

      <TagEditSheet
        mode="create"
        onCreated={handleTagCreated}
        onOpenChange={setCreateTagOpen}
        open={isCreateTagOpen}
      />

      <ContactEditTagsSheet
        contactId={contactId}
        contactName={contactName}
        onOpenChange={setEditSheetOpen}
        onTagsReplaced={onTagsReplaced}
        open={isEditSheetOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
    marginBottom: 24,
  },
  skeletonChip: {
    borderRadius: 20,
    borderWidth: 1,
    height: 36,
  },
  tagsRow: {
    gap: 8,
  },
});
