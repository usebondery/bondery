import type { EmojiCategoryName } from "@bondery/helpers/emoji";
import { type ReactNode, useState } from "react";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import {
  useMobileEmojiPickerTranslations,
  useMobileGroupsTranslations,
} from "@/lib/i18n/generated/hooks";
import { MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ActionButtonShellPressable } from "../ui/ActionButtonShellPressable";
import { EMOJI_PICKER_LAYOUT } from "./constants";
import { EmojiPickerSheet } from "./EmojiPickerSheet";

export interface EmojiPickerInputProps {
  accessibilityLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  onChange: (emoji: string) => void;
  placeholder?: string;
  /** Fills available width in a flex row (e.g. 50/50 with color picker). */
  stretch?: boolean;
  triggerStyle?: StyleProp<ViewStyle>;
  value: string;
}

const CATEGORY_TRANSLATION_KEYS: Record<EmojiCategoryName, string> = {
  Activities: "Category.Activities",
  Animals: "Category.Animals",
  Buildings: "Category.Buildings",
  Celebrations: "Category.Celebrations",
  Food: "Category.Food",
  Hearts: "Category.Hearts",
  Humans: "Category.Humans",
  Miscellaneous: "Category.Miscellaneous",
  Nature: "Category.Nature",
  Objects: "Category.Objects",
  Sports: "Category.Sports",
  Travel: "Category.Travel",
  Work: "Category.Work",
};

export function EmojiPickerInput({
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled = false,
  compact = false,
  stretch = false,
  accessibilityLabel,
  triggerStyle,
}: EmojiPickerInputProps) {
  const tMobileEmojiPicker = useMobileEmojiPickerTranslations();
  const tMobileGroups = useMobileGroupsTranslations();
  const colors = useMobileThemeColors();
  const [open, setOpen] = useState(false);

  const resolvedPlaceholder = placeholder ?? tMobileGroups("EditEmojiPlaceholder");
  const resolvedAccessibilityLabel = accessibilityLabel ?? label ?? tMobileGroups("EditEmojiLabel");
  const hasValue = value.trim().length > 0;

  function getCategoryLabel(categoryKey: string) {
    const translationKey = CATEGORY_TRANSLATION_KEYS[categoryKey as EmojiCategoryName];
    return translationKey ? tMobileEmojiPicker(translationKey as never) : categoryKey;
  }

  let triggerContent: ReactNode;
  if (hasValue) {
    triggerContent = (
      <Text style={[styles.selectedEmoji, { color: colors.textPrimary }]}>{value}</Text>
    );
  } else if (compact) {
    triggerContent = null;
  } else {
    triggerContent = (
      <Text numberOfLines={1} style={[styles.placeholder, { color: colors.textSecondary }]}>
        {resolvedPlaceholder}
      </Text>
    );
  }

  const layout = stretch ? "stretch" : "square";

  return (
    <>
      <View style={[stretch ? styles.stretchRoot : compact ? styles.compactRoot : styles.root]}>
        {label ? (
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        ) : null}

        <ActionButtonShellPressable
          accessibilityHint={tMobileEmojiPicker("TriggerAccessibilityHint")}
          accessibilityLabel={resolvedAccessibilityLabel}
          disabled={disabled}
          layout={layout}
          matchInputChrome
          onPress={() => setOpen(true)}
          style={[
            compact && !stretch ? { width: EMOJI_PICKER_LAYOUT.compactTriggerWidth } : null,
            triggerStyle,
          ]}
          variant="outline"
        >
          {triggerContent}
        </ActionButtonShellPressable>

        {error ? <Text style={[styles.error, { color: colors.dangerText }]}>{error}</Text> : null}
      </View>

      <EmojiPickerSheet
        emptySearchLabel={tMobileEmojiPicker("EmptySearch")}
        getCategoryLabel={getCategoryLabel}
        onOpenChange={setOpen}
        onSelect={onChange}
        open={open && !disabled}
        searchPlaceholder={tMobileEmojiPicker("SearchPlaceholder")}
        value={value}
      />
    </>
  );
}

const styles = StyleSheet.create({
  compactRoot: {
    alignSelf: "flex-start",
    flexShrink: 0,
    width: EMOJI_PICKER_LAYOUT.compactTriggerWidth,
  },
  error: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    marginTop: 6,
  },
  label: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
    marginBottom: 6,
  },
  placeholder: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
    textAlign: "center",
  },
  root: {
    width: "100%",
  },
  selectedEmoji: {
    fontSize: EMOJI_PICKER_LAYOUT.triggerEmojiFontSize,
    lineHeight: MOBILE_TYPOGRAPHY.fontSize.cardTitle,
    textAlign: "center",
  },
  stretchRoot: {
    flex: 1,
    minWidth: 0,
  },
});
