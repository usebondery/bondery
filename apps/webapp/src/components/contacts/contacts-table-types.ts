import type { Contact } from "@bondery/schemas";
import type { ReactNode } from "react";
import type { ColumnKey } from "@/lib/contacts/table-types";

export type { ColumnKey, SortOrder } from "@/lib/contacts/table-types";

export type ContactTableRow = Contact & { _rowKey?: string; _addressType?: string };

export interface ColumnConfig {
  fixed?: boolean;
  hideHeader?: boolean;
  icon?: ReactNode;
  key: ColumnKey;
  label: string;
  visible: boolean;
}

export interface MenuAction {
  color?: string;
  disabled?: (contact: Contact) => boolean;
  disabledTooltip?: string;
  icon: ReactNode;
  key: string;
  label: string;
  onClick: (contactId: string) => void;
}

export interface BulkSelectionAction {
  color?: string;
  disabled?: boolean;
  disabledTooltip?: string;
  icon: ReactNode;
  key: string;
  label: string;
  loading?: boolean;
  onClick: (selectedIds: Set<string>) => void;
  variant?: "filled" | "light" | "outline" | "subtle" | "default";
}

export interface StandardContactActions {
  addToGroupsBulkLabel?: string;
  addToGroupsMenuLabel?: string;
  deleteBulkLabel?: string;
  deleteDisabledTooltip?: string;
  deleteMenuLabel?: string;
  isDeleteSelectedLoading?: boolean;
  mergeBulkLabel?: string;
  mergeDisabledTooltip?: string;
  mergeMenuLabel?: string;
  onAddToGroupsOne?: (contactId: string) => void;
  onAddToGroupsSelected?: (contactIds: string[]) => void;
  onDeleteOne?: (contactId: string) => void;
  onDeleteSelected?: (contactIds: string[]) => void;
  onMergeOne?: (contactId: string) => void;
  onMergeSelected?: (leftContactId: string, rightContactId: string) => void;
}

export interface LoadMoreAction {
  label: string;
  loading?: boolean;
  onClick: () => void;
}

export interface ContactsTableV2Props {
  allSelected?: boolean;
  bulkSelectionActions?: BulkSelectionAction[];
  columnsForMenu?: ColumnConfig[];
  contacts: Contact[];
  dateLocale?: string;
  disableNameLink?: boolean;
  excludedIds?: Set<string>;
  hasMore?: boolean;
  headerStickyTop?: number;
  isAllTotalSelected?: boolean;
  isHeaderShown?: boolean;
  loadMoreAction?: LoadMoreAction;
  menuActions?: MenuAction[];
  noContactsFound: string;
  noContactsMatchSearch: string;
  nonSelectableIds?: Set<string>;
  nonSelectableTooltip?: string;
  onSearchChange?: (value: string) => void;
  onSelectAll?: () => void;
  onSelectAllTotal?: () => void;
  onSelectOne?: (id: string, options?: { shiftKey?: boolean; index?: number }) => void;
  renderLocationCell?: (contact: Contact) => ReactNode;
  searchDefaultValue?: string;
  searchLoading?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  selectedIds?: Set<string>;
  setColumnsForMenu?: React.Dispatch<React.SetStateAction<ColumnConfig[]>>;
  setSortOrderForMenu?: (order: import("@/lib/contacts/table-types").SortOrder) => void;
  showSelection?: boolean;
  someSelected?: boolean;
  sortOrderForMenu?: import("@/lib/contacts/table-types").SortOrder;
  standardActions?: StandardContactActions;
  totalCount?: number;
  visibleColumns: ColumnKey[] | ColumnConfig[];
}
