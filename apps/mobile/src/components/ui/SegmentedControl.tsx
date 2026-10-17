import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { InputWrapper } from "./InputWrapper";
import { joinClassNames } from "./joinClassNames";
import { Text } from "./Text";
import { usePressSqueeze } from "./usePressSqueeze";

export type SegmentedControlItem<TValue extends string = string> = {
  label: string;
  leftSection?: ReactNode;
  value: TValue;
};

export type SegmentedControlProps<TValue extends string> = {
  className?: string;
  data: Array<SegmentedControlItem<TValue>>;
  description?: string;
  errorMessage?: string;
  label?: string;
  onChange: (value: TValue) => void;
  statusMessage?: string;
  value: TValue;
};

function Segment<TValue extends string>({
  isSelected,
  item,
  onPress,
}: {
  isSelected: boolean;
  item: SegmentedControlItem<TValue>;
  onPress: () => void;
}) {
  const colors = useMobileThemeColors();
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Animated.View className="min-w-0 flex-1" style={squeezeStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        className="min-h-[44px] items-center justify-center gap-0.5 rounded-lg px-1 py-1.5"
        data-pressed={isPressed ? "true" : undefined}
        data-selected={isSelected ? "true" : undefined}
        onPress={onPress}
        onPressIn={() => {
          setIsPressed(true);
          pressIn();
        }}
        onPressOut={() => {
          setIsPressed(false);
          pressOut();
        }}
        style={{
          backgroundColor: isSelected ? colors.selectionBackground : "transparent",
        }}
      >
        {item.leftSection}
        <Text
          c={isSelected ? "primary" : "secondary"}
          fw={isSelected ? 600 : 500}
          numberOfLines={1}
          size="xs"
          ta="center"
        >
          {item.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function SegmentedControl<TValue extends string>({
  className,
  data,
  description,
  errorMessage,
  label,
  onChange,
  statusMessage,
  value,
}: SegmentedControlProps<TValue>) {
  const colors = useMobileThemeColors();

  return (
    <InputWrapper
      description={description}
      errorMessage={errorMessage}
      label={label}
      statusMessage={statusMessage}
    >
      <View
        className={joinClassNames("flex-row gap-1 rounded-[10px] border p-1", className)}
        style={{ backgroundColor: colors.surface, borderColor: colors.borderStrong }}
      >
        {data.map((item) => (
          <Segment
            isSelected={item.value === value}
            item={item}
            key={item.value}
            onPress={() => {
              if (item.value !== value) {
                onChange(item.value);
              }
            }}
          />
        ))}
      </View>
    </InputWrapper>
  );
}
