import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { cn } from "cn";
import { type ComponentRef, type ReactNode, type Ref, useState } from "react";
import {
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import type { NativeTextInputRef } from "../../lib/native-host-refs";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { InputWrapper } from "./InputWrapper";

export type TextInputVariant = "default" | "sheet";

export type TextInputProps = Omit<RNTextInputProps, "style"> & {
  className?: string;
  description?: string;
  error?: boolean;
  errorMessage?: string;
  label?: string;
  leftSection?: ReactNode;
  ref?: Ref<NativeTextInputRef>;
  rightSection?: ReactNode;
  statusMessage?: string;
  style?: RNTextInputProps["style"];
  /**
   * `sheet` uses Gorhom `BottomSheetTextInput` for keyboard avoidance.
   * Use only inside `ui/Sheet`.
   */
  variant?: TextInputVariant;
  wrapperStyle?: ViewStyle;
};

export function TextInput({
  className,
  description,
  error = false,
  errorMessage,
  label,
  leftSection,
  onBlur,
  onFocus,
  ref,
  rightSection,
  statusMessage,
  style,
  variant = "default",
  wrapperStyle,
  ...inputRest
}: TextInputProps) {
  const colors = useMobileThemeColors();
  const [isFocused, setIsFocused] = useState(false);
  const hasError = error === true || Boolean(errorMessage);
  const borderColor = hasError ? colors.dangerAccent : isFocused ? colors.primary : colors.border;
  const isSheet = variant === "sheet";

  const inputClassName = cn("min-h-touch text-input flex-1", className);
  const inputStyle = [{ color: colors.textPrimary }, style];

  const handleFocus = (event: Parameters<NonNullable<RNTextInputProps["onFocus"]>>[0]) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: Parameters<NonNullable<RNTextInputProps["onBlur"]>>[0]) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  const nativeFieldProps = {
    ...inputRest,
    className: inputClassName,
    cursorColorClassName: "accent-[#a34bcb]",
    placeholderTextColorClassName: "accent-gray-400 dark:accent-gray-500",
    selectionColorClassName: "accent-[#a34bcb]",
    style: inputStyle,
    underlineColorAndroidClassName: "accent-transparent",
  };

  return (
    <InputWrapper
      description={description}
      errorMessage={errorMessage}
      label={label}
      statusMessage={statusMessage}
    >
      <View
        className={cn(
          "min-h-touch rounded-control w-full flex-row items-center border px-3",
          (leftSection || rightSection) && "gap-2",
        )}
        style={[
          {
            backgroundColor: colors.inputBackground,
            borderColor,
          },
          wrapperStyle,
          hasError || isFocused ? { borderColor } : undefined,
        ]}
      >
        {leftSection ? <View className="shrink-0">{leftSection}</View> : null}
        {isSheet ? (
          <BottomSheetTextInput
            {...nativeFieldProps}
            onBlur={handleBlur}
            onFocus={handleFocus}
            ref={ref as Ref<ComponentRef<typeof BottomSheetTextInput>>}
          />
        ) : (
          <RNTextInput
            {...nativeFieldProps}
            onBlur={handleBlur}
            onFocus={handleFocus}
            ref={ref as Ref<ComponentRef<typeof RNTextInput>>}
          />
        )}
        {rightSection ? <View className="shrink-0">{rightSection}</View> : null}
      </View>
    </InputWrapper>
  );
}
