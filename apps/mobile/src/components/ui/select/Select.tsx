import { useState } from "react";
import { UI_TIMING_MS } from "../../../lib/config";
import { filterSelectData } from "../filterSelectData";
import { InputWrapper } from "../InputWrapper";
import type { SheetAction } from "../Sheet";
import { resolveOptionLeftSection } from "./resolveOptionLeftSection";
import { resolveSelectSearchable } from "./resolveSearchable";
import { SelectOptionRow } from "./SelectOptionRow";
import { SelectSheet } from "./SelectSheet";
import { SelectTrigger } from "./SelectTrigger";
import { shouldShowSelectClear } from "./selectTriggerUtils";
import type { SelectDataItem, SelectProps } from "./types";

export function Select<TValue extends string>(props: SelectProps<TValue>) {
  const {
    accessibilityHint,
    accessibilityLabel,
    className,
    clearable,
    data,
    description,
    disabled = false,
    emptySearchLabel,
    errorMessage,
    label,
    leadingIcon,
    onOpenChange,
    placeholder,
    searchable: searchableProp,
    searchPlaceholder,
    sheetActions,
    sheetEmptyState,
    sheetListHeader,
    showField = true,
    statusMessage,
    triggerStyle,
    triggerVariant = "input",
  } = props;

  const clearAccessibilityLabel =
    "clearAccessibilityLabel" in props ? props.clearAccessibilityLabel : undefined;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const searchable = resolveSelectSearchable(searchableProp, data.length);
  const filteredData = filterSelectData(data, query);

  const selectedOption = data.find((option) => option.value === props.value);
  const showValueStyle = clearable ? props.value !== null : Boolean(selectedOption);
  const triggerLabel = selectedOption?.label ?? placeholder ?? label;

  const triggerLeading =
    leadingIcon ?? (selectedOption ? resolveOptionLeftSection(selectedOption) : null);

  const openSheet = () => {
    if (disabled) {
      return;
    }

    setIsOpen(true);
    onOpenChange?.(true);
  };

  const closeSheet = () => {
    setIsOpen(false);
    setQuery("");
    onOpenChange?.(false);
  };

  const handleChange = (next: TValue) => {
    props.onChange(next);
    closeSheet();
  };

  const handleClear = () => {
    if (!clearable) {
      return;
    }

    (props as { onChange: (value: TValue | null) => void }).onChange(null);
  };

  const showClear = shouldShowSelectClear(Boolean(clearable), showValueStyle, disabled);

  const runAfterSheetClosed = (action: () => void) => {
    closeSheet();
    setTimeout(action, UI_TIMING_MS.sheetStackOpenDelay);
  };

  const resolvedSheetActions = sheetActions
    ? ((sheetActions.length === 1
        ? [
            {
              ...sheetActions[0],
              onPress: () => {
                runAfterSheetClosed(sheetActions[0].onPress);
              },
            },
          ]
        : [
            {
              ...sheetActions[0],
              onPress: () => {
                runAfterSheetClosed(sheetActions[0].onPress);
              },
            },
            {
              ...sheetActions[1],
              onPress: () => {
                runAfterSheetClosed(sheetActions[1].onPress);
              },
            },
          ]) as [SheetAction] | [SheetAction, SheetAction])
    : undefined;

  const resolvedListHeader =
    typeof sheetListHeader === "function"
      ? sheetListHeader({ close: closeSheet })
      : sheetListHeader;

  return (
    <>
      <InputWrapper
        description={description}
        errorMessage={errorMessage}
        label={showField ? label : undefined}
        statusMessage={statusMessage}
      >
        <SelectTrigger
          accessibilityHint={accessibilityHint}
          accessibilityLabel={accessibilityLabel ?? label}
          className={className}
          clearAccessibilityLabel={clearAccessibilityLabel}
          disabled={disabled}
          displayLabel={triggerLabel}
          leadingVisual={triggerLeading}
          onClear={handleClear}
          onPress={openSheet}
          rightSection={selectedOption?.rightSection}
          showClear={showClear}
          showValueStyle={showValueStyle}
          triggerStyle={triggerStyle}
          triggerVariant={triggerVariant}
        />
      </InputWrapper>

      <SelectSheet
        actions={resolvedSheetActions}
        data={filteredData}
        emptyLabel={emptySearchLabel}
        emptyState={sheetEmptyState}
        keyExtractor={(item) => item.value}
        listHeaderComponent={resolvedListHeader}
        onClose={closeSheet}
        onQueryChange={setQuery}
        opened={isOpen}
        query={query}
        renderItem={({ item }) => (
          <SelectOptionRow
            isSelected={item.value === props.value}
            onPress={() => {
              if (!item.disabled) {
                handleChange(item.value);
              }
            }}
            option={item as SelectDataItem<TValue>}
          />
        )}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder ?? label}
        title={label}
      />
    </>
  );
}
