import { IconChevronDown, IconX } from "@tabler/icons-react-native";
import type { ReactNode } from "react";
import { useState } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { ActionIcon } from "../ActionIcon";
import { joinClassNames } from "../joinClassNames";
import { Text } from "../Text";
import { usePressSqueeze } from "../usePressSqueeze";
import {
  SELECT_TRIGGER_TRAILING_ICON_SIZE,
  SELECT_TRIGGER_TRAILING_SLOT_SIZE_PX,
} from "./selectTriggerUtils";
import type { SelectTriggerVariant } from "./types";

export type SelectTriggerProps = {
  accessibilityHint?: string;
  accessibilityLabel: string;
  className?: string;
  clearAccessibilityLabel?: string;
  disabled?: boolean;
  displayLabel: string;
  leadingVisual?: ReactNode;
  onClear?: () => void;
  onPress: () => void;
  rightSection?: ReactNode;
  showClear: boolean;
  showValueStyle: boolean;
  triggerStyle?: StyleProp<ViewStyle>;
  triggerVariant?: SelectTriggerVariant;
};

export function SelectTrigger({
  accessibilityHint,
  accessibilityLabel,
  className,
  clearAccessibilityLabel,
  disabled = false,
  displayLabel,
  leadingVisual,
  onClear,
  onPress,
  rightSection,
  showClear,
  showValueStyle,
  triggerStyle,
  triggerVariant = "input",
}: SelectTriggerProps) {
  const colors = useMobileThemeColors();
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");
  const [isPressed, setIsPressed] = useState(false);

  const isFilter = triggerVariant === "filter";
  const borderColor = isFilter && showValueStyle ? colors.primary : colors.borderStrong;
  const backgroundColor = isFilter ? colors.surfaceMuted : colors.inputBackground;
  const showClearButton = showClear && onClear && clearAccessibilityLabel;

  return (
    <Animated.View className={joinClassNames("w-full", className)} style={squeezeStyle}>
      <View
        className="min-h-[44px] w-full flex-row items-center gap-1 rounded-[10px] border px-3"
        style={[
          {
            backgroundColor: isPressed && !disabled ? colors.surfacePressed : backgroundColor,
            borderColor,
            opacity: disabled ? 0.5 : 1,
          },
          triggerStyle,
        ]}
      >
        <Pressable
          accessibilityHint={accessibilityHint}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          className="min-h-[44px] min-w-0 flex-1 flex-row items-center gap-2"
          disabled={disabled}
          onPress={onPress}
          onPressIn={() => {
            if (!disabled) {
              setIsPressed(true);
              pressIn();
            }
          }}
          onPressOut={() => {
            setIsPressed(false);
            pressOut();
          }}
        >
          {showValueStyle && leadingVisual ? (
            <View className="min-w-5 items-center justify-center">{leadingVisual}</View>
          ) : null}
          <Text
            c={showValueStyle ? undefined : "secondary"}
            className="min-w-0 flex-1"
            fw={500}
            numberOfLines={1}
          >
            {displayLabel}
          </Text>
          {showValueStyle && rightSection ? (
            <View className="min-w-5 items-center justify-center">{rightSection}</View>
          ) : null}
        </Pressable>
        <View
          className="items-center justify-center"
          style={{
            height: SELECT_TRIGGER_TRAILING_SLOT_SIZE_PX,
            width: SELECT_TRIGGER_TRAILING_SLOT_SIZE_PX,
          }}
        >
          {showClearButton ? (
            <ActionIcon accessibilityLabel={clearAccessibilityLabel} onPress={onClear} size="sm">
              <IconX color={colors.iconSecondary} size={SELECT_TRIGGER_TRAILING_ICON_SIZE} />
            </ActionIcon>
          ) : (
            <IconChevronDown
              color={colors.iconSecondary}
              size={SELECT_TRIGGER_TRAILING_ICON_SIZE}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}
