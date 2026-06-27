import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { EMOJI_PICKER_LAYOUT } from "../emoji-picker/constants";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ColorPickerSheet } from "./ColorPickerSheet";
import { getContrastBorderColor, isValidHex, normalizeHex } from "./colorUtils";
import type { ShowAppToastInput } from "../../lib/toast/useAppToast";

export interface ColorPickerInputProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  compact?: boolean;
  /** Fills available width in a flex row. */
  stretch?: boolean;
  accessibilityLabel?: string;
  triggerStyle?: StyleProp<ViewStyle>;
  showToast: (options: ShowAppToastInput) => void;
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
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const [open, setOpen] = useState(false);

  const normalizedValue = normalizeHex(value);
  const hasValue = isValidHex(value);
  const resolvedAccessibilityLabel =
    accessibilityLabel ?? label ?? t("MobileApp.Groups.EditColorLabel");
  const resolvedPlaceholder = placeholder ?? t("MobileApp.Groups.EditColorLabel");

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
      <Text style={[styles.placeholder, { color: colors.textSecondary }]} numberOfLines={1}>
        {resolvedPlaceholder}
      </Text>
    );
  }, [colors.textSecondary, compact, hasValue, normalizedValue, resolvedPlaceholder, triggerBorderColor]);

  return (
    <>
      <View style={[stretch ? styles.stretchRoot : compact ? styles.compactRoot : styles.root]}>
        {label ? (
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={resolvedAccessibilityLabel}
          accessibilityHint={t("MobileApp.ColorPicker.TriggerAccessibilityHint")}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.trigger,
            compact && !stretch ? styles.squareTrigger : null,
            compact && stretch ? styles.compactTrigger : null,
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
        </Pressable>

        {error ? <Text style={[styles.error, { color: colors.dangerText }]}>{error}</Text> : null}
      </View>

      {open && !disabled ? (
        <ColorPickerSheet
          open
          value={hasValue ? normalizedValue : ""}
          onOpenChange={setOpen}
          onSelect={onChange}
          showToast={showToast}
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
    justifyContent: "center",
    gap: MOBILE_LAYOUT.spacing.contentTop / 2,
  },
  squareTrigger: {
    width: MOBILE_LAYOUT.touchTarget,
    height: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 0,
  },
  compactTrigger: {
    width: EMOJI_PICKER_LAYOUT.compactTriggerWidth,
    paddingHorizontal: 8,
  },
  stretchTrigger: {
    width: "100%",
  },
  triggerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
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
