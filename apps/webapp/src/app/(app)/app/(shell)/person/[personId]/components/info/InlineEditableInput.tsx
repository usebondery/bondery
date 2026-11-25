import { Loader, Text, TextInput, type TextInputProps } from "@mantine/core";

interface InlineEditableInputProps
  extends Omit<
    TextInputProps,
    "value" | "onChange" | "onFocus" | "onBlur" | "rightSection" | "disabled"
  > {
  disabled?: boolean;
  isFocused?: boolean;
  isSaving?: boolean;
  onBlur?: () => void;
  onChange: (value: string) => void;
  onFocus?: () => void;
  showCounter?: boolean;
  value: string;
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

  const resolveValue = () => {
    if (isSaving) {
      return <Loader mr="sm" size="xs" />;
    }
    if (shouldShowCounter) {
      return (
        <Text c="dimmed" mr="sm" size="xs">
          {value.length}/{maxLength}
        </Text>
      );
    }
    return null;
  };
  return (
    <TextInput
      {...textInputProps}
      disabled={Boolean(disabled) || isSaving}
      maxLength={maxLength}
      onBlur={onBlur}
      onChange={(event) => onChange(event.currentTarget.value)}
      onFocus={onFocus}
      rightSection={resolveValue()}
      value={value}
    />
  );
}
