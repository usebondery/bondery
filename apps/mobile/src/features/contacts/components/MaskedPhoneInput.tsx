import { getTelephoneReactMaskExpression } from "@bondery/helpers/phone";
import { useEffect, useRef } from "react";
import {
  type StyleProp,
  StyleSheet,
  type TextInput,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { IMaskTextInput } from "react-native-imask";
import { UI_TIMING_MS } from "../../../lib/config";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface MaskedPhoneInputProps {
  autoFocus?: boolean;
  containerStyle?: StyleProp<TextStyle>;
  editable?: boolean;
  enterKeyHint?: TextInputProps["enterKeyHint"];
  error?: boolean;
  onChangeValue: (unmaskedValue: string) => void;
  onInputRef?: (input: TextInput | null) => void;
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  placeholder?: string;
  prefix: string;
  returnKeyType?: TextInputProps["returnKeyType"];
  value: string;
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
    if (!autoFocus) {
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);

    return () => clearTimeout(timer);
  }, [autoFocus]);

  return (
    <IMaskTextInput
      editable={editable}
      enterKeyHint={enterKeyHint}
      inputRef={(maskedRef) => {
        const node = maskedRef?.input ?? null;
        inputRef.current = node;
        onInputRef?.(node);
      }}
      key={prefix}
      keyboardType="phone-pad"
      mask={mask}
      onAccept={(unmaskedValue: string) => onChangeValue(unmaskedValue)}
      onSubmitEditing={onSubmitEditing}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      returnKeyType={returnKeyType}
      style={[
        styles.input,
        {
          backgroundColor: colors.inputBackground,
          borderColor: error ? colors.dangerAccent : colors.border,
          color: colors.textPrimary,
        },
        containerStyle,
      ]}
      unmask
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    minHeight: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 12,
  },
});
