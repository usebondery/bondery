import {
  Controller,
  useWatch,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import type { StyleProp, TextInput, TextStyle } from "react-native";
import { MaskedPhoneInput } from "../../features/contacts/components/MaskedPhoneInput";

type SheetPhoneFieldProps<
  TFieldValues extends FieldValues,
  TValue extends FieldPath<TFieldValues>,
  TPrefix extends FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>;
  name: TValue;
  prefixName: TPrefix;
  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  containerStyle?: StyleProp<TextStyle>;
};

export function SheetPhoneField<
  TFieldValues extends FieldValues,
  TValue extends FieldPath<TFieldValues>,
  TPrefix extends FieldPath<TFieldValues>,
>({
  control,
  name,
  prefixName,
  placeholder,
  editable,
  autoFocus,
  onSubmitEditing,
  containerStyle,
}: SheetPhoneFieldProps<TFieldValues, TValue, TPrefix>) {
  const prefix = useWatch({ control, name: prefixName }) as string;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <MaskedPhoneInput
          prefix={prefix}
          value={(field.value ?? "") as string}
          onChangeValue={field.onChange}
          placeholder={placeholder}
          editable={editable}
          autoFocus={autoFocus}
          error={fieldState.invalid}
          onSubmitEditing={onSubmitEditing}
          containerStyle={containerStyle}
          onInputRef={field.ref}
        />
      )}
    />
  );
}
