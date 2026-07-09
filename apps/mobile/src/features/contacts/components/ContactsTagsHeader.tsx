import type { TagWithCount } from "@bondery/schemas";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
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
  headerText?: string;
  /** Disables tag chips and the create action. */
  isDisabled?: boolean;
  /** @default "section" */
  layout?: ContactsTagsHeaderLayout;
  /** Shows the dashed create chip when provided. */
  onCreatePress?: () => void;
  /**
   * When set, tag chips are tappable. Omit for display-only chips (e.g. contact detail).
   * Create action is independent — pass `onCreatePress` to show the create chip.
   */
  onTagPress?: (tag: TagWithCount) => void;
  /** @default true when `onCreatePress` is set */
  shouldShowCreateAction?: boolean;
  /** Shows a static "No tags yet" chip when `tags` is empty (preview / display-only). */
  showEmptyPlaceholder?: boolean;
  tags: TagWithCount[];
  title?: string;
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
          disabled={isDisabled}
          isClickable={onTagPress !== undefined}
          key={tag.id}
          onPress={onTagPress ? () => onTagPress(tag) : undefined}
          tag={tag}
        />
      ))}
      {showCreateAction && onCreatePress ? (
        <CreateTagChip disabled={isDisabled} onPress={onCreatePress} />
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
  const sectionTitle = headerText ?? title ?? t("Label", { ns: "TagsInput" });
  const showCreateAction =
    (shouldShowCreateAction ?? onCreatePress !== undefined) && onCreatePress !== undefined;

  const chipList = (
    <TagChipList
      isDisabled={isDisabled}
      onCreatePress={onCreatePress}
      onTagPress={onTagPress}
      showCreateAction={showCreateAction}
      showEmptyPlaceholder={showEmptyPlaceholder}
      tags={tags}
    />
  );

  return (
    <View
      pointerEvents={isDisabled ? "none" : "auto"}
      style={!isEmbeddedLayout ? styles.section : undefined}
    >
      {!isEmbeddedLayout ? (
        <View style={[styles.titleRow, isDisabled && styles.disabled]}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>{sectionTitle}</Text>
        </View>
      ) : null}

      {isWrapLayout ? (
        <View style={[styles.tagsWrap, isDisabled && styles.disabled]}>{chipList}</View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.tagsRow,
            isChipRowLayout && styles.tagsRowEmbedded,
            isDisabled && styles.disabled,
          ]}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {chipList}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
  section: {
    gap: 8,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tagsRow: {
    gap: 8,
    paddingHorizontal: 16,
  },
  tagsRowEmbedded: {
    paddingLeft: 0,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  titleRow: {
    paddingHorizontal: 16,
  },
  titleText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sectionLabel,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
