import { useEffect, useRef } from "react";
import { StyleSheet, TextInput, type StyleProp, type TextInputProps, type TextStyle } from "react-native";
import { IMaskTextInput } from "react-native-imask";
import { getTelephoneReactMaskExpression } from "@bondery/helpers/phone";
import { UI_TIMING_MS } from "../../../lib/config";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface MaskedPhoneInputProps {
  prefix: string;
  value: string;
  onChangeValue: (unmaskedValue: string) => void;
  placeholder?: string;
  editable?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  containerStyle?: StyleProp<TextStyle>;
  returnKeyType?: TextInputProps["returnKeyType"];
  enterKeyHint?: TextInputProps["enterKeyHint"];
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  onInputRef?: (input: TextInput | null) => void;
}

export function MaskedPhoneInput({
  prefix,
  value,
  onChangeValue,
  placeholder,
  editable = true,
  error = false,
  autoFocus = false,
  containerStyle,
  returnKeyType,
  enterKeyHint,
  onSubmitEditing,
  onInputRef,
}: MaskedPhoneInputProps) {
  const colors = useMobileThemeColors();
  const inputRef = useRef<TextInput | null>(null);
  const mask = getTelephoneReactMaskExpression(prefix || "+1");

  useEffect(() => {
    if (!autoFocus) return;

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);

    return () => clearTimeout(timer);
  }, [autoFocus]);

  return (
    <IMaskTextInput
      key={prefix}
      inputRef={(maskedRef) => {
        const node = maskedRef?.input ?? null;
        inputRef.current = node;
        onInputRef?.(node);
      }}
      mask={mask}
      unmask
      value={value}
      onAccept={(unmaskedValue: string) => onChangeValue(unmaskedValue)}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType="phone-pad"
      editable={editable}
      returnKeyType={returnKeyType}
      enterKeyHint={enterKeyHint}
      onSubmitEditing={onSubmitEditing}
      style={[
        styles.input,
        {
          borderColor: error ? colors.dangerAccent : colors.border,
          backgroundColor: colors.inputBackground,
          color: colors.textPrimary,
        },
        containerStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    minHeight: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 12,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
  },
});
