import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { SheetAction } from "../Sheet";

export type SelectLeftSection =
  | { type: "icon"; icon: ReactNode }
  | { type: "emoji"; emoji: string }
  | { type: "emojiBadge"; emoji: string; backgroundColor: string };

export type SelectDataItem<TValue extends string = string> = {
  disabled?: boolean;
  label: string;
  /** @deprecated Use `leftSection` with `{ type: "icon", icon }`. */
  icon?: ReactNode;
  leftSection?: SelectLeftSection | ReactNode;
  rightSection?: ReactNode;
  /** Extra haystack for search; `searchKeywords` is a legacy alias. */
  searchText?: string;
  searchKeywords?: string;
  value: TValue;
};

/** @deprecated Use `SelectDataItem`. */
export type SelectItem<TValue extends string = string> = SelectDataItem<TValue>;

export type SelectTriggerVariant = "input" | "filter";

export type SelectSearchable = boolean | "auto";

export type SelectSheetSnapPoint = "selectSimple" | "selectSearch";

export type SelectOptionMode = "single" | "multiple";

export type SelectSheetListProps<TItem> = {
  data: TItem[];
  emptyLabel?: string;
  keyExtractor: (item: TItem) => string;
  listEmptyComponent?: ReactNode;
  listHeaderComponent?: ReactNode;
  renderItem: (item: TItem) => ReactNode;
};

export type SelectSheetProps<TItem> = {
  actions?: [SheetAction] | [SheetAction, SheetAction];
  emptyState?: ReactNode;
  list: SelectSheetListProps<TItem>;
  onClose: () => void;
  opened: boolean;
  searchPlaceholder?: string;
  searchable: boolean;
  snapPoint?: SelectSheetSnapPoint;
  title: string;
};

export type SelectBaseProps<TValue extends string> = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  className?: string;
  data: Array<SelectDataItem<TValue>>;
  description?: string;
  disabled?: boolean;
  emptySearchLabel?: string;
  errorMessage?: string;
  label: string;
  leadingIcon?: ReactNode;
  onOpenChange?: (opened: boolean) => void;
  placeholder?: string;
  searchable?: SelectSearchable;
  searchPlaceholder?: string;
  sheetActions?: [SheetAction] | [SheetAction, SheetAction];
  sheetListHeader?: ReactNode | ((api: { close: () => void }) => ReactNode);
  sheetEmptyState?: ReactNode;
  showField?: boolean;
  statusMessage?: string;
  triggerStyle?: StyleProp<ViewStyle>;
  triggerVariant?: SelectTriggerVariant;
};

export type SelectPropsClearable<TValue extends string> = SelectBaseProps<TValue> & {
  clearable: true;
  clearAccessibilityLabel?: string;
  onChange: (value: TValue | null) => void;
  value: TValue | null;
};

export type SelectPropsRequired<TValue extends string> = SelectBaseProps<TValue> & {
  clearable?: false;
  onChange: (value: TValue) => void;
  value: TValue;
};

export type SelectProps<TValue extends string> =
  | SelectPropsClearable<TValue>
  | SelectPropsRequired<TValue>;
