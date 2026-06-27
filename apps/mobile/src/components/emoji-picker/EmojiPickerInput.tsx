import { IconChevronDown } from "@tabler/icons-react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { EmojiCategoryName } from "@bondery/helpers/emoji";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { EMOJI_PICKER_LAYOUT } from "./constants";
import { EmojiPickerSheet } from "./EmojiPickerSheet";

export interface EmojiPickerInputProps {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  compact?: boolean;
  /** Fills available width in a flex row (e.g. 50/50 with color picker). */
  stretch?: boolean;
  accessibilityLabel?: string;
  triggerStyle?: StyleProp<ViewStyle>;
}

const CATEGORY_TRANSLATION_KEYS: Record<EmojiCategoryName, string> = {
  Humans: "MobileApp.EmojiPicker.Category.Humans",
  Work: "MobileApp.EmojiPicker.Category.Work",
  Celebrations: "MobileApp.EmojiPicker.Category.Celebrations",
  Sports: "MobileApp.EmojiPicker.Category.Sports",
  Travel: "MobileApp.EmojiPicker.Category.Travel",
  Animals: "MobileApp.EmojiPicker.Category.Animals",
  Buildings: "MobileApp.EmojiPicker.Category.Buildings",
  Nature: "MobileApp.EmojiPicker.Category.Nature",
  Food: "MobileApp.EmojiPicker.Category.Food",
  Activities: "MobileApp.EmojiPicker.Category.Activities",
  Hearts: "MobileApp.EmojiPicker.Category.Hearts",
  Objects: "MobileApp.EmojiPicker.Category.Objects",
  Miscellaneous: "MobileApp.EmojiPicker.Category.Miscellaneous",
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
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const [open, setOpen] = useState(false);

  const resolvedPlaceholder = placeholder ?? t("MobileApp.Groups.EditEmojiPlaceholder");
  const resolvedAccessibilityLabel =
    accessibilityLabel ?? label ?? t("MobileApp.Groups.EditEmojiLabel");
  const hasValue = value.trim().length > 0;

  const getCategoryLabel = useCallback(
    (categoryKey: string) => {
      const translationKey = CATEGORY_TRANSLATION_KEYS[categoryKey as EmojiCategoryName];
      return translationKey ? t(translationKey) : categoryKey;
    },
    [t],
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
      <Text style={[styles.placeholder, { color: triggerTextColor }]} numberOfLines={1}>
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
          accessibilityRole="button"
          accessibilityLabel={resolvedAccessibilityLabel}
          accessibilityHint={t("MobileApp.EmojiPicker.TriggerAccessibilityHint")}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.trigger,
            compact ? styles.compactTrigger : null,
            stretch ? styles.stretchTrigger : null,
            {
              backgroundColor: pressed && !disabled ? colors.surfacePressed : colors.inputBackground,
              borderColor: triggerBorderColor,
              opacity: disabled ? 0.5 : 1,
            },
            triggerStyle,
          ]}
        >
          <View style={styles.triggerContent}>{triggerContent}</View>
          {!(compact && hasValue) ? (
            <IconChevronDown size={16} color={colors.iconSecondary} />
          ) : null}
        </Pressable>

        {error ? <Text style={[styles.error, { color: colors.dangerText }]}>{error}</Text> : null}
      </View>

      {open && !disabled ? (
        <EmojiPickerSheet
          open
          value={value}
          searchPlaceholder={t("MobileApp.EmojiPicker.SearchPlaceholder")}
          emptySearchLabel={t("MobileApp.EmojiPicker.EmptySearch")}
          getCategoryLabel={getCategoryLabel}
          onOpenChange={setOpen}
          onSelect={onChange}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  compactRoot: {
    alignSelf: "flex-start",
    width: EMOJI_PICKER_LAYOUT.compactTriggerWidth,
    flexShrink: 0,
  },
  stretchRoot: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
    marginBottom: MOBILE_LAYOUT.spacing.contentTop / 2,
  },
  trigger: {
    minHeight: MOBILE_LAYOUT.touchTarget,
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: MOBILE_LAYOUT.spacing.contentTop / 2,
  },
  compactTrigger: {
    width: EMOJI_PICKER_LAYOUT.compactTriggerWidth,
    paddingHorizontal: 8,
  },
  stretchTrigger: {
    width: "100%",
  },
  triggerContent: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedEmoji: {
    fontSize: EMOJI_PICKER_LAYOUT.triggerEmojiFontSize,
    lineHeight: MOBILE_LAYOUT.touchTarget,
    textAlign: "center",
  },
  placeholder: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
    textAlign: "center",
  },
  error: {
    marginTop: 6,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
  },
});
