import { IconCheck } from "@tabler/icons-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { Text } from "../Text";
import { usePressSqueeze } from "../usePressSqueeze";
import { resolveOptionLeftSection } from "./resolveOptionLeftSection";
import type { SelectDataItem, SelectOptionMode } from "./types";

export type SelectOptionRowProps<TValue extends string> = {
  disabled?: boolean;
  isSelected: boolean;
  mode?: SelectOptionMode;
  onPress: () => void;
  option: SelectDataItem<TValue>;
};

export function SelectOptionRow<TValue extends string>({
  disabled = false,
  isSelected,
  mode = "single",
  onPress,
  option,
}: SelectOptionRowProps<TValue>) {
  const colors = useMobileThemeColors();
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");
  const [isPressed, setIsPressed] = useState(false);
  const leadingVisual = resolveOptionLeftSection(option);
  const accessibilityRole = mode === "single" ? "radio" : "checkbox";
  const accessibilityState =
    mode === "single" ? { disabled, selected: isSelected } : { checked: isSelected, disabled };

  return (
    <Animated.View style={squeezeStyle}>
      <Pressable
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        className="min-h-[44px] flex-row items-center gap-2 px-4 py-2.5"
        data-pressed={isPressed ? "true" : undefined}
        data-selected={isSelected ? "true" : undefined}
        disabled={disabled || option.disabled}
        onPress={onPress}
        onPressIn={() => {
          setIsPressed(true);
          pressIn();
        }}
        onPressOut={() => {
          setIsPressed(false);
          pressOut();
        }}
        style={({ pressed }) => ({
          backgroundColor: pressed && !disabled ? colors.surfacePressed : colors.surface,
          borderBottomColor: colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
          opacity: disabled || option.disabled ? 0.5 : 1,
        })}
      >
        {leadingVisual ? (
          <View className="min-w-5 items-center justify-center">{leadingVisual}</View>
        ) : null}
        <Text className="flex-1" fw={500} numberOfLines={2}>
          {option.label}
        </Text>
        {option.rightSection ? (
          <View className="min-w-5 items-center justify-center">{option.rightSection}</View>
        ) : null}
        {isSelected ? <IconCheck color={colors.primary} size={14} /> : <View className="w-3.5" />}
      </Pressable>
    </Animated.View>
  );
}
