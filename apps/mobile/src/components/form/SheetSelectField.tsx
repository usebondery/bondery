import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form";
import type { StyleProp, ViewStyle } from "react-native";
import {
  SettingsSelect,
  type SettingsSelectOption,
} from "../../features/settings/components/SettingsSelect";

type SheetSelectFieldProps<TFieldValues extends FieldValues, TValue extends string> = {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  options: Array<SettingsSelectOption<TValue>>;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptySearchLabel?: string;
  accessibilityLabel?: string;
  triggerStyle?: StyleProp<ViewStyle>;
};

export function SheetSelectField<TFieldValues extends FieldValues, TValue extends string>({
  control,
  name,
  ...props
}: SheetSelectFieldProps<TFieldValues, TValue>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <SettingsSelect
          {...props}
          onValueChange={(value) => {
            field.onChange(value);
          }}
          value={field.value as TValue}
        />
      )}
    />
  );
}
