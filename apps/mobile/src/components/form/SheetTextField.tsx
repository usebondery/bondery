import type { ReactNode, Ref } from "react";
import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form";
import type { ViewStyle } from "react-native";
import type { NativeTextInputRef } from "../../lib/native-host-refs";
import { TextInput, type TextInputProps } from "../ui/TextInput";

type SheetTextFieldLegacyProps = {
  /** @deprecated Use `leftSection`. */
  leadingIcon?: ReactNode;
  /** @deprecated Use `rightSection`. */
  trailingAccessory?: ReactNode;
  /** @deprecated Use `wrapperStyle`. */
  containerStyle?: ViewStyle;
};

type SheetTextFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  showErrorWhenTouched?: boolean;
  inputRef?: Ref<NativeTextInputRef>;
  onFieldChange?: (value: string) => void;
  onFieldBlur?: (value: string) => void;
  externalErrorMessage?: string;
} & Omit<
  TextInputProps,
  "value" | "onChangeText" | "onBlur" | "error" | "errorMessage" | "variant"
> &
  SheetTextFieldLegacyProps;

export function SheetTextField<TFieldValues extends FieldValues>({
  control,
  name,
  showErrorWhenTouched = true,
  inputRef,
  onFieldChange,
  onFieldBlur,
  externalErrorMessage,
  leadingIcon,
  trailingAccessory,
  containerStyle,
  leftSection,
  rightSection,
  wrapperStyle,
  ...inputProps
}: SheetTextFieldProps<TFieldValues>) {
  const resolvedLeftSection = leftSection ?? leadingIcon;
  const resolvedRightSection = rightSection ?? trailingAccessory;
  const resolvedWrapperStyle = wrapperStyle ?? containerStyle;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const showError = showErrorWhenTouched
          ? fieldState.invalid && fieldState.isTouched
          : fieldState.invalid;
        const resolvedError =
          externalErrorMessage || (showError ? fieldState.error?.message : undefined);
        return (
          <TextInput
            {...inputProps}
            error={showError || Boolean(externalErrorMessage)}
            errorMessage={resolvedError}
            leftSection={resolvedLeftSection}
            onBlur={() => {
              field.onBlur();
              onFieldBlur?.((field.value ?? "") as string);
            }}
            onChangeText={(value) => {
              field.onChange(value);
              onFieldChange?.(value);
            }}
            ref={(node) => {
              field.ref(node);
              if (!inputRef) {
                return;
              }
              if (typeof inputRef === "function") {
                inputRef(node);
                return;
              }
              inputRef.current = node;
            }}
            rightSection={resolvedRightSection}
            value={(field.value ?? "") as string}
            variant="sheet"
            wrapperStyle={resolvedWrapperStyle}
          />
        );
      }}
    />
  );
}
