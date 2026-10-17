import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form";
import type { StyleProp, ViewStyle } from "react-native";
import { Select, type SelectItem, type SelectSearchable } from "../ui/Select";

type SheetSelectFieldProps<TFieldValues extends FieldValues, TValue extends string> = {
  accessibilityLabel?: string;
  clearable?: boolean;
  control: Control<TFieldValues>;
  description?: string;
  emptySearchLabel?: string;
  label: string;
  name: FieldPath<TFieldValues>;
  options: Array<SelectItem<TValue>>;
  placeholder?: string;
  searchable?: SelectSearchable;
  searchPlaceholder?: string;
  triggerStyle?: StyleProp<ViewStyle>;
};

export function SheetSelectField<TFieldValues extends FieldValues, TValue extends string>({
  clearable,
  control,
  description,
  name,
  options,
  ...props
}: SheetSelectFieldProps<TFieldValues, TValue>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) =>
        clearable ? (
          <Select
            {...props}
            clearable
            data={options}
            description={description}
            onChange={(value: TValue | null) => {
              field.onChange(value);
            }}
            showField={description !== undefined}
            value={(field.value as TValue | null) ?? null}
          />
        ) : (
          <Select
            {...props}
            data={options}
            description={description}
            onChange={(value: TValue) => {
              field.onChange(value);
            }}
            showField={description !== undefined}
            value={field.value as TValue}
          />
        )
      }
    />
  );
}
