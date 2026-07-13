import { useMemo, useState } from "react";
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import {
  useMobileColorPickerTranslations,
  useMobileGroupsTranslations,
} from "../../lib/i18n/generated/hooks";
import type { ShowAppToastInput } from "../../lib/toast/useAppToast";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { EMOJI_PICKER_LAYOUT } from "../emoji-picker/constants";
import { ColorPickerSheet } from "./ColorPickerSheet";
import { getContrastBorderColor, isValidHex, normalizeHex } from "./colorUtils";

export interface ColorPickerInputProps {
  accessibilityLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  onChange: (hex: string) => void;
  placeholder?: string;
  showToast: (options: ShowAppToastInput) => void;
  /** Fills available width in a flex row. */
  stretch?: boolean;
  triggerStyle?: StyleProp<ViewStyle>;
  value: string;
}

export function ColorPickerInput({
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
  showToast,
}: ColorPickerInputProps) {
  const tMobileColorPicker = useMobileColorPickerTranslations();
  const tMobileGroups = useMobileGroupsTranslations();
  const colors = useMobileThemeColors();
  const [open, setOpen] = useState(false);

  const normalizedValue = normalizeHex(value);
  const hasValue = isValidHex(value);
  const resolvedAccessibilityLabel = accessibilityLabel ?? label ?? tMobileGroups("EditColorLabel");
  const resolvedPlaceholder = placeholder ?? tMobileGroups("EditColorLabel");

  const triggerBorderColor = error
    ? colors.dangerAccent
    : getContrastBorderColor(
        hasValue ? normalizedValue : "",
        colors.borderStrong,
        colors.borderStrong,
      );

  const triggerContent = useMemo(() => {
    if (hasValue) {
      return (
        <View
          style={[
            styles.colorSwatch,
            {
              backgroundColor: normalizedValue,
              borderColor: triggerBorderColor,
            },
          ]}
        />
      );
    }

    if (compact) {
      return null;
    }

    return (
      <Text numberOfLines={1} style={[styles.placeholder, { color: colors.textSecondary }]}>
        {resolvedPlaceholder}
      </Text>
    );
  }, [
    colors.textSecondary,
    compact,
    hasValue,
    normalizedValue,
    resolvedPlaceholder,
    triggerBorderColor,
  ]);

  return (
    <>
      <View style={[stretch ? styles.stretchRoot : compact ? styles.compactRoot : styles.root]}>
        {label ? (
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        ) : null}

        <Pressable
          accessibilityHint={tMobileColorPicker("TriggerAccessibilityHint")}
          accessibilityLabel={resolvedAccessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.trigger,
            compact && !stretch ? styles.squareTrigger : null,
            compact && stretch ? styles.compactTrigger : null,
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
        </Pressable>

        {error ? <Text style={[styles.error, { color: colors.dangerText }]}>{error}</Text> : null}
      </View>

      {open && !disabled ? (
        <ColorPickerSheet
          onOpenChange={setOpen}
          onSelect={onChange}
          open
          showToast={showToast}
          value={hasValue ? normalizedValue : ""}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  colorSwatch: {
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    width: 24,
  },
  compactRoot: {
    alignSelf: "flex-start",
    flexShrink: 0,
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
  squareTrigger: {
    height: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 0,
    width: MOBILE_LAYOUT.touchTarget,
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
    justifyContent: "center",
    minHeight: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 12,
  },
  triggerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
});
