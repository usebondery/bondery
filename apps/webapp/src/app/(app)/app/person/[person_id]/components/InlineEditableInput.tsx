import { Loader, Text, TextInput, type TextInputProps } from "@mantine/core";

interface InlineEditableInputProps extends Omit<
  TextInputProps,
  "value" | "onChange" | "onFocus" | "onBlur" | "rightSection" | "disabled"
> {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  isSaving?: boolean;
  isFocused?: boolean;
  showCounter?: boolean;
}

export function InlineEditableInput({
  value,
  onChange,
  onFocus,
  onBlur,
  isSaving = false,
  isFocused = false,
  showCounter = false,
  maxLength,
  disabled,
  ...textInputProps
}: InlineEditableInputProps) {
  const shouldShowCounter =
    showCounter && isFocused && typeof maxLength === "number" && Number.isFinite(maxLength);

  return (
    <TextInput
      {...textInputProps}
      value={value}
      maxLength={maxLength}
      onChange={(event) => onChange(event.currentTarget.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      rightSection={
        isSaving ? (
          <Loader size="xs" mr={"sm"} />
        ) : shouldShowCounter ? (
          <Text size="xs" c="dimmed" mr={"sm"}>
            {value.length}/{maxLength}
          </Text>
        ) : null
      }
      disabled={Boolean(disabled) || isSaving}
    />
  );
}
