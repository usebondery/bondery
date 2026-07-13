import { IconCheck, IconChevronDown } from "@tabler/icons-react-native";
import { Select } from "@tamagui/select";
import { Sheet } from "@tamagui/sheet";
import { XStack } from "@tamagui/stacks";
import { type ReactNode, useMemo, useState } from "react";
import {
  FlatList,
  type ListRenderItemInfo,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { SearchActionSheet } from "../../../components/SearchActionSheet";
import { SHEET_SNAP_POINTS } from "../../../lib/config";
import { TAMAGUI_TRANSITION } from "../../../theme/animations";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

export type SettingsSelectOption<TValue extends string> = {
  value: TValue;
  label: string;
  icon?: ReactNode;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
  searchKeywords?: string;
};

interface SettingsSelectProps<TValue extends string> {
  /** Overrides `label` for screen readers when the visible label differs. */
  accessibilityLabel?: string;
  emptySearchLabel?: string;
  label: string;
  /** Always shown in the trigger before the selected value. */
  leadingIcon?: ReactNode;
  onValueChange: (value: TValue) => void;
  options: Array<SettingsSelectOption<TValue>>;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  triggerStyle?: StyleProp<ViewStyle>;
  value: TValue;
}

function getOptionLeadingVisual<TValue extends string>(
  option: SettingsSelectOption<TValue>,
): ReactNode {
  return option.icon ?? option.leftSection;
}

function filterOptions<TValue extends string>(
  options: Array<SettingsSelectOption<TValue>>,
  query: string,
): Array<SettingsSelectOption<TValue>> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => {
    const haystack = `${option.label} ${option.value} ${option.searchKeywords ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

function SettingsSelectOptionRow<TValue extends string>({
  option,
  isSelected,
  textColor,
  borderColor,
  backgroundColor,
  pressedBackgroundColor,
  onPress,
}: {
  option: SettingsSelectOption<TValue>;
  isSelected: boolean;
  textColor: string;
  borderColor: string;
  backgroundColor: string;
  pressedBackgroundColor: string;
  onPress: () => void;
}) {
  const leadingVisual = getOptionLeadingVisual(option);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        {
          backgroundColor: pressed ? pressedBackgroundColor : backgroundColor,
          borderBottomColor: borderColor,
        },
      ]}
    >
      {leadingVisual ? <View style={styles.leftSectionSlot}>{leadingVisual}</View> : null}

      <Text numberOfLines={2} style={[styles.optionLabel, { color: textColor }]}>
        {option.label}
      </Text>

      {option.rightSection ? (
        <View style={styles.rightSectionSlot}>{option.rightSection}</View>
      ) : null}

      {isSelected ? <IconCheck color={textColor} size={14} /> : <View style={styles.checkSpacer} />}
    </Pressable>
  );
}

function SettingsSelectTriggerContent<TValue extends string>({
  selectedOption,
  placeholder,
  label,
  textColor,
  leadingIcon,
}: {
  selectedOption?: SettingsSelectOption<TValue>;
  placeholder?: string;
  label: string;
  textColor: string;
  leadingIcon?: ReactNode;
}) {
  const leadingVisual =
    leadingIcon ?? (selectedOption ? getOptionLeadingVisual(selectedOption) : null);

  return (
    <>
      {leadingVisual ? <View style={styles.leftSectionSlot}>{leadingVisual}</View> : null}
      <Text numberOfLines={1} style={[styles.triggerLabel, { color: textColor }]}>
        {selectedOption?.label ?? placeholder ?? label}
      </Text>
      {selectedOption?.rightSection ? (
        <View style={styles.rightSectionSlot}>{selectedOption.rightSection}</View>
      ) : null}
    </>
  );
}

/**
 * Tamagui Select wrapper with optional search and left/right option sections.
 */
export function SettingsSelect<TValue extends string>({
  label,
  value,
  placeholder,
  options,
  onValueChange,
  searchable = false,
  searchPlaceholder,
  emptySearchLabel = "No results",
  accessibilityLabel,
  leadingIcon,
  triggerStyle,
}: SettingsSelectProps<TValue>) {
  const colors = useMobileThemeColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerAccessibilityLabel = accessibilityLabel ?? label;

  const optionLabelMap = useMemo(
    () =>
      options.reduce<Record<string, string>>((accumulator, option) => {
        accumulator[option.value] = option.label;
        return accumulator;
      }, {}),
    [options],
  );
  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => filterOptions(options, query), [options, query]);

  const triggerBackgroundColor = colors.inputBackground;
  const triggerBorderColor = colors.borderStrong;
  const triggerTextColor = colors.textPrimary;
  const iconColor = colors.iconSecondary;
  const optionBorderColor = colors.border;
  const optionHoverBackgroundColor = colors.surfaceMuted;
  const optionPressBackgroundColor = colors.surfacePressed;
  const optionBackgroundColor = colors.surface;
  const sheetOverlayColor = colors.overlay;
  const sheetFrameBackgroundColor = colors.surfaceElevated;
  const sheetHandleColor = colors.borderStrong;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  const handleSelect = (nextValue: TValue) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  if (searchable) {
    const renderItem = ({ item }: ListRenderItemInfo<SettingsSelectOption<TValue>>) => (
      <SettingsSelectOptionRow
        backgroundColor={optionBackgroundColor}
        borderColor={optionBorderColor}
        isSelected={item.value === value}
        onPress={() => handleSelect(item.value)}
        option={item}
        pressedBackgroundColor={optionPressBackgroundColor}
        textColor={triggerTextColor}
      />
    );

    return (
      <>
        <Pressable
          accessibilityLabel={triggerAccessibilityLabel}
          accessibilityRole="button"
          onPress={() => setOpen(true)}
          style={[
            styles.trigger,
            {
              backgroundColor: triggerBackgroundColor,
              borderColor: triggerBorderColor,
            },
            triggerStyle,
          ]}
        >
          <View style={styles.triggerContent}>
            <SettingsSelectTriggerContent
              label={label}
              leadingIcon={leadingIcon}
              placeholder={placeholder}
              selectedOption={selectedOption}
              textColor={triggerTextColor}
            />
          </View>
          <IconChevronDown color={iconColor} size={16} />
        </Pressable>

        <SearchActionSheet
          elevated
          onOpenChange={handleOpenChange}
          onQueryChange={setQuery}
          open={open}
          query={query}
          searchPlaceholder={searchPlaceholder ?? label}
        >
          <FlatList
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.listContent}
            data={filteredOptions}
            initialNumToRender={24}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.value}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {emptySearchLabel}
              </Text>
            }
            maxToRenderPerBatch={24}
            renderItem={renderItem}
            style={styles.searchList}
            windowSize={8}
          />
        </SearchActionSheet>
      </>
    );
  }

  return (
    <Select
      onValueChange={(nextValue) => onValueChange(nextValue as TValue)}
      renderValue={(selectedValue) => optionLabelMap[selectedValue] ?? placeholder ?? ""}
      value={value}
    >
      <Select.Trigger
        backgroundColor={triggerBackgroundColor}
        borderColor={triggerBorderColor}
        borderRadius={MOBILE_LAYOUT.borderRadius.control}
        borderWidth={1}
        focusStyle={{ backgroundColor: triggerBackgroundColor, borderColor: triggerBorderColor }}
        hoverStyle={{ backgroundColor: triggerBackgroundColor, borderColor: triggerBorderColor }}
        justifyContent="space-between"
        minHeight={MOBILE_LAYOUT.touchTarget}
        pressStyle={{
          backgroundColor: triggerBackgroundColor,
          borderColor: triggerBorderColor,
          transition: TAMAGUI_TRANSITION.quick,
        }}
        transition={TAMAGUI_TRANSITION.quick}
        width="100%"
      >
        <XStack alignItems="center" flex={1} gap="$2" minWidth={0}>
          <SettingsSelectTriggerContent
            label={label}
            leadingIcon={leadingIcon}
            placeholder={placeholder}
            selectedOption={selectedOption}
            textColor={triggerTextColor}
          />
        </XStack>

        <Select.Icon>
          <IconChevronDown color={iconColor} size={16} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Adapt platform="touch" when={true}>
        <Sheet
          dismissOnOverlayPress
          dismissOnSnapToBottom
          modal
          moveOnKeyboardChange
          native
          snapPoints={[SHEET_SNAP_POINTS.selectSimple]}
          snapPointsMode="percent"
        >
          <Sheet.Overlay backgroundColor={sheetOverlayColor} />

          <Sheet.Frame
            backgroundColor={sheetFrameBackgroundColor}
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            paddingBottom={16}
            paddingTop={10}
          >
            <Sheet.Handle backgroundColor={sheetHandleColor} marginBottom={10} />

            <Sheet.ScrollView
              automaticallyAdjustKeyboardInsets
              backgroundColor={sheetFrameBackgroundColor}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardDismissMode="interactive"
            >
              <Select.Adapt.Contents />
            </Sheet.ScrollView>
          </Sheet.Frame>
        </Sheet>
      </Select.Adapt>

      <Select.Content>
        <Select.Viewport
          backgroundColor={optionBackgroundColor}
          borderColor={triggerBorderColor}
          borderRadius={12}
          borderWidth={1}
          minWidth={220}
          overflow="hidden"
        >
          <Select.Group>
            {options.map((option, index) => (
              <Select.Item
                backgroundColor={optionBackgroundColor}
                borderBottomColor={optionBorderColor}
                borderBottomWidth={index < options.length - 1 ? 1 : 0}
                hoverStyle={{ backgroundColor: optionHoverBackgroundColor }}
                index={index}
                key={option.value}
                pressStyle={{
                  backgroundColor: optionPressBackgroundColor,
                  transition: TAMAGUI_TRANSITION.quick,
                }}
                transition={TAMAGUI_TRANSITION.quick}
                value={option.value}
              >
                <XStack alignItems="center" flex={1} gap="$2" minWidth={0}>
                  {getOptionLeadingVisual(option) ? (
                    <View style={styles.leftSectionSlot}>{getOptionLeadingVisual(option)}</View>
                  ) : null}

                  <Select.ItemText color={triggerTextColor} fontSize={14} fontWeight="500">
                    {option.label}
                  </Select.ItemText>

                  {option.rightSection ? (
                    <View style={styles.rightSectionSlot}>{option.rightSection}</View>
                  ) : null}
                </XStack>

                <Select.ItemIndicator marginLeft="auto">
                  <IconCheck color={triggerTextColor} size={14} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Viewport>
      </Select.Content>
    </Select>
  );
}

const styles = StyleSheet.create({
  checkSpacer: {
    width: 14,
  },
  emptyText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  leftSectionSlot: {
    alignItems: "center",
    flexShrink: 0,
    justifyContent: "center",
    minWidth: 20,
  },
  listContent: {
    paddingBottom: 24,
  },
  optionLabel: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  optionRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    minHeight: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rightSectionSlot: {
    alignItems: "center",
    flexShrink: 0,
    justifyContent: "center",
    minWidth: 20,
  },
  searchList: {
    flex: 1,
  },
  trigger: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    minHeight: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 12,
  },
  triggerContent: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
  },
  triggerLabel: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
});
