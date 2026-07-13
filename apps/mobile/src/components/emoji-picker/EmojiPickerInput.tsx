import type { EmojiCategoryName } from "@bondery/helpers/emoji";
import { IconChevronDown } from "@tabler/icons-react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import {
  useMobileEmojiPickerTranslations,
  useMobileGroupsTranslations,
} from "@/lib/i18n/generated/hooks";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
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

  const getCategoryLabel = useCallback(
    (categoryKey: string) => {
      const translationKey = CATEGORY_TRANSLATION_KEYS[categoryKey as EmojiCategoryName];
      return translationKey ? tMobileEmojiPicker(translationKey) : categoryKey;
    },
    [tMobileEmojiPicker],
  );

  const triggerBorderColor = error ? colors.dangerAccent : colors.borderStrong;
  const triggerTextColor = hasValue ? colors.textPrimary : colors.textSecondary;

  const triggerContent = useMemo(() => {
    if (hasValue) {
      return <Text style={[styles.selectedEmoji, { color: colors.textPrimary }]}>{value}</Text>;
    }

    if (compact) {
      return null;
    }

    return (
      <Text numberOfLines={1} style={[styles.placeholder, { color: triggerTextColor }]}>
        {resolvedPlaceholder}
      </Text>
    );
  }, [colors.textPrimary, compact, hasValue, resolvedPlaceholder, triggerTextColor, value]);

  return (
    <>
      <View style={[stretch ? styles.stretchRoot : compact ? styles.compactRoot : styles.root]}>
        {label ? (
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        ) : null}

        <Pressable
          accessibilityHint={tMobileEmojiPicker("TriggerAccessibilityHint")}
          accessibilityLabel={resolvedAccessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.trigger,
            compact ? styles.compactTrigger : null,
            stretch ? styles.stretchTrigger : null,
            {
              backgroundColor:
                pressed && !disabled ? colors.surfacePressed : colors.inputBackground,
              borderColor: triggerBorderColor,
              opacity: disabled ? 0.5 : 1,
            },
            triggerStyle,
          ]}
        >
          <View style={styles.triggerContent}>{triggerContent}</View>
          {!(compact && hasValue) ? (
            <IconChevronDown color={colors.iconSecondary} size={16} />
          ) : null}
        </Pressable>

        {error ? <Text style={[styles.error, { color: colors.dangerText }]}>{error}</Text> : null}
      </View>

      {open && !disabled ? (
        <EmojiPickerSheet
          emptySearchLabel={tMobileEmojiPicker("EmptySearch")}
          getCategoryLabel={getCategoryLabel}
          onOpenChange={setOpen}
          onSelect={onChange}
          open
          searchPlaceholder={tMobileEmojiPicker("SearchPlaceholder")}
          value={value}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  compactRoot: {
    alignSelf: "flex-start",
    flexShrink: 0,
    width: EMOJI_PICKER_LAYOUT.compactTriggerWidth,
  },
  compactTrigger: {
    paddingHorizontal: 8,
    width: EMOJI_PICKER_LAYOUT.compactTriggerWidth,
  },
  error: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    marginTop: 6,
  },
  label: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
    marginBottom: MOBILE_LAYOUT.spacing.contentTop / 2,
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
    lineHeight: MOBILE_LAYOUT.touchTarget,
    textAlign: "center",
  },
  stretchRoot: {
    flex: 1,
    minWidth: 0,
  },
  stretchTrigger: {
    width: "100%",
  },
  trigger: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: MOBILE_LAYOUT.spacing.contentTop / 2,
    justifyContent: "space-between",
    minHeight: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 12,
  },
  triggerContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
});
