import { useEffect, useState } from "react";
import { View } from "react-native";
import { MOBILE_LAYOUT } from "../../../theme/tokens";
import { BottomSheetFlatList, Sheet, type SheetAction } from "../Sheet";
import { Text } from "../Text";
import type { SelectSheetSnapPoint } from "./types";

export type SelectSheetProps<TItem> = {
  actions?: [SheetAction] | [SheetAction, SheetAction];
  data: TItem[];
  emptyLabel?: string;
  emptyState?: React.ReactNode;
  keyExtractor: (item: TItem) => string;
  listEmptyComponent?: React.ReactNode;
  listHeaderComponent?: React.ReactNode;
  isBusy?: boolean;
  onClose: () => void;
  onQueryChange?: (query: string) => void;
  opened: boolean;
  query?: string;
  renderItem: (info: { item: TItem }) => React.ReactNode;
  searchEditable?: boolean;
  searchPlaceholder?: string;
  searchable: boolean;
  snapPoint?: SelectSheetSnapPoint;
  subtitle?: string;
  title: string;
};

export function SelectSheet<TItem>({
  actions,
  data,
  emptyLabel,
  emptyState,
  keyExtractor,
  listEmptyComponent,
  isBusy,
  listHeaderComponent,
  onClose,
  onQueryChange,
  opened,
  query: controlledQuery,
  renderItem,
  searchEditable = true,
  searchPlaceholder,
  searchable,
  snapPoint,
  subtitle,
  title,
}: SelectSheetProps<TItem>) {
  const [internalQuery, setInternalQuery] = useState("");
  const query = controlledQuery ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;

  useEffect(() => {
    if (!opened) {
      setInternalQuery("");
    }
  }, [opened]);

  const resolvedSnap = snapPoint ?? (searchable ? "selectSearch" : "selectSimple");

  if (emptyState && data.length === 0) {
    return (
      <Sheet
        actions={actions}
        isBusy={isBusy}
        onClose={onClose}
        opened={opened}
        snapPoint={resolvedSnap}
        subtitle={subtitle}
        title={title}
      >
        {emptyState}
      </Sheet>
    );
  }

  return (
    <Sheet
      actions={actions}
      isBusy={isBusy}
      onClose={onClose}
      opened={opened}
      search={
        searchable
          ? {
              editable: searchEditable,
              onQueryChange: setQuery,
              placeholder: searchPlaceholder ?? title,
              query,
            }
          : undefined
      }
      snapPoint={resolvedSnap}
      subtitle={subtitle}
      title={title}
    >
      <BottomSheetFlatList
        contentContainerStyle={{ paddingBottom: 24 }}
        data={data}
        enableFooterMarginAdjustment
        initialNumToRender={24}
        keyboardShouldPersistTaps="handled"
        keyExtractor={keyExtractor}
        ListEmptyComponent={() =>
          listEmptyComponent ?? (
            <Text c="secondary" className="px-1 py-5">
              {emptyLabel ?? "No results"}
            </Text>
          )
        }
        ListHeaderComponent={listHeaderComponent ? <View>{listHeaderComponent}</View> : undefined}
        maxToRenderPerBatch={24}
        renderItem={({ item }) => renderItem({ item })}
        style={{ flex: 1, marginHorizontal: -MOBILE_LAYOUT.spacing.horizontal }}
        windowSize={8}
      />
    </Sheet>
  );
}
