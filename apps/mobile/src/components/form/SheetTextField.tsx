import type { Ref } from "react";
import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form";
import type { TextInput } from "react-native";
import { MobileTextInput, type MobileTextInputProps } from "../MobileTextInput";

type SheetTextFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  showErrorWhenTouched?: boolean;
  inputRef?: Ref<TextInput>;
  onFieldChange?: (value: string) => void;
  onFieldBlur?: (value: string) => void;
  externalErrorMessage?: string;
} & Omit<MobileTextInputProps, "value" | "onChangeText" | "onBlur" | "error" | "errorMessage">;

export function SheetTextField<TFieldValues extends FieldValues>({
  control,
  name,
  showErrorWhenTouched = true,
  inputRef,
  onFieldChange,
  onFieldBlur,
  externalErrorMessage,
  ...inputProps
}: SheetTextFieldProps<TFieldValues>) {
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
          <MobileTextInput
            {...inputProps}
            error={showError || Boolean(externalErrorMessage)}
            errorMessage={resolvedError}
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
            value={(field.value ?? "") as string}
          />
        );
      }}
    />
  );
}
