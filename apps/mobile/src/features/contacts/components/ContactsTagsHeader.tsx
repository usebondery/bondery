import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { TagWithCount } from "@bondery/schemas";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { CreateTagChip } from "./CreateTagChip";
import { EmptyTagsChip } from "./EmptyTagsChip";
import { TagChip } from "./TagChip";

/**
 * How tag chips are laid out:
 *
 * - `section` — Uppercase title + horizontal scroller with horizontal inset (Contacts tab).
 * - `chipRow` — Horizontal scroller only; parent provides title/inset (contact detail, preview).
 * - `wrap` — Wrapping chip row; all tags visible without scrolling (settings edit list).
 */
export type ContactsTagsHeaderLayout = "section" | "chipRow" | "wrap";

interface ContactsTagsHeaderProps {
  tags: TagWithCount[];
  /** @default "section" */
  layout?: ContactsTagsHeaderLayout;
  title?: string;
  headerText?: string;
  /** Disables tag chips and the create action. */
  isDisabled?: boolean;
  /**
   * When set, tag chips are tappable. Omit for display-only chips (e.g. contact detail).
   * Create action is independent — pass `onCreatePress` to show the create chip.
   */
  onTagPress?: (tag: TagWithCount) => void;
  /** Shows the dashed create chip when provided. */
  onCreatePress?: () => void;
  /** @default true when `onCreatePress` is set */
  shouldShowCreateAction?: boolean;
  /** Shows a static "No tags yet" chip when `tags` is empty (preview / display-only). */
  showEmptyPlaceholder?: boolean;
}

function TagChipList({
  tags,
  isDisabled,
  onTagPress,
  showCreateAction,
  showEmptyPlaceholder,
  onCreatePress,
}: {
  tags: TagWithCount[];
  isDisabled: boolean;
  onTagPress?: (tag: TagWithCount) => void;
  showCreateAction: boolean;
  showEmptyPlaceholder: boolean;
  onCreatePress?: () => void;
}) {
  if (tags.length === 0 && showEmptyPlaceholder) {
    return <EmptyTagsChip />;
  }

  return (
    <>
      {tags.map((tag) => (
        <TagChip
          key={tag.id}
          tag={tag}
          disabled={isDisabled}
          isClickable={onTagPress !== undefined}
          onPress={onTagPress ? () => onTagPress(tag) : undefined}
        />
      ))}
      {showCreateAction && onCreatePress ? (
        <CreateTagChip onPress={onCreatePress} disabled={isDisabled} />
      ) : null}
    </>
  );
}

export function ContactsTagsHeader({
  tags,
  layout = "section",
  title,
  headerText,
  isDisabled = false,
  onTagPress,
  onCreatePress,
  shouldShowCreateAction,
  showEmptyPlaceholder = false,
}: ContactsTagsHeaderProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const isChipRowLayout = layout === "chipRow";
  const isWrapLayout = layout === "wrap";
  const isEmbeddedLayout = isChipRowLayout || isWrapLayout;
  const sectionTitle = headerText ?? title ?? t("MobileApp.TagsInput.Label");
  const showCreateAction =
    (shouldShowCreateAction ?? onCreatePress !== undefined) &&
    onCreatePress !== undefined;

  const chipList = (
    <TagChipList
      tags={tags}
      isDisabled={isDisabled}
      onTagPress={onTagPress}
      showCreateAction={showCreateAction}
      showEmptyPlaceholder={showEmptyPlaceholder}
      onCreatePress={onCreatePress}
    />
  );

  return (
    <View
      style={!isEmbeddedLayout ? styles.section : undefined}
      pointerEvents={isDisabled ? "none" : "auto"}
    >
      {!isEmbeddedLayout ? (
        <View style={[styles.titleRow, isDisabled && styles.disabled]}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>
            {sectionTitle}
          </Text>
        </View>
      ) : null}

      {isWrapLayout ? (
        <View style={[styles.tagsWrap, isDisabled && styles.disabled]}>
          {chipList}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.tagsRow,
            isChipRowLayout && styles.tagsRowEmbedded,
            isDisabled && styles.disabled,
          ]}
        >
          {chipList}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  titleRow: {
    paddingHorizontal: 16,
  },
  titleText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sectionLabel,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tagsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tagsRowEmbedded: {
    paddingLeft: 0,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
