import { IconCheck, IconChevronDown } from "@tabler/icons-react-native";
import { Select } from "@tamagui/select";
import { Sheet } from "@tamagui/sheet";
import { XStack } from "@tamagui/stacks";
import { useMemo, useState, type ReactNode } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SHEET_SNAP_POINTS } from "../../../lib/config";
import { TAMAGUI_TRANSITION } from "../../../theme/animations";
import { SearchActionSheet } from "../../../components/SearchActionSheet";
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
  label: string;
  value: TValue;
  placeholder?: string;
  options: Array<SettingsSelectOption<TValue>>;
  onValueChange: (value: TValue) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptySearchLabel?: string;
  /** Overrides `label` for screen readers when the visible label differs. */
  accessibilityLabel?: string;
  /** Always shown in the trigger before the selected value. */
  leadingIcon?: ReactNode;
  triggerStyle?: StyleProp<ViewStyle>;
}

function getOptionLeadingVisual<TValue extends string>(option: SettingsSelectOption<TValue>): ReactNode {
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

      <Text style={[styles.optionLabel, { color: textColor }]} numberOfLines={2}>
        {option.label}
      </Text>

      {option.rightSection ? <View style={styles.rightSectionSlot}>{option.rightSection}</View> : null}

      {isSelected ? (
        <IconCheck size={14} color={textColor} />
      ) : (
        <View style={styles.checkSpacer} />
      )}
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
  const leadingVisual = leadingIcon ?? (selectedOption ? getOptionLeadingVisual(selectedOption) : null);

  return (
    <>
      {leadingVisual ? <View style={styles.leftSectionSlot}>{leadingVisual}</View> : null}
      <Text style={[styles.triggerLabel, { color: textColor }]} numberOfLines={1}>
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
        option={item}
        isSelected={item.value === value}
        textColor={triggerTextColor}
        borderColor={optionBorderColor}
        backgroundColor={optionBackgroundColor}
        pressedBackgroundColor={optionPressBackgroundColor}
        onPress={() => handleSelect(item.value)}
      />
    );

    return (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={triggerAccessibilityLabel}
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
              selectedOption={selectedOption}
              placeholder={placeholder}
              label={label}
              textColor={triggerTextColor}
              leadingIcon={leadingIcon}
            />
          </View>
          <IconChevronDown size={16} color={iconColor} />
        </Pressable>

        <SearchActionSheet
          open={open}
          onOpenChange={handleOpenChange}
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder={searchPlaceholder ?? label}
          elevated
        >
          <FlatList
            style={styles.searchList}
            data={filteredOptions}
            keyExtractor={(item) => item.value}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            initialNumToRender={24}
            maxToRenderPerBatch={24}
            windowSize={8}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {emptySearchLabel}
              </Text>
            }
          />
        </SearchActionSheet>
      </>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as TValue)}
      renderValue={(selectedValue) => optionLabelMap[selectedValue] ?? placeholder ?? ""}
    >
      <Select.Trigger
        width="100%"
        minHeight={MOBILE_LAYOUT.touchTarget}
        borderRadius={MOBILE_LAYOUT.borderRadius.control}
        borderWidth={1}
        borderColor={triggerBorderColor}
        backgroundColor={triggerBackgroundColor}
        justifyContent="space-between"
        transition={TAMAGUI_TRANSITION.quick}
        hoverStyle={{ backgroundColor: triggerBackgroundColor, borderColor: triggerBorderColor }}
        focusStyle={{ backgroundColor: triggerBackgroundColor, borderColor: triggerBorderColor }}
        pressStyle={{
          backgroundColor: triggerBackgroundColor,
          borderColor: triggerBorderColor,
          transition: TAMAGUI_TRANSITION.quick,
        }}
      >
        <XStack alignItems="center" flex={1} minWidth={0} gap="$2">
          <SettingsSelectTriggerContent
            selectedOption={selectedOption}
            placeholder={placeholder}
            label={label}
            textColor={triggerTextColor}
            leadingIcon={leadingIcon}
          />
        </XStack>

        <Select.Icon>
          <IconChevronDown size={16} color={iconColor} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Adapt when={true} platform="touch">
        <Sheet
          native
          modal
          snapPoints={[SHEET_SNAP_POINTS.selectSimple]}
          snapPointsMode="percent"
          moveOnKeyboardChange
          dismissOnSnapToBottom
          dismissOnOverlayPress
        >
          <Sheet.Overlay backgroundColor={sheetOverlayColor} />

          <Sheet.Frame
            backgroundColor={sheetFrameBackgroundColor}
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            paddingTop={10}
            paddingBottom={16}
          >
            <Sheet.Handle backgroundColor={sheetHandleColor} marginBottom={10} />

            <Sheet.ScrollView
              backgroundColor={sheetFrameBackgroundColor}
              contentContainerStyle={{ paddingBottom: 20 }}
              automaticallyAdjustKeyboardInsets
              keyboardDismissMode="interactive"
            >
              <Select.Adapt.Contents />
            </Sheet.ScrollView>
          </Sheet.Frame>
        </Sheet>
      </Select.Adapt>

      <Select.Content>
        <Select.Viewport
          minWidth={220}
          borderRadius={12}
          borderWidth={1}
          borderColor={triggerBorderColor}
          backgroundColor={optionBackgroundColor}
          overflow="hidden"
        >
          <Select.Group>
            {options.map((option, index) => (
              <Select.Item
                index={index}
                key={option.value}
                value={option.value}
                backgroundColor={optionBackgroundColor}
                borderBottomWidth={index < options.length - 1 ? 1 : 0}
                borderBottomColor={optionBorderColor}
                transition={TAMAGUI_TRANSITION.quick}
                hoverStyle={{ backgroundColor: optionHoverBackgroundColor }}
                pressStyle={{
                  backgroundColor: optionPressBackgroundColor,
                  transition: TAMAGUI_TRANSITION.quick,
                }}
              >
                <XStack alignItems="center" flex={1} minWidth={0} gap="$2">
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
                  <IconCheck size={14} color={triggerTextColor} />
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
  trigger: {
    minHeight: MOBILE_LAYOUT.touchTarget,
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  triggerContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  triggerLabel: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  leftSectionSlot: {
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 20,
  },
  rightSectionSlot: {
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 20,
  },
  searchList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  optionRow: {
    minHeight: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  checkSpacer: {
    width: 14,
  },
  emptyText: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
  },
});
