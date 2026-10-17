import { useMemo, useState } from "react";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import {
  useMobileColorPickerTranslations,
  useMobileGroupsTranslations,
} from "../../lib/i18n/generated/hooks";
import { MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { EMOJI_PICKER_LAYOUT } from "../emoji-picker/constants";
import { ActionButtonShellPressable } from "../ui/ActionButtonShellPressable";
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

  const layout = stretch ? "stretch" : "square";

  return (
    <>
      <View style={[stretch ? styles.stretchRoot : compact ? styles.compactRoot : styles.root]}>
        {label ? (
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        ) : null}

        <ActionButtonShellPressable
          accessibilityHint={tMobileColorPicker("TriggerAccessibilityHint")}
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

      <ColorPickerSheet
        onOpenChange={setOpen}
        onSelect={onChange}
        open={open && !disabled}
        value={hasValue ? normalizedValue : ""}
      />
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
  stretchRoot: {
    flex: 1,
    minWidth: 0,
  },
});
